import { useState, useEffect } from 'react'
import { supabase } from '../../supabase/client'
import { useAuth } from '../../context/AuthContext'
import LineItem from './LineItem'

const SECTIONS = ['Intro', 'Verse 1', 'Verse 2', 'Pre-Chorus', 'Chorus', 'Bridge', 'Outro']

export default function SongBuilder({ song }) {
  const { user } = useAuth()
  const [lines, setLines] = useState([])
  const [sectionLabel, setSectionLabel] = useState('Verse 1')
  const [customSection, setCustomSection] = useState('')
  const [lyricBlob, setLyricBlob] = useState('')
  const [notationText, setNotationText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fetching, setFetching] = useState(true)

  useEffect(() => {
    fetchLines()
  }, [song.song_id])

  async function fetchLines() {
    setFetching(true)
    const { data, error } = await supabase
      .from('lines')
      .select('*')
      .eq('song_id', song.song_id)
      .order('line_number', { ascending: true })

    if (!error) setLines(data)
    setFetching(false)
  }

  async function handleAddSection() {
    if (!lyricBlob.trim()) return
    setLoading(true)
    setError('')

    const label = sectionLabel === 'Custom' ? customSection : sectionLabel

    // Split the blob into individual lines, remove empty lines
    const rawLines = lyricBlob
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0)

    if (rawLines.length === 0) {
      setError('No valid lines found.')
      setLoading(false)
      return
    }

    // Build insert rows, continuing line_number from where we left off
    const startingLineNumber = lines.length + 1
    const rows = rawLines.map((lyric, index) => ({
      song_id: song.song_id,
      section_label: label,
      line_number: startingLineNumber + index,
      lyric_text: lyric,
      notation_text: notationText || null
    }))

    const { data, error: insertError } = await supabase
      .from('lines')
      .insert(rows)
      .select()

    if (insertError) {
      setError(insertError.message)
      setLoading(false)
      return
    }

    setLines(prev => [...prev, ...data])
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

    if (error || !changeData) return

    if (affectedUsers.length > 0) {
      await supabase.from('acknowledgments').insert(
        affectedUsers.map(u => ({ change_id: changeData.change_id, user_id: u.user_id, confirmed: false }))
      )
    }
  }

  async function handleEditLine(line, newLyric, newNotation) {
    const updates = {}
    if (newLyric !== line.lyric_text) updates.lyric_text = newLyric
    const newNotationVal = newNotation || null
    if (newNotationVal !== line.notation_text) updates.notation_text = newNotationVal
    if (Object.keys(updates).length === 0) return

    await supabase.from('lines').update(updates).eq('line_id', line.line_id)

    // Find all users assigned to this line so they get acknowledgment rows
    const { data: assigned } = await supabase
      .from('assignments')
      .select('user_id')
      .eq('line_id', line.line_id)

    const affectedUsers = assigned || []

    if (updates.lyric_text !== undefined) {
      await writeChangeLog(line.line_id, 'lyric_edited', line.lyric_text, newLyric, affectedUsers)
    }
    if ('notation_text' in updates) {
      await writeChangeLog(line.line_id, 'notation_edited', line.notation_text, newNotationVal, affectedUsers)
    }

    setLines(prev => prev.map(l => l.line_id === line.line_id ? { ...l, ...updates } : l))
  }

  // Group lines by section
  const groupedLines = lines.reduce((acc, line) => {
    const section = line.section_label || 'General'
    if (!acc[section]) acc[section] = []
    acc[section].push(line)
    return acc
  }, {})

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-1">{song.title}</h2>
      <p className="text-sm text-gray-400 mb-6">Paste lyrics section by section</p>

      {error && (
        <div className="bg-red-50 text-red-600 text-sm rounded-lg px-4 py-3 mb-4">
          {error}
        </div>
      )}

      {/* Add section form */}
      <div className="space-y-3 mb-8">
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-600 mb-1">Section</label>
            <select
              value={sectionLabel}
              onChange={e => setSectionLabel(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
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
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Lyrics <span className="text-gray-400">(paste the whole section, each line on a new line)</span>
          </label>
          <textarea
            value={lyricBlob}
            onChange={e => setLyricBlob(e.target.value)}
            placeholder={`e.g.\nTum hi ho\nAb tum hi ho\nZindagi ab tum hi ho`}
            rows={5}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Notation / Chords <span className="text-gray-400">(optional, applies to whole section)</span>
          </label>
          <input
            type="text"
            value={notationText}
            onChange={e => setNotationText(e.target.value)}
            placeholder="e.g. C G Am F"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>

        <button
          onClick={handleAddSection}
          disabled={loading || !lyricBlob.trim()}
          className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition disabled:opacity-50"
        >
          {loading ? 'Adding...' : '+ Add Section'}
        </button>
      </div>

      {/* Song display */}
      {fetching ? (
        <p className="text-sm text-gray-400">Loading lines...</p>
      ) : lines.length === 0 ? (
        <p className="text-sm text-gray-400">No lines added yet. Paste a section above to get started.</p>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedLines).map(([section, sectionLines]) => (
            <div key={section}>
              <h3 className="text-xs font-semibold text-indigo-500 uppercase tracking-wide mb-2">
                {section}
              </h3>
              <div className="bg-gray-50 rounded-xl px-4">
                {sectionLines.map(line => (
                  <LineItem
                    key={line.line_id}
                    line={line}
                    lineNumber={line.line_number}
                    onSave={handleEditLine}
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