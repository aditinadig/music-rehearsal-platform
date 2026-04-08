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

function EmptyState({ icon, title, hint, actionLabel, onAction }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-10 flex flex-col items-center text-center gap-3">
      {icon && <span className="text-3xl">{icon}</span>}
      <p className="text-sm font-semibold text-gray-700">{title}</p>
      {hint && <p className="text-xs text-gray-400 max-w-xs">{hint}</p>}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-1 text-xs font-medium text-indigo-600 hover:underline"
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}

const TABS = [
  { id: 'songs', label: 'Songs' },
  { id: 'members', label: 'Members' },
  { id: 'assignments', label: 'Assignments' },
  { id: 'status', label: 'Status' },
]

export default function ManagerDashboard() {
  const { profile, logout, user } = useAuth()
  const [groups, setGroups] = useState([])
  const [selectedGroup, setSelectedGroup] = useState(null)
  const [showCreateGroup, setShowCreateGroup] = useState(false)
  const [songs, setSongs] = useState([])
  const [selectedSong, setSelectedSong] = useState(null)
  const [lines, setLines] = useState([])
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('songs')
  const [memberRefresh, setMemberRefresh] = useState(0)

  useEffect(() => {
    fetchGroups()
  }, [])

  useEffect(() => {
    if (selectedGroup) {
      setSongs([])
      setSelectedSong(null)
      setLines([])
      setMembers([])
      fetchSongs(selectedGroup.group_id)
    }
  }, [selectedGroup?.group_id])

  useEffect(() => {
    if (selectedSong) fetchLines(selectedSong.song_id)
  }, [selectedSong])

  async function fetchGroups() {
    setLoading(true)
    const { data, error } = await supabase
      .from('groups')
      .select('*')
      .eq('manager_id', user.id)
      .order('created_at', { ascending: true })

    if (!error && data?.length) {
      setGroups(data)
      setSelectedGroup(data[0])
      fetchSongs(data[0].group_id)
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
    setGroups(prev => [...prev, newGroup])
    setSelectedGroup(newGroup)
    setShowCreateGroup(false)
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
        <div className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const performers = members.filter(m => m.role !== 'manager')

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 sm:px-8 py-4 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Manager Dashboard</h1>
          <p className="text-sm text-gray-400">Welcome, {profile?.name}</p>
        </div>
        <button onClick={logout} className="text-sm text-red-400 hover:underline">
          Log out
        </button>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-8 py-4 sm:py-8 space-y-5">

        {/* No groups yet */}
        {groups.length === 0 && !showCreateGroup && (
          <div className="bg-white rounded-2xl border border-gray-200 p-10 flex flex-col items-center gap-3">
            <span className="text-3xl">🎶</span>
            <p className="text-sm font-semibold text-gray-700">No groups yet</p>
            <p className="text-xs text-gray-400">Create your first group to get started.</p>
            <button
              onClick={() => setShowCreateGroup(true)}
              className="mt-1 bg-indigo-600 text-white text-sm font-medium px-5 py-2 rounded-lg hover:bg-indigo-700 transition"
            >
              Create Group
            </button>
          </div>
        )}

        {showCreateGroup && (
          <div className="space-y-3">
            <CreateGroup onGroupCreated={handleGroupCreated} />
            {groups.length > 0 && (
              <button
                onClick={() => setShowCreateGroup(false)}
                className="text-sm text-gray-400 hover:underline"
              >
                Cancel
              </button>
            )}
          </div>
        )}

        {groups.length > 0 && !showCreateGroup && (
          <>
            {/* Group selector banner */}
            <div className="bg-indigo-50 rounded-2xl px-6 py-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-wrap flex-1">
                <p className="text-xs text-indigo-400 font-medium uppercase tracking-wide shrink-0">Group</p>
                <div className="flex gap-2 flex-wrap">
                  {groups.map(g => (
                    <button
                      key={g.group_id}
                      onClick={() => setSelectedGroup(g)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                        selectedGroup?.group_id === g.group_id
                          ? 'bg-indigo-600 text-white'
                          : 'bg-indigo-100 text-indigo-600 hover:bg-indigo-200'
                      }`}
                    >
                      {g.name}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {members.length > 0 && (
                  <span className="text-xs font-medium text-indigo-500 bg-indigo-100 px-3 py-1.5 rounded-full">
                    {members.length} member{members.length !== 1 ? 's' : ''}
                  </span>
                )}
                <button
                  onClick={() => setShowCreateGroup(true)}
                  className="text-xs font-medium text-indigo-600 hover:underline"
                >
                  + New Group
                </button>
              </div>
            </div>

            {/* Persistent song selector */}
            {songs.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 px-4 py-3 flex items-center gap-3 flex-wrap">
                <span className="text-xs font-semibold text-gray-500 shrink-0">Song</span>
                <div className="flex gap-2 flex-wrap flex-1">
                  {songs.map(song => (
                    <button
                      key={song.song_id}
                      onClick={() => setSelectedSong(song)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                        selectedSong?.song_id === song.song_id
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {song.title}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Tab bar */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="flex overflow-x-auto border-b border-gray-100">
                {TABS.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 px-4 py-3 text-sm font-medium transition border-b-2 -mb-px ${
                      activeTab === tab.id
                        ? 'border-indigo-600 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="p-6">

                {/* Songs tab */}
                {activeTab === 'songs' && (
                  <div className="space-y-6">
                    <CreateSong
                      groupId={selectedGroup.group_id}
                      onSongCreated={handleSongCreated}
                    />
                    {selectedSong ? (
                      <SongBuilder
                        song={selectedSong}
                        onLinesUpdated={() => fetchLines(selectedSong.song_id)}
                      />
                    ) : songs.length > 0 ? (
                      <EmptyState
                        icon="🎵"
                        title="No song selected"
                        hint="Select a song above to edit its lines and sections."
                      />
                    ) : null}
                  </div>
                )}

                {/* Members tab */}
                {activeTab === 'members' && (
                  <div className="space-y-6">
                    <InviteMember
                      groupId={selectedGroup.group_id}
                      onMemberAdded={() => setMemberRefresh(prev => prev + 1)}
                    />
                    <MemberList
                      key={memberRefresh}
                      groupId={selectedGroup.group_id}
                      onMembersLoaded={handleMembersLoaded}
                    />
                  </div>
                )}

                {/* Assignments tab */}
                {activeTab === 'assignments' && (
                  <>
                    {!selectedSong ? (
                      <EmptyState
                        icon="🎼"
                        title="No song selected"
                        hint="Select a song from the bar above to manage line assignments."
                        actionLabel="Go to Songs tab to create one"
                        onAction={() => setActiveTab('songs')}
                      />
                    ) : lines.length === 0 ? (
                      <EmptyState
                        icon="📝"
                        title="No lines in this song yet"
                        hint="Add lyrics and sections in the Songs tab first."
                        actionLabel="Go to Songs tab"
                        onAction={() => setActiveTab('songs')}
                      />
                    ) : performers.length === 0 ? (
                      <EmptyState
                        icon="👥"
                        title="No performers in your group"
                        hint="Invite singers and musicians in the Members tab before assigning lines."
                        actionLabel="Go to Members tab"
                        onAction={() => setActiveTab('members')}
                      />
                    ) : (
                      <AssignmentPanel
                        lines={lines}
                        members={members}
                        onAssignmentSaved={() => {}}
                      />
                    )}
                  </>
                )}

                {/* Status tab */}
                {activeTab === 'status' && (
                  <>
                    {!selectedSong ? (
                      <EmptyState
                        icon="📊"
                        title="No song selected"
                        hint="Select a song from the bar above to see who has confirmed updates."
                        actionLabel="Go to Songs tab to create one"
                        onAction={() => setActiveTab('songs')}
                      />
                    ) : (
                      <AcknowledgmentStatus songId={selectedSong.song_id} />
                    )}
                  </>
                )}

              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
