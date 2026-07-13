import { useState, useEffect } from 'react'
import { supabase } from '../supabase/client'
import { useAuth } from '../context/useAuth'
import CreateGroup from '../components/song/CreateGroup'
import CreateSong from '../components/song/CreateSong'
import SongBuilder from '../components/song/SongBuilder'
import InviteMember from '../components/assignments/InviteMember'
import MemberList from '../components/assignments/MemberList'
import AssignmentPanel from '../components/assignments/AssignmentPanel'
import AcknowledgmentStatus from '../components/assignments/AcknowledgmentStatus'

const terracotta = '#E35336'
const lavender = '#9988A1'
const rust = '#8A2B0E'
const ink = '#12100A'
const border = '#F0D7C8'
const soft = '#FFF4EA'

function EmptyState({ label = 'Empty', title, hint, actionLabel, onAction }) {
  return (
    <div className="bg-white rounded-2xl border p-8 flex flex-col items-center text-center gap-3 shadow-sm" style={{ borderColor: border }}>
      <span className="text-[11px] font-bold uppercase tracking-[0.16em] rounded-lg px-3 py-2" style={{ background: soft, color: rust }}>{label}</span>
      <p className="text-sm font-semibold text-gray-800">{title}</p>
      {hint && <p className="text-xs text-gray-500 max-w-xs leading-5">{hint}</p>}
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
  { id: 'songs', label: 'Build song', step: '1' },
  { id: 'members', label: 'People', step: '2' },
  { id: 'assignments', label: 'Assign parts', step: '3' },
  { id: 'status', label: 'Confirmations', step: '4' },
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
  const [, setDeletingSongId] = useState(null)
  const [deleteError, setDeleteError] = useState('')
  const [confirmDeleteSong, setConfirmDeleteSong] = useState(null)
  const [showCreateSong, setShowCreateSong] = useState(false)

  useEffect(() => { fetchGroups() }, [])

  useEffect(() => {
    if (selectedGroup) {
      setSongs([])
      setSelectedSong(null)
      setLines([])
      setMembers([])
      fetchSongs(selectedGroup.group_id)
      fetchMembers(selectedGroup.group_id)
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

    if (!error) {
      setSongs(data)
      setSelectedSong(current => data.some(song => song.song_id === current?.song_id) ? current : data[0] || null)
    }
  }

  async function fetchMembers(groupId) {
    const { data: memberData } = await supabase
      .from('group_members')
      .select('user_id')
      .eq('group_id', groupId)
    if (!memberData?.length) return

    const { data: userData } = await supabase
      .from('users')
      .select('user_id, name, role')
      .in('user_id', memberData.map(m => m.user_id))
    if (userData) setMembers(userData)
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
    setShowCreateSong(false)
  }

  function handleSongUpdated(updatedSong) {
    setSongs(prev => prev.map(song => song.song_id === updatedSong.song_id ? { ...song, ...updatedSong } : song))
    setSelectedSong(prev => prev?.song_id === updatedSong.song_id ? { ...prev, ...updatedSong } : prev)
  }

  function handleMembersLoaded(loadedMembers) {
    setMembers(loadedMembers)
  }

  async function handleDeleteSong(song) {
    setConfirmDeleteSong(null)
    setDeletingSongId(song.song_id)
    setDeleteError('')

    // Delete all child records first (best-effort, non-blocking on individual errors)
    const { data: lineRows } = await supabase.from('lines').select('line_id').eq('song_id', song.song_id)
    const lineIds = (lineRows || []).map(l => l.line_id)

    if (lineIds.length > 0) {
      const { data: changeRows } = await supabase.from('change_log').select('change_id').in('line_id', lineIds)
      const changeIds = (changeRows || []).map(c => c.change_id)
      if (changeIds.length > 0) {
        await supabase.from('acknowledgments').delete().in('change_id', changeIds)
        await supabase.from('change_log').delete().in('change_id', changeIds)
      }
      await supabase.from('assignments').delete().in('line_id', lineIds)
      await supabase.from('word_notes').delete().in('line_id', lineIds)
      await supabase.from('cues').delete().in('line_id', lineIds)
      await supabase.from('lines').delete().in('line_id', lineIds)
    }

    const { data: deletedRows, error } = await supabase
      .from('songs').delete().eq('song_id', song.song_id).select()
    setDeletingSongId(null)
    if (error) { setDeleteError(`Could not delete song: ${error.message}`); return }
    if (!deletedRows || deletedRows.length === 0) {
      setDeleteError('Delete was blocked by a database policy. Check RLS policies on the songs table in Supabase.')
      return
    }

    // Delete succeeded — update UI directly without refetching
    const songId = song.song_id
    const remaining = songs.filter(s => s.song_id !== songId)
    setSongs(remaining)
    if (selectedSong?.song_id === songId) {
      setSelectedSong(remaining[0] || null)
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
    <div className="min-h-screen bg-white">

      {/* Delete confirmation modal */}
      {confirmDeleteSong && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full space-y-4">
            <p className="text-sm font-semibold text-gray-800">Delete "{confirmDeleteSong.title}"?</p>
            <p className="text-xs text-gray-500">All lines, assignments, and change history for this song will be permanently removed.</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmDeleteSong(null)}
                className="px-4 py-2 text-sm rounded-lg text-gray-600 hover:bg-gray-100 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteSong(confirmDeleteSong)}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white/95 backdrop-blur border-b border-gray-100 px-4 sm:px-8 py-3 flex justify-between items-center sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <span style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: '1.35rem', color: ink, letterSpacing: '-0.01em' }}>
            Cue<span style={{ color: terracotta }}>.</span>
          </span>
          <span className="hidden sm:block w-px h-5 bg-gray-200" />
          <span
            className="hidden sm:block text-xs font-medium px-2 py-0.5 rounded-full"
            style={{ background: '#FFF4EA', color: rust }}
          >
            Manager
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500 hidden sm:block">{profile?.name}</span>
          <button onClick={logout} className="text-xs font-medium text-gray-600 hover:text-red-600 transition px-3 py-1.5 rounded-lg hover:bg-red-50">
            Log out
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-4 sm:py-6 space-y-4">

        {/* No groups yet */}
        {groups.length === 0 && !showCreateGroup && (
          <div className="rounded-3xl border p-10 flex flex-col items-center gap-3 text-center shadow-sm" style={{ borderColor: border, background: `linear-gradient(135deg, #fff 0%, ${soft} 100%)` }}>
            <span className="text-[11px] font-bold uppercase tracking-[0.18em] rounded-lg px-4 py-3 bg-white shadow-sm" style={{ color: rust }}>Group</span>
            <p className="text-lg font-semibold text-gray-800">No groups yet</p>
            <p className="text-sm text-gray-500 max-w-sm">Create your first rehearsal group, then add songs, performers, assignments, and update confirmations from one workspace.</p>
            <button
              onClick={() => setShowCreateGroup(true)}
              className="mt-2 text-white text-sm font-medium px-5 py-2 rounded-lg transition shadow-sm"
              style={{ background: rust }}
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
            <div className="flex flex-col gap-4 rounded-2xl border bg-white p-4 shadow-sm sm:flex-row sm:items-end" style={{ borderColor: border }}>
              <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-2">
                <label className="min-w-0">
                  <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color: lavender }}>Group</span>
                  <select
                    value={selectedGroup?.group_id || ''}
                    onChange={event => setSelectedGroup(groups.find(group => group.group_id === event.target.value))}
                    className="w-full rounded-xl border bg-white px-3 py-2.5 text-sm font-semibold text-gray-800 outline-none focus:border-[#E35336] focus:ring-2 focus:ring-orange-100"
                    style={{ borderColor: border }}
                  >
                    {groups.map(group => <option key={group.group_id} value={group.group_id}>{group.name}</option>)}
                  </select>
                </label>
                <label className="min-w-0">
                  <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color: lavender }}>Song</span>
                  <select
                    value={selectedSong?.song_id || ''}
                    onChange={event => setSelectedSong(songs.find(song => song.song_id === event.target.value))}
                    className="w-full rounded-xl border bg-white px-3 py-2.5 text-sm font-semibold text-gray-800 outline-none focus:border-[#E35336] focus:ring-2 focus:ring-orange-100"
                    style={{ borderColor: border }}
                  >
                    {songs.length === 0 && <option value="">No songs yet</option>}
                    {songs.map(song => <option key={song.song_id} value={song.song_id}>{song.title}</option>)}
                  </select>
                </label>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="hidden text-xs text-gray-400 lg:inline">{performers.length} performers</span>
                <button data-demo-tour="manager-new-group" onClick={() => setShowCreateGroup(true)} className="rounded-lg px-3 py-2 text-xs font-semibold text-[#8A2B0E] hover:bg-[#FFF4EA]">New group</button>
                {selectedSong && (
                  <button onClick={() => setConfirmDeleteSong(selectedSong)} className="rounded-lg px-3 py-2 text-xs font-medium text-gray-400 hover:bg-red-50 hover:text-red-600">Delete song</button>
                )}
              </div>
            </div>

            {/* Delete error */}
            {deleteError && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
                {deleteError}
              </div>
            )}

            {/* Tab bar */}
            <div className="bg-white rounded-3xl border overflow-hidden shadow-sm" style={{ borderColor: border }}>
              <div className="flex overflow-x-auto border-b" style={{ borderColor: border, background: '#FAFAF8' }}>
                {TABS.map(tab => (
                  <button
                    key={tab.id}
                    data-demo-tour={`manager-tab-${tab.id}`}
                    onClick={() => setActiveTab(tab.id)}
                    className="flex-1 px-3 py-3 text-sm font-semibold transition border-b-2 -mb-px whitespace-nowrap"
                    style={{
                      borderColor: activeTab === tab.id ? terracotta : 'transparent',
                      color: activeTab === tab.id ? terracotta : '#6B7280',
                      background: activeTab === tab.id ? '#fff' : 'transparent',
                    }}
                  >
                    <span className="mr-1.5 text-[10px] opacity-50">{tab.step}</span>{tab.label}
                  </button>
                ))}
              </div>

              <div className="p-4 sm:p-5" style={{ background: 'linear-gradient(180deg, #fff 0%, #FFFCFA 100%)' }}>

                {/* Songs tab */}
                {activeTab === 'songs' && (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-sm text-gray-500">Build lyrics and notation for the selected song.</p>
                      {songs.length > 0 && (
                        <button
                          onClick={() => setShowCreateSong(value => !value)}
                          className="rounded-lg bg-[#8A2B0E] px-3 py-2 text-xs font-semibold text-white hover:bg-[#6F210A]"
                        >
                          {showCreateSong ? 'Cancel' : 'Add another song'}
                        </button>
                      )}
                    </div>
                    {(showCreateSong || songs.length === 0) && <CreateSong groupId={selectedGroup.group_id} onSongCreated={handleSongCreated} />}

                    {selectedSong && lines.length > 0 && (
                      <div className="flex justify-end">
                        <button
                          onClick={() => setPreviewMode(v => !v)}
                          className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition ${
                            previewMode
                              ? 'bg-[#8A2B0E] text-white border-[#8A2B0E]'
                              : 'bg-white text-[#8A2B0E] border-[#FFD3AC] hover:bg-[#FFF4EA]'
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
                        onSongUpdated={handleSongUpdated}
                      />
                    ) : songs.length > 0 ? (
                      <EmptyState
                        label="Songs"
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
                        label="Assign"
                        title="No song selected"
                        hint="Select a song from the bar above to manage line assignments."
                        actionLabel="Go to Songs tab to create one"
                        onAction={() => setActiveTab('songs')}
                      />
                    ) : lines.length === 0 ? (
                      <EmptyState
                        label="Lines"
                        title="No lines in this song yet"
                        hint="Add lyrics and sections in the Songs tab first."
                        actionLabel="Go to Songs tab"
                        onAction={() => setActiveTab('songs')}
                      />
                    ) : performers.length === 0 ? (
                      <EmptyState
                        label="Members"
                        title="No performers in your group"
                        hint="Invite singers and musicians in the Members tab before assigning lines."
                        actionLabel="Go to Members tab"
                        onAction={() => setActiveTab('members')}
                      />
                    ) : (
                      <div>
                        <AssignmentPanel
                          lines={lines}
                          members={members}
                          onAssignmentSaved={() => {}}
                        />
                      </div>
                    )}
                  </>
                )}

                {/* Status tab */}
                {activeTab === 'status' && (
                  <>
                    {!selectedSong ? (
                      <EmptyState
                        label="Status"
                        title="No song selected"
                        hint="Select a song from the bar above to see who has confirmed updates."
                        actionLabel="Go to Songs tab to create one"
                        onAction={() => setActiveTab('songs')}
                      />
                    ) : (
                      <div>
                        <AcknowledgmentStatus songId={selectedSong.song_id} />
                      </div>
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
