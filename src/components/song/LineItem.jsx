import { useState } from 'react'

const NOTE_OPTIONS = [
  'C', 'C♯ / D♭', 'D', 'D♯ / E♭', 'E', 'F', 'F♯ / G♭', 'G', 'G♯ / A♭', 'A', 'A♯ / B♭', 'B',
  'Cm', 'C♯m', 'Dm', 'E♭m', 'Em', 'Fm', 'F♯m', 'Gm', 'A♭m', 'Am', 'B♭m', 'Bm',
  'Hold', 'Breath', 'Rest',
]

function IconBtn({ onClick, title, children, className = '' }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded-lg transition text-gray-400 hover:text-gray-700 hover:bg-gray-100 shrink-0 ${className}`}
    >
      {children}
    </button>
  )
}

export default function LineItem({ line, lineNumber, onSave, onDelete, onMoveUp, onMoveDown, wordNotes, onNoteChange }) {
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
    if (!lyric.trim() && !notation.trim()) return
    setSaving(true)
    try {
      await onSave(line, lyric.trim(), notation.trim())
      setEditing(false)
    } finally {
      setSaving(false)
    }
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
    try {
      await onNoteChange(activeWordIndex, noteInput.trim())
      setActiveWordIndex(null)
      setNoteInput('')
    } finally {
      setNoteSaving(false)
    }
  }

  async function handleNoteClear() {
    if (!onNoteChange) return
    setNoteSaving(true)
    try {
      await onNoteChange(activeWordIndex, '')
      setActiveWordIndex(null)
      setNoteInput('')
    } finally {
      setNoteSaving(false)
    }
  }

  // ── Edit mode ──────────────────────────────────────────────────────────
  if (editing) {
    return (
      <div data-demo-tour="edit-line-form" className="py-3 border-b border-gray-100 last:border-0">
        <div className="flex gap-3 items-start">
          <span className="text-xs text-gray-400 mt-2 w-5 shrink-0">{lineNumber}</span>
          <div className="flex-1 space-y-2">
            <input
              data-demo-tour="edit-line-lyric"
              value={lyric}
              onChange={e => setLyric(e.target.value)}
              placeholder="Singer lyric line"
              className="w-full border border-violet-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
            />
            <input
              data-demo-tour="edit-line-notation"
              value={notation}
              onChange={e => setNotation(e.target.value)}
              placeholder="Musician notation / chords (optional)"
              className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-violet-400"
            />
            <div className="flex gap-2">
              <button
                data-demo-tour="edit-line-save"
                onClick={handleSave}
                disabled={saving || (!lyric.trim() && !notation.trim())}
                className="text-xs bg-violet-600 text-white px-3 py-1 rounded-lg hover:bg-violet-700 disabled:opacity-50 transition"
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
  const isInstrumental = !line.lyric_text?.trim()
  const words = isInstrumental ? [] : line.lyric_text.split(' ')

  return (
    <div className="py-3 border-b border-gray-100 last:border-0">
      <div className="flex gap-4 items-start">
        <span className="text-xs text-gray-400 mt-1 w-5 shrink-0">{lineNumber}</span>

        <div className="flex-1">
          {isInstrumental ? (
            /* Instrumental / BGM line — notation only */
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full">Instrumental</span>
              {line.notation_text && (
                <span className="text-sm font-mono text-teal-700">{line.notation_text}</span>
              )}
            </div>
          ) : (
            <>
              {/* Word-by-word with notes above */}
              <div className="flex flex-wrap items-end gap-x-1.5 gap-y-3">
                {words.map((word, i) => {
                  const note = wordNotes?.[i]
                  const isActive = activeWordIndex === i
                  return (
                    <span key={i} className="flex flex-col items-center">
                      <button
                        data-demo-tour="word-note-trigger"
                        onClick={() => handleWordClick(i, note)}
                        title={note ? `Chord/notation: ${note} — click to edit` : 'Click to add a chord or notation'}
                        className={`min-h-4 rounded px-1 text-xs font-mono font-semibold leading-none transition ${
                          isActive
                            ? 'bg-violet-100 text-violet-700 outline outline-1 outline-violet-400'
                            : note
                              ? 'text-teal-500 hover:bg-teal-50'
                              : 'text-gray-300 hover:bg-violet-50 hover:text-violet-600'
                        }`}
                      >
                        {note || '+'}
                      </button>
                      <span className="text-sm leading-snug text-gray-800">
                        {word}
                      </span>
                    </span>
                  )
                })}
              </div>

              {/* Line-level notation */}
              {line.notation_text && (
                <p className="text-xs text-violet-500 mt-1">{line.notation_text}</p>
              )}
            </>
          )}

          {/* Inline note editor (only for lines with lyrics) */}
          {!isInstrumental && activeWordIndex !== null && (
            <div data-demo-tour="word-note-editor" className="mt-2 flex flex-wrap gap-2 items-center bg-gray-50 rounded-lg px-3 py-2">
              <span className="text-xs text-gray-500 shrink-0">
                Chord or notation for <span className="font-semibold text-gray-700">"{words[activeWordIndex]}"</span>:
              </span>
              <select
                data-demo-tour="word-note-input"
                autoFocus
                value={noteInput}
                onChange={e => setNoteInput(e.target.value)}
                className="flex-1 min-w-32 border border-gray-300 bg-white rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-violet-400"
              >
                <option value="">Choose a note or instruction…</option>
                {noteInput && !NOTE_OPTIONS.includes(noteInput) && <option value={noteInput}>{noteInput}</option>}
                {NOTE_OPTIONS.map(option => <option key={option} value={option}>{option}</option>)}
              </select>
              <button
                data-demo-tour="word-note-save"
                onClick={handleNoteSave}
                disabled={noteSaving || !noteInput.trim()}
                className="text-xs bg-violet-600 text-white px-2.5 py-1 rounded hover:bg-violet-700 disabled:opacity-50 transition"
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

        {/* Action buttons — always visible */}
        <div className="flex items-center gap-0.5 shrink-0 mt-0.5">
          {onMoveUp && (
            <IconBtn onClick={onMoveUp} title="Move up">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            </IconBtn>
          )}
          {onMoveDown && (
            <IconBtn onClick={onMoveDown} title="Move down">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </IconBtn>
          )}
          {onSave && (
            <span data-demo-tour="edit-line-trigger">
              <IconBtn onClick={() => setEditing(true)} title="Edit line" className="hover:text-violet-600 hover:bg-violet-50">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </IconBtn>
            </span>
          )}
          {onDelete && (
            <IconBtn onClick={onDelete} title="Delete line" className="hover:text-red-500 hover:bg-red-50">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </IconBtn>
          )}
        </div>
      </div>
    </div>
  )
}
