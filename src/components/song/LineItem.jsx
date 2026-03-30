import { useState } from 'react'

export default function LineItem({ line, lineNumber, onSave }) {
  const [editing, setEditing] = useState(false)
  const [lyric, setLyric] = useState(line.lyric_text)
  const [notation, setNotation] = useState(line.notation_text || '')
  const [saving, setSaving] = useState(false)

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
              <button
                onClick={handleCancel}
                className="text-xs text-gray-500 hover:underline"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-4 items-start py-3 border-b border-gray-100 last:border-0 group">
      <span className="text-xs text-gray-400 mt-1 w-5 shrink-0">{lineNumber}</span>
      <div className="flex-1">
        <p className="text-sm text-gray-800">{line.lyric_text}</p>
        {line.notation_text && (
          <p className="text-xs text-indigo-500 mt-1">{line.notation_text}</p>
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
  )
}
