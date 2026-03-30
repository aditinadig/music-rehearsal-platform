import { useState, useEffect } from 'react'
import { supabase } from '../supabase/client'
import { useAuth } from '../context/AuthContext'
import CreateGroup from '../components/song/CreateGroup'
import CreateSong from '../components/song/CreateSong'
import SongBuilder from '../components/song/SongBuilder'

export default function ManagerDashboard() {
  const { profile, logout, user } = useAuth()
  const [group, setGroup] = useState(null)
  const [songs, setSongs] = useState([])
  const [selectedSong, setSelectedSong] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchGroup()
  }, [])

  async function fetchGroup() {
    setLoading(true)

    // Check if manager already has a group
    const { data, error } = await supabase
      .from('groups')
      .select('*')
      .eq('manager_id', user.id)
      .single()

    if (!error && data) {
      setGroup(data)
      fetchSongs(data.group_id)
    }

    setLoading(false)
  }

  async function fetchSongs(groupId) {
    const { data, error } = await supabase
      .from('songs')
      .select('*')
      .eq('group_id', groupId)
      .order('created_at', { ascending: true })

    if (!error) setSongs(data)
  }

  function handleGroupCreated(newGroup) {
    setGroup(newGroup)
  }

  function handleSongCreated(newSong) {
    setSongs(prev => [...prev, newSong])
    setSelectedSong(newSong)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-8 py-4 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Manager Dashboard</h1>
          <p className="text-sm text-gray-400">Welcome, {profile?.name}</p>
        </div>
        <button
          onClick={logout}
          className="text-sm text-red-400 hover:underline"
        >
          Log out
        </button>
      </div>

      <div className="max-w-4xl mx-auto px-8 py-8 space-y-6">
        {/* Step 1: Create group if none exists */}
        {!group && (
          <CreateGroup onGroupCreated={handleGroupCreated} />
        )}

        {/* Step 2: Group exists, show group name and song creation */}
        {group && (
          <>
            <div className="bg-indigo-50 rounded-2xl px-6 py-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-indigo-400 font-medium uppercase tracking-wide">Your Group</p>
                <p className="text-lg font-semibold text-indigo-700">{group.name}</p>
              </div>
            </div>

            <CreateSong
              groupId={group.group_id}
              onSongCreated={handleSongCreated}
            />

            {/* Song list */}
            {songs.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">Songs</h2>
                <div className="space-y-2">
                  {songs.map(song => (
                    <button
                      key={song.song_id}
                      onClick={() => setSelectedSong(song)}
                      className={`w-full text-left px-4 py-3 rounded-xl text-sm transition ${
                        selectedSong?.song_id === song.song_id
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {song.title}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 3: Build the selected song */}
            {selectedSong && (
              <SongBuilder song={selectedSong} />
            )}
          </>
        )}
      </div>
    </div>
  )
}