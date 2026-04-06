import { useState } from 'react'

export default function LineItem({ line, lineNumber, onSave, wordNotes, onNoteChange }) {
  const [editing, setEditing] = useState(false)
  const [lyric, setLyric] = useState(line.lyric_text)
  const [notation, setNotation] = useState(line.notation_text || '')
  const [saving, setSaving] = useState(false)

  const [activeWordIndex, setActiveWordIndex] = useState(null)
  const [noteInput, setNoteInput] = useState('')
  const [noteSaving, setNoteSaving] = useState(false)

  function handleCancel() {
    setLyric(line.lyric_text)
    setNotation(line.notation_text || '')
    setEditing(false)
  }

  async function handleSave() {
    if (!lyric.trim()) return
    setSaving(true)
    await onSave(line, lyric.trim(), notation.trim())
    setSaving(false)
    setEditing(false)
  }

  function handleWordClick(i, note) {
    if (activeWordIndex === i) {
      setActiveWordIndex(null)
    } else {
      setActiveWordIndex(i)
      setNoteInput(note || '')
    }
  }

  async function handleNoteSave() {
    if (!onNoteChange) return
    setNoteSaving(true)
    await onNoteChange(activeWordIndex, noteInput.trim())
    setNoteSaving(false)
    setActiveWordIndex(null)
    setNoteInput('')
  }

  async function handleNoteClear() {
    if (!onNoteChange) return
    setNoteSaving(true)
    await onNoteChange(activeWordIndex, '')
    setNoteSaving(false)
    setActiveWordIndex(null)
    setNoteInput('')
  }

  // ── Edit mode (lyric text + notation) ──────────────────────────────────
  if (editing) {
    return (
      <div className="py-3 border-b border-gray-100 last:border-0">
        <div className="flex gap-3 items-start">
          <span className="text-xs text-gray-400 mt-2 w-5 shrink-0">{lineNumber}</span>
          <div className="flex-1 space-y-2">
            <input
              value={lyric}
              onChange={e => setLyric(e.target.value)}
              className="w-full border border-indigo-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <input
              value={notation}
              onChange={e => setNotation(e.target.value)}
              placeholder="Notation / chords (optional)"
              className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={saving || !lyric.trim()}
                className="text-xs bg-indigo-600 text-white px-3 py-1 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button onClick={handleCancel} className="text-xs text-gray-500 hover:underline">
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── View mode ──────────────────────────────────────────────────────────
  const words = line.lyric_text.split(' ')

  return (
    <div className="py-3 border-b border-gray-100 last:border-0 group">
      <div className="flex gap-4 items-start">
        <span className="text-xs text-gray-400 mt-1 w-5 shrink-0">{lineNumber}</span>

        <div className="flex-1">
          {/* Word-by-word with notes above */}
          <div className="flex flex-wrap items-end gap-x-1.5 gap-y-3">
            {words.map((word, i) => {
              const note = wordNotes?.[i]
              const isActive = activeWordIndex === i
              return (
                <span key={i} className="flex flex-col items-center">
                  <span className={`text-xs font-mono font-semibold mb-0.5 ${note ? 'text-teal-500' : 'opacity-0 select-none pointer-events-none'}`}>
                    {note || '·'}
                  </span>
                  <button
                    onClick={() => handleWordClick(i, note)}
                    title={note ? `Note: ${note} — click to edit` : 'Click to add a note'}
                    className={`text-sm rounded px-0.5 transition leading-snug
                      ${isActive
                        ? 'bg-indigo-100 text-indigo-700 outline outline-1 outline-indigo-400'
                        : note
                          ? 'text-gray-800 hover:bg-teal-50'
                          : 'text-gray-800 hover:bg-indigo-50 hover:text-indigo-600'
                      }`}
                  >
                    {word}
                  </button>
                </span>
              )
            })}
          </div>

          {/* Line-level notation */}
          {line.notation_text && (
            <p className="text-xs text-indigo-500 mt-1">{line.notation_text}</p>
          )}

          {/* Inline note editor */}
          {activeWordIndex !== null && (
            <div className="mt-2 flex flex-wrap gap-2 items-center bg-gray-50 rounded-lg px-3 py-2">
              <span className="text-xs text-gray-500 shrink-0">
                Note for <span className="font-semibold text-gray-700">"{words[activeWordIndex]}"</span>:
              </span>
              <input
                autoFocus
                value={noteInput}
                onChange={e => setNoteInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleNoteSave()
                  if (e.key === 'Escape') { setActiveWordIndex(null); setNoteInput('') }
                }}
                placeholder="e.g. Am, forte, breathe…"
                className="flex-1 min-w-24 border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400"
              />
              <button
                onClick={handleNoteSave}
                disabled={noteSaving || !noteInput.trim()}
                className="text-xs bg-indigo-600 text-white px-2.5 py-1 rounded hover:bg-indigo-700 disabled:opacity-50 transition"
              >
                {noteSaving ? '…' : 'Save'}
              </button>
              {wordNotes?.[activeWordIndex] && (
                <button
                  onClick={handleNoteClear}
                  disabled={noteSaving}
                  className="text-xs text-red-400 hover:underline"
                >
                  Clear
                </button>
              )}
              <button
                onClick={() => { setActiveWordIndex(null); setNoteInput('') }}
                className="text-xs text-gray-400 hover:underline"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        {onSave && (
          <button
            onClick={() => setEditing(true)}
            className="text-xs text-gray-400 hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition shrink-0 mt-1"
          >
            Edit
          </button>
        )}
      </div>
    </div>
  )
}
