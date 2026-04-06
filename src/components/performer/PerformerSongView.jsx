import { useState, useEffect } from 'react'
import { supabase } from '../../supabase/client'
import { useAuth } from '../../context/AuthContext'

const CHANGE_LABELS = {
  assignment_changed: 'Assignment changed',
  cue_changed: 'Cue updated',
  lyric_edited: 'Lyric edited',
  notation_edited: 'Notation edited',
}

export default function PerformerSongView({ showNotation = false }) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [songs, setSongs] = useState([])
  const [selectedSong, setSelectedSong] = useState(null)
  const [lines, setLines] = useState([])
  const [assignedLineIds, setAssignedLineIds] = useState(new Set())
  const [cueMap, setCueMap] = useState({})
  const [wordNotesMap, setWordNotesMap] = useState({}) // { [lineId]: { [wordIndex]: noteText } }
  const [pendingAcks, setPendingAcks] = useState([])
  const [collapsedSections, setCollapsedSections] = useState(new Set())
  const [fontSize, setFontSize] = useState('base')
  const [confirmingId, setConfirmingId] = useState(null)

  useEffect(() => {
    init()
  }, [])

  useEffect(() => {
    if (selectedSong) fetchSongData(selectedSong.song_id)
  }, [selectedSong])

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

    const lineIds = lineData.map(l => l.line_id)

    const [{ data: assignData }, { data: cueData }, { data: noteData }] = await Promise.all([
      supabase.from('assignments').select('line_id').eq('user_id', user.id).in('line_id', lineIds),
      supabase.from('cues').select('line_id, cue_text').eq('user_id', user.id).in('line_id', lineIds),
      supabase.from('word_notes').select('line_id, word_index, note_text').in('line_id', lineIds),
    ])

    setAssignedLineIds(new Set((assignData || []).map(a => a.line_id)))
    setCueMap(Object.fromEntries((cueData || []).map(c => [c.line_id, c.cue_text])))

    const notesMap = {}
    for (const row of (noteData || [])) {
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
        change_log (
          change_id,
          change_type,
          new_value,
          changed_at,
          line_id,
          lines ( lyric_text, section_label )
        )
      `)
      .eq('user_id', user.id)
      .eq('confirmed', false)

    setPendingAcks(data || [])
  }

  async function confirmAck(ackId) {
    setConfirmingId(ackId)
    await supabase
      .from('acknowledgments')
      .update({ confirmed: true, confirmed_at: new Date().toISOString() })
      .eq('ack_id', ackId)
    setPendingAcks(prev => prev.filter(a => a.ack_id !== ackId))
    setConfirmingId(null)
  }

  function toggleSection(label) {
    setCollapsedSections(prev => {
      const next = new Set(prev)
      next.has(label) ? next.delete(label) : next.add(label)
      return next
    })
  }

  const sections = lines.reduce((acc, line) => {
    const s = line.section_label || 'General'
    if (!acc[s]) acc[s] = []
    acc[s].push(line)
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

      {/* Pending acknowledgments */}
      {pendingAcks.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-amber-800 mb-3">
            {pendingAcks.length} update{pendingAcks.length > 1 ? 's' : ''} need your acknowledgment
          </h2>
          <div className="space-y-2">
            {pendingAcks.map(ack => {
              const cl = ack.change_log
              return (
                <div key={ack.ack_id} className="bg-white rounded-xl px-4 py-3 flex items-start justify-between gap-4 shadow-sm">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-amber-600 mb-0.5">
                      {CHANGE_LABELS[cl?.change_type] || cl?.change_type}
                    </p>
                    <p className="text-sm text-gray-700 truncate">"{cl?.lines?.lyric_text}"</p>
                    {cl?.new_value && (
                      <p className="text-xs text-gray-500 mt-0.5">{cl.new_value}</p>
                    )}
                  </div>
                  <button
                    onClick={() => confirmAck(ack.ack_id)}
                    disabled={confirmingId === ack.ack_id}
                    className="shrink-0 bg-amber-500 text-white text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-amber-600 transition disabled:opacity-50"
                  >
                    {confirmingId === ack.ack_id ? 'Saving...' : 'Got it'}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Song picker + font size controls */}
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

        {/* Font size toggle */}
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

      {/* Lines by section */}
      {selectedSong && Object.keys(sections).length === 0 && (
        <p className="text-sm text-gray-400">This song has no lines yet.</p>
      )}

      {Object.entries(sections).map(([sectionLabel, sectionLines]) => {
        const isCollapsed = collapsedSections.has(sectionLabel)
        const hasMyLines = sectionLines.some(l => assignedLineIds.has(l.line_id))

        return (
          <div key={sectionLabel} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            {/* Section header */}
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
              <span className="text-gray-400 text-xs">{isCollapsed ? '▸' : '▾'}</span>
            </button>

            {/* Lines */}
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
                        /* Musician: word-by-word with notes above */
                        <div className="flex flex-wrap items-end gap-x-1.5 gap-y-3">
                          {line.lyric_text.split(' ').map((word, i) => {
                            const note = wordNotesMap[line.line_id]?.[i]
                            return (
                              <span key={i} className="flex flex-col items-center">
                                <span className={`text-xs font-mono font-semibold text-teal-600 mb-0.5 ${note ? '' : 'opacity-0 select-none pointer-events-none'}`}>
                                  {note || '·'}
                                </span>
                                <span className={`${fontSizeClass} ${isAssigned ? 'text-indigo-900 font-semibold' : 'text-gray-700'}`}>
                                  {word}
                                </span>
                              </span>
                            )
                          })}
                        </div>
                      ) : (
                        /* Singer: plain line */
                        <p className={`${fontSizeClass} ${isAssigned ? 'text-indigo-900 font-semibold' : 'text-gray-700'}`}>
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
