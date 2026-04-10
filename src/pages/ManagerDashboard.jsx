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
        <button onClick={onAction} className="mt-1 text-xs font-medium text-violet-600 hover:underline">
          {actionLabel}
        </button>
      )}
    </div>
  )
}

function SongPreview({ lines }) {
  const grouped = lines.reduce((acc, line) => {
    const s = line.section_label || 'General'
    if (!acc[s]) acc[s] = []
    acc[s].push(line)
    return acc
  }, {})

  if (lines.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-4">No lines yet.</p>
  }

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([section, sectionLines]) => (
        <div key={section}>
          <p className="text-xs font-semibold text-violet-500 uppercase tracking-wide mb-2">{section}</p>
          <div className="bg-gray-50 rounded-xl px-4 py-2 space-y-1.5">
            {sectionLines.map(line => (
              <p key={line.line_id} className="text-sm text-gray-700">{line.lyric_text}</p>
            ))}
          </div>
        </div>
      ))}
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
  const [previewMode, setPreviewMode] = useState(false)
  const [deletingSongId, setDeletingSongId] = useState(null)

  useEffect(() => { fetchGroups() }, [])

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

  async function handleDeleteSong(song, e) {
    e.stopPropagation()
    if (!window.confirm(`Delete "${song.title}"? All lines and assignments will be removed.`)) return
    setDeletingSongId(song.song_id)

    const { error } = await supabase.from('songs').delete().eq('song_id', song.song_id)
    setDeletingSongId(null)
    if (error) return

    const newSongs = songs.filter(s => s.song_id !== song.song_id)
    setSongs(newSongs)
    if (selectedSong?.song_id === song.song_id) {
      const next = newSongs[0] || null
      setSelectedSong(next)
      setLines([])
    }
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
    <div className="min-h-screen bg-[#f7f6f2]">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 sm:px-8 py-3 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <span style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: '1.35rem', color: '#18181b', letterSpacing: '-0.01em' }}>
            Cue<span style={{ color: '#7c3aed' }}>.</span>
          </span>
          <span className="hidden sm:block w-px h-5 bg-gray-200" />
          <span className="hidden sm:block text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600">Manager</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500 hidden sm:block">{profile?.name}</span>
          <button onClick={logout} className="text-xs font-medium text-gray-600 hover:text-red-600 transition px-3 py-1.5 rounded-lg hover:bg-red-50">
            Log out
          </button>
        </div>
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
              <button onClick={() => setShowCreateGroup(false)} className="text-sm text-gray-400 hover:underline">
                Cancel
              </button>
            )}
          </div>
        )}

        {groups.length > 0 && !showCreateGroup && (
          <>
            {/* Group selector banner */}
            <div className="bg-violet-50 rounded-2xl px-6 py-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-wrap flex-1">
                <p className="text-xs text-violet-400 font-medium uppercase tracking-wide shrink-0">Group</p>
                <div className="flex gap-2 flex-wrap">
                  {groups.map(g => (
                    <button
                      key={g.group_id}
                      onClick={() => setSelectedGroup(g)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                        selectedGroup?.group_id === g.group_id
                          ? 'bg-violet-600 text-white'
                          : 'bg-violet-100 text-violet-600 hover:bg-violet-200'
                      }`}
                    >
                      {g.name}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {members.length > 0 && (
                  <span className="text-xs font-medium text-violet-500 bg-violet-100 px-3 py-1.5 rounded-full">
                    {members.length} member{members.length !== 1 ? 's' : ''}
                  </span>
                )}
                <button
                  onClick={() => setShowCreateGroup(true)}
                  className="text-xs font-medium text-violet-600 hover:underline"
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
                    <div key={song.song_id} className="relative group/pill">
                      <button
                        onClick={() => setSelectedSong(song)}
                        className={`pl-3 pr-7 py-1.5 rounded-lg text-sm font-medium transition ${
                          selectedSong?.song_id === song.song_id
                            ? 'bg-violet-600 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {song.title}
                      </button>
                      <button
                        onClick={e => handleDeleteSong(song, e)}
                        disabled={deletingSongId === song.song_id}
                        title="Delete song"
                        className={`absolute right-1.5 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold transition opacity-0 group-hover/pill:opacity-100 ${
                          selectedSong?.song_id === song.song_id
                            ? 'bg-violet-400 text-white hover:bg-violet-300'
                            : 'bg-gray-300 text-gray-600 hover:bg-red-200 hover:text-red-600'
                        }`}
                      >
                        ×
                      </button>
                    </div>
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
                        ? 'border-violet-600 text-violet-600'
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
                  <div className="space-y-4">
                    <CreateSong groupId={selectedGroup.group_id} onSongCreated={handleSongCreated} />

                    {selectedSong && lines.length > 0 && (
                      <div className="flex justify-end">
                        <button
                          onClick={() => setPreviewMode(v => !v)}
                          className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition ${
                            previewMode
                              ? 'bg-violet-600 text-white border-violet-600'
                              : 'bg-white text-violet-600 border-violet-300 hover:bg-violet-50'
                          }`}
                        >
                          {previewMode ? 'Exit Preview' : 'Preview as Performer'}
                        </button>
                      </div>
                    )}

                    {previewMode && selectedSong ? (
                      <div className="bg-white rounded-2xl border border-gray-200 p-6">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">Performer view — {selectedSong.title}</p>
                        <SongPreview lines={lines} />
                      </div>
                    ) : selectedSong ? (
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
