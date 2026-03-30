import { useState, useEffect } from 'react'
import { supabase } from '../supabase/client'
import { useAuth } from '../context/AuthContext'
import CreateGroup from '../components/song/CreateGroup'
import CreateSong from '../components/song/CreateSong'
import SongBuilder from '../components/song/SongBuilder'
import InviteMember from '../components/assignments/InviteMember'
import MemberList from '../components/assignments/MemberList'
import AssignmentPanel from '../components/assignments/AssignmentPanel'
import AcknowledgmentStatus from '../components/assignments/AcknowledgmentStatus'

export default function ManagerDashboard() {
  const { profile, logout, user } = useAuth()
  const [group, setGroup] = useState(null)
  const [songs, setSongs] = useState([])
  const [selectedSong, setSelectedSong] = useState(null)
  const [lines, setLines] = useState([])
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('songs')

  useEffect(() => {
    fetchGroup()
  }, [])

  useEffect(() => {
    if (selectedSong) fetchLines(selectedSong.song_id)
  }, [selectedSong])

  async function fetchGroup() {
    setLoading(true)
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

  async function fetchLines(songId) {
    const { data, error } = await supabase
      .from('lines')
      .select('*')
      .eq('song_id', songId)
      .order('line_number', { ascending: true })

    if (!error) setLines(data)
  }

  function handleGroupCreated(newGroup) {
    setGroup(newGroup)
  }

  function handleSongCreated(newSong) {
    setSongs(prev => [...prev, newSong])
    setSelectedSong(newSong)
  }

  function handleMembersLoaded(loadedMembers) {
    setMembers(loadedMembers)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400">Loading...</p>
      </div>
    )
  }

  const tabs = ['songs', 'members', 'assignments', 'status']

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-8 py-4 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Manager Dashboard</h1>
          <p className="text-sm text-gray-400">Welcome, {profile?.name}</p>
        </div>
        <button onClick={logout} className="text-sm text-red-400 hover:underline">
          Log out
        </button>
      </div>

      <div className="max-w-4xl mx-auto px-8 py-8 space-y-6">

        {/* No group yet */}
        {!group && (
          <CreateGroup onGroupCreated={handleGroupCreated} />
        )}

        {group && (
          <>
            {/* Group banner */}
            <div className="bg-indigo-50 rounded-2xl px-6 py-4">
              <p className="text-xs text-indigo-400 font-medium uppercase tracking-wide">Your Group</p>
              <p className="text-lg font-semibold text-indigo-700">{group.name}</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-2">
              {tabs.map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition ${
                    activeTab === tab
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white text-gray-500 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Songs tab */}
            {activeTab === 'songs' && (
              <div className="space-y-6">
                <CreateSong
                  groupId={group.group_id}
                  onSongCreated={handleSongCreated}
                />

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

                {selectedSong && (
                  <SongBuilder
                    song={selectedSong}
                    onLinesUpdated={() => fetchLines(selectedSong.song_id)}
                  />
                )}
              </div>
            )}

            {/* Members tab */}
            {activeTab === 'members' && (
              <div className="space-y-6">
                <InviteMember
                  groupId={group.group_id}
                  onMemberAdded={() => {}}
                />
                <MemberList
                  groupId={group.group_id}
                  onMembersLoaded={handleMembersLoaded}
                />
              </div>
            )}

            {/* Assignments tab */}
            {activeTab === 'assignments' && (
              <div className="space-y-6">
                {songs.length === 0 ? (
                  <p className="text-sm text-gray-400">Create a song first before assigning lines.</p>
                ) : (
                  <>
                    {/* Song picker for assignments */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                      <h2 className="text-lg font-semibold text-gray-800 mb-4">Select Song</h2>
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

                    {selectedSong && lines.length > 0 && members.length > 0 && (
                      <AssignmentPanel
                        lines={lines}
                        members={members}
                        onAssignmentSaved={() => {}}
                      />
                    )}

                    {selectedSong && lines.length === 0 && (
                      <p className="text-sm text-gray-400">
                        This song has no lines yet. Go to the Songs tab to add lines.
                      </p>
                    )}

                    {members.filter(m => m.role !== 'manager').length === 0 && (
                      <p className="text-sm text-gray-400">
                        No performers in your group yet. Go to the Members tab to add some.
                      </p>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Status tab */}
            {activeTab === 'status' && (
              <div className="space-y-6">
                {selectedSong ? (
                  <AcknowledgmentStatus songId={selectedSong.song_id} />
                ) : (
                  <p className="text-sm text-gray-400">
                    Select a song from the Songs tab first.
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}