import { useState } from 'react'
import { supabase } from '../../supabase/client'
import { useAuth } from '../../context/AuthContext'

export default function CreateSong({ groupId, onSongCreated }) {
  const { user } = useAuth()
  const [title, setTitle] = useState('')
  const [bpm, setBpm] = useState('')
  const [scale, setScale] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const bpmValue = Number(bpm)
  const bpmInvalid = bpm && (!Number.isFinite(bpmValue) || bpmValue < 30 || bpmValue > 260)
  const canCreate = title.trim() && bpm && scale.trim() && !bpmInvalid

  async function handleCreate() {
    if (!canCreate) return
    setLoading(true)
    setError('')

    const { data, error: songError } = await supabase
      .from('songs')
      .insert({
        title: title.trim(),
        group_id: groupId,
        created_by: user.id,
        bpm: bpmValue,
        scale: scale.trim()
      })
      .select()
      .single()

    if (songError) {
      setError(songError.message)
      setLoading(false)
      return
    }

    setTitle('')
    setBpm('')
    setScale('')
    setLoading(false)
    onSongCreated(data)
  }

  return (
    <div className="rounded-2xl shadow-sm border border-orange-100 p-5 bg-gradient-to-br from-white to-orange-50">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-orange-700 mb-1">Song library</p>
          <h2 className="text-lg font-semibold text-gray-800">Add a Song</h2>
        </div>
        <span className="rounded-xl bg-white border border-orange-100 px-3 py-2 text-xs font-bold text-orange-700 shadow-sm">SONG</span>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 text-sm rounded-lg px-4 py-3 mb-4">
          {error}
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-[1.5fr_0.65fr_0.85fr_auto] md:items-end">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Song title</label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g. Tum Hi Ho"
            className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">BPM</label>
          <input
            type="number"
            min="30"
            max="260"
            value={bpm}
            onChange={e => setBpm(e.target.value)}
            placeholder="96"
            className={`w-full border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 ${bpmInvalid ? 'border-red-300 bg-red-50' : 'border-gray-300'}`}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Scale</label>
          <input
            type="text"
            value={scale}
            onChange={e => setScale(e.target.value)}
            placeholder="e.g. C minor"
            className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>
        <button
          onClick={handleCreate}
          disabled={loading || !canCreate}
          className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition disabled:opacity-50 md:min-w-28"
        >
          {loading ? 'Adding...' : 'Add Song'}
        </button>
      </div>
      {bpmInvalid && (
        <p className="text-xs text-red-500 mt-2">BPM should be between 30 and 260.</p>
      )}
    </div>
  )
}
