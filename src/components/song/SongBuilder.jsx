import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../supabase/client'
import { useAuth } from '../../context/AuthContext'
import LineItem from './LineItem'

const SECTIONS = ['Intro', 'Verse 1', 'Verse 2', 'Pre-Chorus', 'Chorus', 'Bridge', 'Outro']

export default function SongBuilder({ song, onLinesUpdated }) {
  const { user } = useAuth()
  const [lines, setLines] = useState([])
  const [wordNotes, setWordNotes] = useState({})
  const [sectionLabel, setSectionLabel] = useState('Verse 1')
  const [customSection, setCustomSection] = useState('')
  const [lyricBlob, setLyricBlob] = useState('')
  const [notationText, setNotationText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fetching, setFetching] = useState(true)

  // Undo state for lyric/notation edits
  const [undoState, setUndoState] = useState(null) // { lineId, oldLyric, oldNotation }
  const undoTimerRef = useRef(null)

  useEffect(() => {
    fetchLines()
    return () => { if (undoTimerRef.current) clearTimeout(undoTimerRef.current) }
  }, [song.song_id])

  async function fetchLines() {
    setFetching(true)
    const { data, error } = await supabase
      .from('lines')
      .select('*')
      .eq('song_id', song.song_id)
      .order('line_number', { ascending: true })

    if (!error && data) {
      setLines(data)
      await fetchWordNotes(data.map(l => l.line_id))
    }
    setFetching(false)
  }

  async function fetchWordNotes(lineIds) {
    if (!lineIds.length) return
    const { data } = await supabase
      .from('word_notes')
      .select('line_id, word_index, note_text')
      .in('line_id', lineIds)

    if (!data) return
    const map = {}
    for (const row of data) {
      if (!map[row.line_id]) map[row.line_id] = {}
      map[row.line_id][row.word_index] = row.note_text
    }
    setWordNotes(map)
  }

  async function fetchAssignedUsers(lineId, role = null) {
    const { data: assignmentRows, error: assignmentError } = await supabase
      .from('assignments')
      .select('user_id')
      .eq('line_id', lineId)

    if (assignmentError) throw new Error(assignmentError.message || 'Unable to load assigned users for this line.')

    const userIds = (assignmentRows || []).map(row => row.user_id)
    if (!userIds.length) return []
    if (!role) return userIds.map(userId => ({ user_id: userId }))

    const { data: filteredUsers, error: userError } = await supabase
      .from('users')
      .select('user_id')
      .in('user_id', userIds)
      .eq('role', role)

    if (userError) throw new Error(userError.message || 'Unable to filter assigned users by role.')
    return filteredUsers || []
  }

  async function handleNoteChange(lineId, wordIndex, noteText) {
    const { error: deleteError } = await supabase
      .from('word_notes')
      .delete()
      .eq('line_id', lineId)
      .eq('word_index', wordIndex)

    if (deleteError) { setError(deleteError.message || 'Unable to update this note.'); throw deleteError }

    if (noteText) {
      const { error: insertError } = await supabase.from('word_notes').insert({
        line_id: lineId,
        word_index: wordIndex,
        note_text: noteText,
        created_by: user.id
      })
      if (insertError) { setError(insertError.message || 'Unable to save this note.'); throw insertError }
    }

    setWordNotes(prev => {
      const lineNotes = { ...(prev[lineId] || {}) }
      if (noteText) lineNotes[wordIndex] = noteText
      else delete lineNotes[wordIndex]
      return { ...prev, [lineId]: lineNotes }
    })
  }

  async function handleAddSection() {
    const hasLyrics = lyricBlob.trim()
    const hasNotation = notationText.trim()
    if (!hasLyrics && !hasNotation) return
    setLoading(true)
    setError('')

    const label = sectionLabel === 'Custom' ? customSection : sectionLabel

    let rows
    if (hasLyrics) {
      const rawLines = lyricBlob.split('\n').map(l => l.trim()).filter(l => l.length > 0)
      if (rawLines.length === 0) {
        setError('No valid lines found.')
        setLoading(false)
        return
      }
      const startingLineNumber = lines.length + 1
      rows = rawLines.map((lyric, index) => ({
        song_id: song.song_id,
        section_label: label,
        line_number: startingLineNumber + index,
        lyric_text: lyric,
        notation_text: notationText || null
      }))
    } else {
      // Notation-only line (BGM / instrumental interval)
      rows = [{
        song_id: song.song_id,
        section_label: label,
        line_number: lines.length + 1,
        lyric_text: '',
        notation_text: notationText
      }]
    }

    const { data, error: insertError } = await supabase.from('lines').insert(rows).select()

    if (insertError) {
      setError(insertError.message)
      setLoading(false)
      return
    }

    setLines(prev => [...prev, ...data])
    onLinesUpdated?.()
    setLyricBlob('')
    setNotationText('')
    setLoading(false)
  }

  async function writeChangeLog(lineId, changeType, oldValue, newValue, affectedUsers) {
    const { data: changeData, error } = await supabase
      .from('change_log')
      .insert({ line_id: lineId, change_type: changeType, old_value: oldValue, new_value: newValue, changed_by: user.id })
      .select()
      .single()

    if (error || !changeData) throw new Error(error?.message || `Failed to write ${changeType} to change_log.`)

    if (affectedUsers.length > 0) {
      const { error: ackError } = await supabase.from('acknowledgments').insert(
        affectedUsers.map(u => ({ change_id: changeData.change_id, user_id: u.user_id, confirmed: false }))
      )
      if (ackError) throw new Error(ackError.message || 'Failed to create acknowledgment rows.')
    }
  }

  async function handleEditLine(line, newLyric, newNotation) {
    const updates = {}
    if (newLyric !== line.lyric_text) updates.lyric_text = newLyric
    const newNotationVal = newNotation || null
    if (newNotationVal !== line.notation_text) updates.notation_text = newNotationVal
    if (Object.keys(updates).length === 0) return

    // Capture old state for undo
    const prevLyric = line.lyric_text
    const prevNotation = line.notation_text || ''

    setError('')

    const { error: updateError } = await supabase
      .from('lines')
      .update(updates)
      .eq('line_id', line.line_id)

    if (updateError) {
      setError(updateError.message || 'Unable to update this line.')
      throw updateError
    }

    try {
      if (updates.lyric_text !== undefined) {
        const singerUsers = await fetchAssignedUsers(line.line_id, 'singer')
        await writeChangeLog(line.line_id, 'lyric_edited', line.lyric_text, newLyric, singerUsers)
      }
      if ('notation_text' in updates) {
        const musicianUsers = await fetchAssignedUsers(line.line_id, 'musician')
        await writeChangeLog(line.line_id, 'note_edited', line.notation_text, newNotationVal || 'Notes cleared', musicianUsers)
      }
    } catch (logError) {
      setError(logError.message || 'Line was updated, but change tracking failed.')
      throw logError
    }

    setLines(prev => prev.map(l => l.line_id === line.line_id ? { ...l, ...updates } : l))

    // Arm undo for 5 seconds
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current)
    setUndoState({ lineId: line.line_id, oldLyric: prevLyric, oldNotation: prevNotation })
    undoTimerRef.current = setTimeout(() => setUndoState(null), 5000)
  }

  async function handleUndoEdit() {
    if (!undoState) return
    const { lineId, oldLyric, oldNotation } = undoState
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current)
    setUndoState(null)

    await supabase.from('lines').update({
      lyric_text: oldLyric,
      notation_text: oldNotation || null
    }).eq('line_id', lineId)

    setLines(prev => prev.map(l =>
      l.line_id === lineId ? { ...l, lyric_text: oldLyric, notation_text: oldNotation || null } : l
    ))
  }

  async function handleDeleteLine(line) {
    const label = line.lyric_text?.trim() || line.notation_text || 'this instrumental line'
    if (!window.confirm(`Delete "${label}"? This cannot be undone.`)) return

    const { error: deleteError } = await supabase.from('lines').delete().eq('line_id', line.line_id)
    if (deleteError) { setError(deleteError.message); return }

    const remaining = lines.filter(l => l.line_id !== line.line_id)
    const renumbered = remaining.map((l, i) => ({ ...l, line_number: i + 1 }))

    // Re-number lines in DB for any that changed
    const toUpdate = renumbered.filter((l, i) => l.line_number !== remaining[i]?.line_number)
    await Promise.all(
      toUpdate.map(l => supabase.from('lines').update({ line_number: l.line_number }).eq('line_id', l.line_id))
    )

    setLines(renumbered)
    onLinesUpdated?.()
  }

  async function handleMoveLine(lineId, direction) {
    const sorted = [...lines].sort((a, b) => a.line_number - b.line_number)
    const idx = sorted.findIndex(l => l.line_id === lineId)
    if (idx === -1) return
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1
    if (targetIdx < 0 || targetIdx >= sorted.length) return

    const lineA = sorted[idx]
    const lineB = sorted[targetIdx]
    const numA = lineA.line_number
    const numB = lineB.line_number

    setLines(prev => prev.map(l => {
      if (l.line_id === lineA.line_id) return { ...l, line_number: numB }
      if (l.line_id === lineB.line_id) return { ...l, line_number: numA }
      return l
    }))

    await Promise.all([
      supabase.from('lines').update({ line_number: numB }).eq('line_id', lineA.line_id),
      supabase.from('lines').update({ line_number: numA }).eq('line_id', lineB.line_id),
    ])
    onLinesUpdated?.()
  }

  // Group lines by section, sorted by line_number
  const sortedLines = [...lines].sort((a, b) => a.line_number - b.line_number)
  const groupedLines = sortedLines.reduce((acc, line) => {
    const section = line.section_label || 'General'
    if (!acc[section]) acc[section] = []
    acc[section].push(line)
    return acc
  }, {})

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-orange-100 p-5">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-orange-700 mb-1">Builder</p>
          <h2 className="text-lg font-semibold text-gray-800">{song.title}</h2>
          <p className="text-sm text-gray-500 mt-1">Paste lyrics section by section</p>
        </div>
        <span className="rounded-xl bg-orange-50 border border-orange-100 px-3 py-2 text-lg shadow-sm">✍️</span>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 text-sm rounded-lg px-4 py-3 mb-4">{error}</div>
      )}

      {/* Undo toast */}
      {undoState && (
        <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4">
          <p className="text-xs text-amber-800">Line saved.</p>
          <button
            onClick={handleUndoEdit}
            className="text-xs font-semibold text-amber-700 hover:underline ml-4"
          >
            Undo
          </button>
        </div>
      )}

      {/* Add section form */}
      <div className="space-y-3 mb-6 rounded-2xl border border-gray-100 bg-gray-50 p-4">
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-600 mb-1">Section</label>
            <select
              value={sectionLabel}
              onChange={e => setSectionLabel(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
            >
              {SECTIONS.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
              <option value="Custom">Custom...</option>
            </select>
          </div>

          {sectionLabel === 'Custom' && (
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-600 mb-1">Custom Section Name</label>
              <input
                type="text"
                value={customSection}
                onChange={e => setCustomSection(e.target.value)}
                placeholder="e.g. Interlude"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
              />
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Lyrics <span className="text-gray-400">(one line per row — leave blank for a BGM / instrumental interval)</span>
          </label>
          <textarea
            value={lyricBlob}
            onChange={e => setLyricBlob(e.target.value)}
            placeholder={`e.g.\nTum hi ho\nAb tum hi ho\nZindagi ab tum hi ho`}
            rows={5}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Notation / Chords <span className="text-gray-400">(optional for lyric sections — required if no lyrics)</span>
          </label>
          <input
            type="text"
            value={notationText}
            onChange={e => setNotationText(e.target.value)}
            placeholder="e.g. C G Am F"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
          />
        </div>

        <button
          onClick={handleAddSection}
          disabled={loading || (!lyricBlob.trim() && !notationText.trim())}
          className="bg-violet-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-violet-700 transition disabled:opacity-50"
        >
          {loading ? 'Adding...' : '+ Add Section'}
        </button>
      </div>

      {/* Song display */}
      {fetching ? (
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : lines.length === 0 ? (
        <p className="text-sm text-gray-400">No lines added yet. Paste a section above to get started.</p>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedLines).map(([section, sectionLines]) => (
            <div key={section}>
              <h3 className="text-xs font-semibold text-violet-500 uppercase tracking-wide mb-2">
                {section}
              </h3>
              <div className="bg-gray-50 rounded-xl px-4 border border-gray-100">
                {sectionLines.map((line, idx) => (
                  <LineItem
                    key={line.line_id}
                    line={line}
                    lineNumber={line.line_number}
                    onSave={handleEditLine}
                    onDelete={() => handleDeleteLine(line)}
                    onMoveUp={idx > 0 || sortedLines.indexOf(line) > 0 ? () => handleMoveLine(line.line_id, 'up') : null}
                    onMoveDown={sortedLines.indexOf(line) < sortedLines.length - 1 ? () => handleMoveLine(line.line_id, 'down') : null}
                    wordNotes={wordNotes[line.line_id] || {}}
                    onNoteChange={(wordIndex, noteText) => handleNoteChange(line.line_id, wordIndex, noteText)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
