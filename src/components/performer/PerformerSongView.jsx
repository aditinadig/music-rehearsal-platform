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
  if (change.old_value) return `${change.old_value} → ${change.new_value}`
  return change.new_value
}

function ChevronDown({ className = '' }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  )
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
  const [collapsedSections, setCollapsedSections] = useState(new Set())
  const [fontSize, setFontSize] = useState('base')
  const [confirmingId, setConfirmingId] = useState(null)
  const [justConfirmedId, setJustConfirmedId] = useState(null)
  const [showHistory, setShowHistory] = useState(false)
  const [updatesCollapsed, setUpdatesCollapsed] = useState(false)
  const [yourSectionsCollapsed, setYourSectionsCollapsed] = useState(false)
  const [groupMembers, setGroupMembers] = useState([])

  // Phase 7: display modes
  const [stageMode, setStageMode] = useState(false)
  const [darkDisplay, setDarkDisplay] = useState(false)

  useEffect(() => { init() }, [])

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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'acknowledgments', filter: `user_id=eq.${user.id}` },
        async payload => {
          const ackId = payload.new?.ack_id || payload.old?.ack_id
          await refreshPerformerUpdates(ackId)
        })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [user?.id, selectedSong?.song_id])

  useEffect(() => {
    if (!user?.id) return
    const intervalId = window.setInterval(() => { refreshPerformerUpdates() }, 2000)
    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') refreshPerformerUpdates()
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
      .from('group_members').select('group_id').eq('user_id', user.id).single()
    if (!membership) { setLoading(false); return }

    const [{ data: songData }, { data: memberData }] = await Promise.all([
      supabase.from('songs').select('*').eq('group_id', membership.group_id).order('created_at', { ascending: true }),
      supabase.from('group_members').select('users(name)').eq('group_id', membership.group_id),
    ])

    if (songData?.length) { setSongs(songData); setSelectedSong(songData[0]) }
    setGroupMembers(memberData || [])
    await fetchPendingAcks()
    setLoading(false)
  }

  async function fetchSongData(songId) {
    const { data: lineData } = await supabase
      .from('lines').select('*').eq('song_id', songId).order('line_number', { ascending: true })
    if (!lineData) return
    setLines(lineData)
    const lineIds = lineData.map(l => l.line_id)
    const [{ data: assignData }, { data: cueData }, { data: noteData }] = await Promise.all([
      supabase.from('assignments').select('line_id').eq('user_id', user.id).in('line_id', lineIds),
      supabase.from('cues').select('line_id, cue_text').eq('user_id', user.id).in('line_id', lineIds),
      supabase.from('word_notes').select('line_id, word_index, note_text').in('line_id', lineIds),
    ])
    setAssignedLineIds(new Set((assignData || []).map(a => a.line_id)))
    setCueMap(Object.fromEntries((cueData || []).map(c => [c.line_id, c.cue_text])))
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
      .select(`ack_id, confirmed, change_log ( change_id, change_type, old_value, new_value, changed_at, line_id, lines ( lyric_text, section_label, song_id ) )`)
      .eq('user_id', user.id).eq('confirmed', false).order('ack_id', { ascending: false })
    setPendingAcks(data || [])
    return data || []
  }

  async function fetchRecentUpdates(songId) {
    const { data } = await supabase
      .from('acknowledgments')
      .select(`ack_id, confirmed, confirmed_at, change_log ( change_id, change_type, old_value, new_value, changed_at, line_id, lines ( lyric_text, section_label, song_id ) )`)
      .eq('user_id', user.id).order('confirmed_at', { ascending: false, nullsFirst: false }).limit(8)
    setRecentUpdates((data || []).filter(ack => ack.change_log?.lines?.song_id === songId))
  }

  async function fetchAckById(ackId) {
    const { data } = await supabase
      .from('acknowledgments')
      .select(`ack_id, confirmed, confirmed_at, change_log ( change_id, change_type, old_value, new_value, changed_at, line_id, lines ( lyric_text, section_label, song_id ) )`)
      .eq('ack_id', ackId).single()
    return data || null
  }

  async function refreshPerformerUpdates(ackId = null) {
    const ack = ackId ? await fetchAckById(ackId) : null
    const changedSongId = ack?.change_log?.lines?.song_id
    const changedLineId = ack?.change_log?.line_id
    await fetchPendingAcks()
    if (selectedSong?.song_id) await fetchRecentUpdates(selectedSong.song_id)
    const shouldRefreshSong = selectedSong?.song_id &&
      (changedSongId === selectedSong.song_id || lines.some(l => l.line_id === changedLineId))
    if (shouldRefreshSong) await fetchSongData(selectedSong.song_id)
  }

  async function confirmAck(ackId) {
    setConfirmingId(ackId)
    await supabase.from('acknowledgments')
      .update({ confirmed: true, confirmed_at: new Date().toISOString() }).eq('ack_id', ackId)
    setConfirmingId(null)
    setJustConfirmedId(ackId)
    setTimeout(async () => {
      setJustConfirmedId(null)
      await fetchPendingAcks()
      if (selectedSong) await fetchRecentUpdates(selectedSong.song_id)
    }, 1500)
  }

  async function confirmAllAcks() {
    const ids = pendingAcks.map(a => a.ack_id)
    if (!ids.length) return
    await supabase.from('acknowledgments')
      .update({ confirmed: true, confirmed_at: new Date().toISOString() }).in('ack_id', ids)
    await fetchPendingAcks()
    if (selectedSong) await fetchRecentUpdates(selectedSong.song_id)
  }

  function toggleSection(label) {
    setCollapsedSections(prev => {
      const next = new Set(prev)
      next.has(label) ? next.delete(label) : next.add(label)
      return next
    })
  }

  function scrollToLine(lineId) {
    const line = lines.find(l => l.line_id === lineId)
    if (!line) return
    const sectionLabel = line.section_label || 'General'
    setCollapsedSections(prev => { const next = new Set(prev); next.delete(sectionLabel); return next })
    setTimeout(() => {
      document.getElementById(`line-${lineId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 60)
  }

  function scrollToSection(label) {
    setCollapsedSections(prev => { const next = new Set(prev); next.delete(label); return next })
    setTimeout(() => {
      document.getElementById(`section-${label.replace(/\s+/g, '-').toLowerCase()}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 60)
  }

  const sections = lines.reduce((acc, line) => {
    const s = line.section_label || 'General'
    if (!acc[s]) acc[s] = []
    acc[s].push(line)
    return acc
  }, {})

  const mySections = [...new Set(
    lines.filter(l => assignedLineIds.has(l.line_id)).map(l => l.section_label || 'General')
  )]

  // Stage mode enforces minimum 'base' font size
  const effectiveFontSize = stageMode && fontSize === 'sm' ? 'base' : fontSize
  const fontSizeClass = { sm: 'text-sm', base: 'text-base', lg: 'text-lg' }[effectiveFontSize]
  // Notes are one size larger than the lyrics beneath them
  const notesSizeClass = { sm: 'text-base', base: 'text-lg', lg: 'text-xl' }[effectiveFontSize]

  const memberNames = groupMembers.map(m => m.users?.name).filter(Boolean).join(', ')
  const hasUpdates = pendingAcks.length > 0 || recentUpdates.length > 0

  // Dark display theme tokens
  const dk = darkDisplay
  const card = dk ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
  const cardBorder = dk ? 'border-gray-700' : 'border-gray-100'
  const headingText = dk ? 'text-gray-100' : 'text-gray-900'
  const subText = dk ? 'text-gray-400' : 'text-gray-500'
  const mutedText = dk ? 'text-gray-500' : 'text-gray-400'
  const sectionHover = dk ? 'hover:bg-gray-800' : 'hover:bg-gray-50'
  const assignedLineBg = dk ? 'bg-blue-900/40' : 'bg-blue-50'
  const assignedLineText = dk ? 'text-blue-300 font-medium' : 'text-blue-900 font-medium'
  const unassignedLineText = dk ? 'text-gray-600' : 'text-gray-500'
  const cueBg = dk ? 'bg-amber-900/30 border-amber-800' : 'bg-amber-50 border-amber-100'
  const cueText = dk ? 'text-amber-400' : 'text-amber-800'

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (songs.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
        <p className="text-sm text-gray-400">No songs in your group yet. Check back once your manager adds some.</p>
      </div>
    )
  }

  return (
    <div className={`space-y-3 transition-colors duration-200 ${dk ? 'bg-gray-950 p-3 sm:p-4 rounded-3xl' : ''}`}>

      {/* Song title + performers */}
      {!stageMode && (
        <div className="px-1 pb-1">
          {songs.length > 1 ? (
            <select
              value={selectedSong?.song_id || ''}
              onChange={e => setSelectedSong(songs.find(s => s.song_id === e.target.value))}
              className={`text-xl font-bold bg-transparent border-none outline-none cursor-pointer w-full ${headingText}`}
            >
              {songs.map(s => <option key={s.song_id} value={s.song_id}>{s.title}</option>)}
            </select>
          ) : (
            <h1 className={`text-xl font-bold ${headingText}`}>{selectedSong?.title}</h1>
          )}
          {memberNames && <p className={`text-xs mt-0.5 ${mutedText}`}>{memberNames}</p>}
        </div>
      )}

      {/* Stage mode header — song title + exit button */}
      {stageMode && (
        <div className={`flex items-center justify-between px-1`}>
          <h1 className={`text-xl font-bold ${headingText}`}>{selectedSong?.title}</h1>
          <button
            onClick={() => setStageMode(false)}
            className="text-xs font-medium px-3 py-1.5 rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600 transition"
          >
            Exit Stage
          </button>
        </div>
      )}

      {/* Updates card — hidden in stage mode */}
      {hasUpdates && !stageMode && (
        <div className={`rounded-2xl border overflow-hidden ${card}`}>
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2">
              <span className={`text-sm font-semibold ${headingText}`}>Updates</span>
              {pendingAcks.length > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                  {pendingAcks.length}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {!showHistory && pendingAcks.length > 1 && (
                <button onClick={confirmAllAcks} className="text-xs font-medium text-white bg-green-500 hover:bg-green-600 px-3 py-1 rounded-lg transition">
                  Confirm All
                </button>
              )}
              <button onClick={() => setUpdatesCollapsed(v => !v)} className={`${mutedText} hover:text-gray-600 transition`}>
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${updatesCollapsed ? '' : 'rotate-180'}`} />
              </button>
            </div>
          </div>

          {!updatesCollapsed && (
            <>
              <div className="px-4 pb-2">
                <button onClick={() => setShowHistory(v => !v)} className="text-xs text-blue-500 hover:underline">
                  {showHistory ? 'Show Updates' : 'Recently Confirmed Updates'}
                </button>
              </div>

              {!showHistory && (
                <div className={`border-t ${cardBorder}`}>
                  {pendingAcks.length === 0 ? (
                    <p className={`text-xs px-4 py-3 ${mutedText}`}>No pending updates.</p>
                  ) : (
                    pendingAcks.map(ack => {
                      const change = ack.change_log
                      const isJustConfirmed = justConfirmedId === ack.ack_id
                      const displayText = renderChangeSummary(change) || CHANGE_LABELS[change?.change_type] || change?.change_type
                      return (
                        <div key={ack.ack_id} className={`flex items-center gap-3 px-4 py-3 border-b ${cardBorder} last:border-b-0 transition-colors duration-300 ${isJustConfirmed ? 'bg-green-50' : ''}`}>
                          <div className={`w-1 self-stretch rounded-full shrink-0 ${isJustConfirmed ? 'bg-green-400' : 'bg-red-400'}`} />
                          <p className={`flex-1 min-w-0 text-sm truncate ${dk ? 'text-gray-200' : 'text-gray-800'}`}>{displayText}</p>
                          <div className="flex items-center gap-1 shrink-0">
                            <button onClick={() => scrollToLine(change?.line_id)} className={`${mutedText} hover:text-gray-600 p-1 rounded transition`} title="Jump to line">
                              <SearchIcon />
                            </button>
                            {isJustConfirmed ? (
                              <span className="text-xs font-semibold text-green-600 bg-green-100 px-2.5 py-1 rounded-lg">Confirmed!</span>
                            ) : (
                              <button
                                onClick={() => confirmAck(ack.ack_id)}
                                disabled={confirmingId === ack.ack_id}
                                className={`text-xs font-medium border px-2.5 py-1 rounded-lg transition disabled:opacity-40 ${dk ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                              >
                                {confirmingId === ack.ack_id ? '...' : 'Confirm'}
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              )}

              {showHistory && (
                <div className={`border-t ${cardBorder}`}>
                  {recentUpdates.length === 0 ? (
                    <p className={`text-xs px-4 py-3 ${mutedText}`}>No confirmed updates yet.</p>
                  ) : (
                    recentUpdates.map(ack => {
                      const change = ack.change_log
                      const displayText = renderChangeSummary(change) || CHANGE_LABELS[change?.change_type] || change?.change_type
                      return (
                        <div key={ack.ack_id} className={`flex items-center gap-3 px-4 py-3 border-b ${cardBorder} last:border-b-0`}>
                          <div className="w-1 self-stretch bg-blue-300 rounded-full shrink-0" />
                          <p className={`flex-1 min-w-0 text-sm truncate ${dk ? 'text-gray-300' : 'text-gray-700'}`}>{displayText}</p>
                          <button onClick={() => scrollToLine(change?.line_id)} className={`${mutedText} hover:text-gray-600 p-1 rounded transition`} title="Jump to line">
                            <SearchIcon />
                          </button>
                        </div>
                      )
                    })
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Your Sections card — hidden in stage mode */}
      {mySections.length > 0 && !stageMode && (
        <div className={`rounded-2xl border overflow-hidden ${card}`}>
          <button onClick={() => setYourSectionsCollapsed(v => !v)} className="w-full flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2">
              <span className={`text-sm font-semibold ${headingText}`}>Your Sections</span>
              <span className="bg-blue-100 text-blue-700 text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                {mySections.length}
              </span>
            </div>
            <ChevronDown className={`w-4 h-4 ${mutedText} transition-transform duration-200 ${yourSectionsCollapsed ? '' : 'rotate-180'}`} />
          </button>
          {!yourSectionsCollapsed && (
            <div className={`border-t ${cardBorder} px-4 py-3 space-y-2`}>
              {mySections.map(section => {
                const count = lines.filter(l => (l.section_label || 'General') === section && assignedLineIds.has(l.line_id)).length
                return (
                  <button
                    key={section}
                    onClick={() => scrollToSection(section)}
                    className={`w-full text-left rounded-xl px-3 py-2 transition ${dk ? 'bg-blue-900/30 hover:bg-blue-900/50 active:bg-blue-900/70' : 'bg-blue-50 hover:bg-blue-100 active:bg-blue-200'}`}
                  >
                    <p className={`text-xs font-medium ${dk ? 'text-blue-300' : 'text-blue-800'}`}>
                      {section}
                      <span className={`font-normal ml-1 ${dk ? 'text-blue-400' : 'text-blue-600'}`}>
                        — {count} line{count !== 1 ? 's' : ''}
                      </span>
                    </p>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Controls */}
      <div className={`rounded-2xl border px-4 py-3 flex items-center gap-3 flex-wrap ${card}`}>
        <span className={`text-xs font-semibold ${subText}`}>Controls</span>

        {/* Stage mode toggle */}
        <button
          onClick={() => setStageMode(v => !v)}
          className={`text-xs font-medium px-3 py-1 rounded-lg transition ${
            stageMode
              ? 'bg-amber-500 text-white hover:bg-amber-600'
              : dk ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {stageMode ? '⚡ Stage' : 'Rehearsal'}
        </button>

        {/* Light / dark display */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setDarkDisplay(false)}
            title="Light display"
            className={`w-5 h-5 rounded-full border-2 transition bg-white ${!dk ? 'border-indigo-500' : 'border-gray-500'}`}
          />
          <button
            onClick={() => setDarkDisplay(true)}
            title="Dark display"
            className={`w-5 h-5 rounded-full border-2 transition bg-gray-900 ${dk ? 'border-indigo-400' : 'border-gray-400'}`}
          />
        </div>

        {songs.length > 1 && (
          <select
            value={selectedSong?.song_id || ''}
            onChange={e => setSelectedSong(songs.find(s => s.song_id === e.target.value))}
            className={`text-xs border rounded-lg px-2 py-1 ${dk ? 'bg-gray-800 border-gray-600 text-gray-200' : 'bg-white border-gray-200 text-gray-700'}`}
          >
            {songs.map(s => <option key={s.song_id} value={s.song_id}>{s.title}</option>)}
          </select>
        )}

        {/* Font size */}
        <div className="flex items-center gap-1 ml-auto">
          <button
            onClick={() => setFontSize(prev => prev === 'lg' ? 'base' : 'sm')}
            className={`text-xs border rounded px-2 py-0.5 transition font-medium ${dk ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
          >
            A−
          </button>
          <button
            onClick={() => setFontSize(prev => prev === 'sm' ? 'base' : 'lg')}
            className={`text-xs border rounded px-2 py-0.5 transition font-medium ${dk ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
          >
            A+
          </button>
        </div>
      </div>

      {/* Song sections */}
      {selectedSong && Object.keys(sections).length === 0 && (
        <p className={`text-sm px-1 ${mutedText}`}>This song has no lines yet.</p>
      )}

      {Object.entries(sections).map(([sectionLabel, sectionLines]) => {
        const isCollapsed = collapsedSections.has(sectionLabel)
        const hasAssignedInSection = sectionLines.some(l => assignedLineIds.has(l.line_id))

        // In stage mode, collapse sections with no assigned lines by default (still visible when expanded)
        const effectivelyCollapsed = isCollapsed || (stageMode && !hasAssignedInSection && !collapsedSections.has(`__expanded_${sectionLabel}`))

        return (
          <div
            key={sectionLabel}
            id={`section-${sectionLabel.replace(/\s+/g, '-').toLowerCase()}`}
            className={`rounded-2xl border overflow-hidden ${card} ${stageMode && !hasAssignedInSection ? 'opacity-40' : ''}`}
          >
            <button
              onClick={() => toggleSection(sectionLabel)}
              className={`w-full flex items-center gap-2 px-4 py-3 text-left transition ${sectionHover}`}
            >
              <svg
                className={`w-3 h-3 shrink-0 transition-transform duration-150 ${subText} ${effectivelyCollapsed ? '' : 'rotate-90'}`}
                fill="currentColor" viewBox="0 0 24 24"
              >
                <path d="M8 5l8 7-8 7V5z" />
              </svg>
              <span className={`text-sm font-semibold ${headingText}`}>{sectionLabel}</span>
              {stageMode && hasAssignedInSection && (
                <span className="ml-auto text-[10px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full">Your lines</span>
              )}
            </button>

            {!effectivelyCollapsed && (
              <div className={`border-t ${cardBorder}`}>
                {sectionLines.map(line => {
                  const isAssigned = assignedLineIds.has(line.line_id)
                  const cue = cueMap[line.line_id]

                  return (
                    <div
                      key={line.line_id}
                      className={stageMode && !isAssigned ? 'opacity-25' : ''}
                    >
                      {cue && (
                        <div className={`flex items-center gap-2 border-b px-4 py-1.5 ${cueBg}`}>
                          <span className={`text-xs ${dk ? 'text-amber-400' : 'text-amber-500'}`}>⚡</span>
                          <span className={`text-xs font-medium ${cueText}`}>{cue}</span>
                        </div>
                      )}
                      <div
                        id={`line-${line.line_id}`}
                        className={`px-4 py-2.5 border-b ${cardBorder} last:border-b-0 ${isAssigned ? assignedLineBg : ''}`}
                      >
                        {showNotation ? (
                          <div className="flex flex-wrap items-end gap-x-1.5 gap-y-3">
                            {line.lyric_text.split(' ').map((word, index) => {
                              const note = wordNotesMap[line.line_id]?.[index]
                              return (
                                <span key={index} className="flex flex-col items-center">
                                  <span className={`${notesSizeClass} font-mono font-semibold ${dk ? 'text-teal-400' : 'text-teal-600'} mb-0.5 ${note ? '' : 'opacity-0 select-none pointer-events-none'}`}>
                                    {note || '.'}
                                  </span>
                                  <span className={`${fontSizeClass} ${isAssigned ? assignedLineText : unassignedLineText}`}>
                                    {word}
                                  </span>
                                </span>
                              )
                            })}
                          </div>
                        ) : (
                          <p className={`${fontSizeClass} ${isAssigned ? assignedLineText : unassignedLineText}`}>
                            {line.lyric_text}
                          </p>
                        )}
                      </div>
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
