import { useState } from 'react'
import { supabase } from '../../supabase/client'
import { useAuth } from '../../context/AuthContext'

export default function CreateSong({ groupId, onSongCreated }) {
  const { user } = useAuth()
  const [title, setTitle] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleCreate() {
    if (!title.trim()) return
    setLoading(true)
    setError('')

    const { data, error: songError } = await supabase
      .from('songs')
      .insert({ title, group_id: groupId, created_by: user.id })
      .select()
      .single()

    if (songError) {
      setError(songError.message)
      setLoading(false)
      return
    }

    setTitle('')
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
        <span className="rounded-xl bg-white border border-orange-100 px-3 py-2 text-lg shadow-sm">🎵</span>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 text-sm rounded-lg px-4 py-3 mb-4">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Song title (e.g. Tum Hi Ho)"
          className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
        <button
          onClick={handleCreate}
          disabled={loading || !title.trim()}
          className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition disabled:opacity-50"
        >
          {loading ? 'Adding...' : 'Add Song'}
        </button>
      </div>
    </div>
  )
}
