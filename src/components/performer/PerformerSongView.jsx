import { useState, useEffect } from 'react'
import { supabase } from '../../supabase/client'
import { useAuth } from '../../context/AuthContext'

const CHANGE_LABELS = {
  assignment_changed: 'Assignment changed',
  cue_changed: 'Cue updated',
  lyric_edited: 'Lyric updated',
  note_edited: 'Notes updated',
}

function renderChangeSummary(change) {
  if (!change?.new_value) return null

  if (change.old_value) {
    return `${change.old_value} -> ${change.new_value}`
  }

  return change.new_value
}

export default function PerformerSongView({ showNotation = false }) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [songs, setSongs] = useState([])
  const [selectedSong, setSelectedSong] = useState(null)
  const [lines, setLines] = useState([])
  const [assignedLineIds, setAssignedLineIds] = useState(new Set())
  const [cueMap, setCueMap] = useState({})
  const [wordNotesMap, setWordNotesMap] = useState({})
  const [pendingAcks, setPendingAcks] = useState([])
  const [recentUpdates, setRecentUpdates] = useState([])
  const [liveNotifications, setLiveNotifications] = useState([])
  const [collapsedSections, setCollapsedSections] = useState(new Set())
  const [fontSize, setFontSize] = useState('base')
  const [confirmingId, setConfirmingId] = useState(null)

  useEffect(() => {
    init()
  }, [])

  useEffect(() => {
    if (selectedSong) {
      fetchSongData(selectedSong.song_id)
      fetchRecentUpdates(selectedSong.song_id)
    }
  }, [selectedSong])

  useEffect(() => {
    if (!user?.id) return

    const channel = supabase
      .channel(`performer-updates-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'acknowledgments',
          filter: `user_id=eq.${user.id}`,
        },
        async payload => {
          const ackId = payload.new?.ack_id || payload.old?.ack_id
          const changeWasConfirmed = payload.new?.confirmed === true

          await refreshPerformerUpdates(ackId, changeWasConfirmed)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id, selectedSong?.song_id])

  useEffect(() => {
    if (!user?.id) return

    const intervalId = window.setInterval(() => {
      refreshPerformerUpdates()
    }, 2000)

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        refreshPerformerUpdates()
      }
    }

    window.addEventListener('focus', refreshPerformerUpdates)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.clearInterval(intervalId)
      window.removeEventListener('focus', refreshPerformerUpdates)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [user?.id, selectedSong?.song_id])

  async function init() {
    setLoading(true)

    const { data: membership } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      setLoading(false)
      return
    }

    const { data: songData } = await supabase
      .from('songs')
      .select('*')
      .eq('group_id', membership.group_id)
      .order('created_at', { ascending: true })

    if (songData?.length) {
      setSongs(songData)
      setSelectedSong(songData[0])
    }

    await fetchPendingAcks()
    setLoading(false)
  }

  async function fetchSongData(songId) {
    const { data: lineData } = await supabase
      .from('lines')
      .select('*')
      .eq('song_id', songId)
      .order('line_number', { ascending: true })

    if (!lineData) return

    setLines(lineData)

    const lineIds = lineData.map(line => line.line_id)

    const [{ data: assignData }, { data: cueData }, { data: noteData }] = await Promise.all([
      supabase.from('assignments').select('line_id').eq('user_id', user.id).in('line_id', lineIds),
      supabase.from('cues').select('line_id, cue_text').eq('user_id', user.id).in('line_id', lineIds),
      supabase.from('word_notes').select('line_id, word_index, note_text').in('line_id', lineIds),
    ])

    setAssignedLineIds(new Set((assignData || []).map(assignment => assignment.line_id)))
    setCueMap(Object.fromEntries((cueData || []).map(cue => [cue.line_id, cue.cue_text])))

    const notesMap = {}
    for (const row of noteData || []) {
      if (!notesMap[row.line_id]) notesMap[row.line_id] = {}
      notesMap[row.line_id][row.word_index] = row.note_text
    }
    setWordNotesMap(notesMap)
  }

  async function fetchPendingAcks() {
    const { data } = await supabase
      .from('acknowledgments')
      .select(`
        ack_id,
        confirmed,
        change_log (
          change_id,
          change_type,
          old_value,
          new_value,
          changed_at,
          line_id,
          lines ( lyric_text, section_label, song_id )
        )
      `)
      .eq('user_id', user.id)
      .eq('confirmed', false)
      .order('ack_id', { ascending: false })

    setPendingAcks(data || [])
    return data || []
  }

  async function fetchRecentUpdates(songId) {
    const { data } = await supabase
      .from('acknowledgments')
      .select(`
        ack_id,
        confirmed,
        confirmed_at,
        change_log (
          change_id,
          change_type,
          old_value,
          new_value,
          changed_at,
          line_id,
          lines ( lyric_text, section_label, song_id )
        )
      `)
      .eq('user_id', user.id)
      .order('confirmed_at', { ascending: false, nullsFirst: false })
      .limit(8)

    setRecentUpdates((data || []).filter(ack => ack.change_log?.lines?.song_id === songId))
  }

  async function fetchAckById(ackId) {
    const { data } = await supabase
      .from('acknowledgments')
      .select(`
        ack_id,
        confirmed,
        confirmed_at,
        change_log (
          change_id,
          change_type,
          old_value,
          new_value,
          changed_at,
          line_id,
          lines ( lyric_text, section_label, song_id )
        )
      `)
      .eq('ack_id', ackId)
      .single()

    return data || null
  }

  async function refreshPerformerUpdates(ackId = null, changeWasConfirmed = false) {
    const ack = ackId ? await fetchAckById(ackId) : null
    const changedSongId = ack?.change_log?.lines?.song_id
    const changedLineId = ack?.change_log?.line_id

    const latestPendingAcks = await fetchPendingAcks()

    if (selectedSong?.song_id) {
      await fetchRecentUpdates(selectedSong.song_id)
    }

    const shouldRefreshSong =
      selectedSong?.song_id &&
      (
        changedSongId === selectedSong.song_id ||
        lines.some(line => line.line_id === changedLineId)
      )

    if (shouldRefreshSong) {
      await fetchSongData(selectedSong.song_id)
    }

    if (ack && !changeWasConfirmed && !ack.confirmed) {
      setLiveNotifications(prev => {
        const withoutCurrent = prev.filter(item => item.ack_id !== ack.ack_id)
        return [ack, ...withoutCurrent].slice(0, 5)
      })
    }

    if (!ack) {
      setLiveNotifications(prev => {
        const knownIds = new Set(prev.map(item => item.ack_id))
        const incoming = latestPendingAcks.filter(item => !knownIds.has(item.ack_id))
        return [...incoming, ...prev].slice(0, 5)
      })
    }

    if (changeWasConfirmed) {
      setLiveNotifications(prev => prev.filter(item => item.ack_id !== ackId))
    }
  }

  async function confirmAck(ackId) {
    setConfirmingId(ackId)
    await supabase
      .from('acknowledgments')
      .update({ confirmed: true, confirmed_at: new Date().toISOString() })
      .eq('ack_id', ackId)

    await fetchPendingAcks()
    if (selectedSong) {
      await fetchRecentUpdates(selectedSong.song_id)
    }
    setLiveNotifications(prev => prev.filter(item => item.ack_id !== ackId))
    setConfirmingId(null)
  }

  function dismissLiveNotification(ackId) {
    setLiveNotifications(prev => prev.filter(item => item.ack_id !== ackId))
  }

  function toggleSection(label) {
    setCollapsedSections(prev => {
      const next = new Set(prev)
      next.has(label) ? next.delete(label) : next.add(label)
      return next
    })
  }

  const sections = lines.reduce((acc, line) => {
    const section = line.section_label || 'General'
    if (!acc[section]) acc[section] = []
    acc[section].push(line)
    return acc
  }, {})

  const fontSizeClass = { sm: 'text-sm', base: 'text-base', lg: 'text-lg' }[fontSize]

  if (loading) {
    return <p className="text-sm text-gray-400">Loading...</p>
  }

  if (songs.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <p className="text-sm text-gray-400">No songs in your group yet. Check back once your manager adds some.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {liveNotifications.length > 0 && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-indigo-800 mb-3">
            New update{liveNotifications.length > 1 ? 's' : ''} just came in
          </h2>
          <div className="space-y-2">
            {liveNotifications.map(ack => {
              const change = ack.change_log
              return (
                <div key={ack.ack_id} className="bg-white rounded-xl px-4 py-3 flex items-start justify-between gap-4 shadow-sm border border-indigo-100">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-indigo-600 mb-0.5">
                      {CHANGE_LABELS[change?.change_type] || change?.change_type}
                    </p>
                    <p className="text-sm text-gray-700 truncate">"{change?.lines?.lyric_text}"</p>
                    {renderChangeSummary(change) && (
                      <p className="text-xs text-gray-500 mt-0.5">{renderChangeSummary(change)}</p>
                    )}
                  </div>
                  <button
                    onClick={() => dismissLiveNotification(ack.ack_id)}
                    className="shrink-0 text-xs text-indigo-500 hover:underline"
                  >
                    Dismiss
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {pendingAcks.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-amber-800 mb-3">
            Updates for you
          </h2>
          <div className="space-y-2">
            {pendingAcks.map(ack => {
              const change = ack.change_log
              return (
                <div key={ack.ack_id} className="bg-white rounded-xl px-4 py-3 flex items-start justify-between gap-4 shadow-sm">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-amber-600 mb-0.5">
                      {CHANGE_LABELS[change?.change_type] || change?.change_type}
                    </p>
                    <p className="text-sm text-gray-700 truncate">"{change?.lines?.lyric_text}"</p>
                    {renderChangeSummary(change) && (
                      <p className="text-xs text-gray-500 mt-0.5">{renderChangeSummary(change)}</p>
                    )}
                  </div>
                  <button
                    onClick={() => confirmAck(ack.ack_id)}
                    disabled={confirmingId === ack.ack_id}
                    className="shrink-0 bg-amber-500 text-white text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-amber-600 transition disabled:opacity-50"
                  >
                    {confirmingId === ack.ack_id ? 'Saving...' : 'Confirm'}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {recentUpdates.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="text-sm font-semibold text-gray-800 mb-3">Recent Updates</h2>
          <div className="space-y-2">
            {recentUpdates.map(ack => {
              const change = ack.change_log
              return (
                <div key={ack.ack_id} className="rounded-xl border border-gray-100 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-indigo-600 mb-0.5">
                        {CHANGE_LABELS[change?.change_type] || change?.change_type}
                      </p>
                      <p className="text-sm text-gray-700 truncate">"{change?.lines?.lyric_text}"</p>
                      {renderChangeSummary(change) && (
                        <p className="text-xs text-gray-500 mt-0.5">{renderChangeSummary(change)}</p>
                      )}
                    </div>
                    <span
                      className={`shrink-0 text-xs font-medium px-2 py-1 rounded-full ${
                        ack.confirmed
                          ? 'bg-green-100 text-green-600'
                          : 'bg-yellow-100 text-yellow-600'
                      }`}
                    >
                      {ack.confirmed ? 'Confirmed' : 'Pending'}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-2 flex-1 flex-wrap">
          {songs.map(song => (
            <button
              key={song.song_id}
              onClick={() => setSelectedSong(song)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                selectedSong?.song_id === song.song_id
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {song.title}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-0.5 bg-white border border-gray-200 rounded-lg p-1">
          {[
            { key: 'sm', label: 'S' },
            { key: 'base', label: 'M' },
            { key: 'lg', label: 'L' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFontSize(key)}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition ${
                fontSize === key
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'text-gray-400 hover:bg-gray-100'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {selectedSong && Object.keys(sections).length === 0 && (
        <p className="text-sm text-gray-400">This song has no lines yet.</p>
      )}

      {Object.entries(sections).map(([sectionLabel, sectionLines]) => {
        const isCollapsed = collapsedSections.has(sectionLabel)
        const hasMyLines = sectionLines.some(line => assignedLineIds.has(line.line_id))

        return (
          <div key={sectionLabel} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <button
              onClick={() => toggleSection(sectionLabel)}
              className="w-full flex items-center justify-between px-5 py-3 bg-gray-50 border-b border-gray-100 hover:bg-gray-100 transition"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {sectionLabel}
                </span>
                {hasMyLines && (
                  <span className="text-xs bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full font-medium">
                    your lines here
                  </span>
                )}
              </div>
              <span className="text-gray-400 text-xs">{isCollapsed ? 'Closed' : 'Open'}</span>
            </button>

            {!isCollapsed && (
              <div className="divide-y divide-gray-50">
                {sectionLines.map(line => {
                  const isAssigned = assignedLineIds.has(line.line_id)
                  const cue = cueMap[line.line_id]

                  return (
                    <div
                      key={line.line_id}
                      className={`px-5 py-3 ${isAssigned ? 'bg-indigo-50 border-l-4 border-indigo-400' : ''}`}
                    >
                      {showNotation ? (
                        <div className="flex flex-wrap items-end gap-x-1.5 gap-y-3">
                          {line.lyric_text.split(' ').map((word, index) => {
                            const note = wordNotesMap[line.line_id]?.[index]
                            return (
                              <span key={index} className="flex flex-col items-center">
                                <span className={`text-xs font-mono font-semibold text-teal-600 mb-0.5 ${note ? '' : 'opacity-0 select-none pointer-events-none'}`}>
                                  {note || '.'}
                                </span>
                                <span className={`${fontSizeClass} ${isAssigned ? 'text-indigo-900 font-semibold' : 'text-gray-700'}`}>
                                  {word}
                                </span>
                              </span>
                            )
                          })}
                        </div>
                      ) : (
                        <p className={`${fontSizeClass} ${isAssigned ? 'text-gray-900 font-semibold' : 'text-gray-400'}`}>
                          {line.lyric_text}
                        </p>
                      )}

                      {showNotation && line.notation_text && (
                        <p className={`${fontSizeClass} text-teal-500 mt-1 font-mono`}>
                          {line.notation_text}
                        </p>
                      )}

                      {isAssigned && cue && (
                        <p className="text-xs text-indigo-500 mt-1.5">
                          <span className="font-semibold">Cue:</span> {cue}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
