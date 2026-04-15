import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../supabase/client'
import { useAuth } from '../../context/AuthContext'

const CHANGE_LABELS = {
  assignment_changed: 'Assignment changed',
  cue_changed: 'Cue updated',
  lyric_edited: 'Lyric updated',
  note_edited: 'Notes updated',
}

function renderChangeSummary(change) {
  if (!change?.new_value) return null
  if (change.old_value) return `${change.old_value} → ${change.new_value}`
  return change.new_value
}

function ChevronDown({ className = '' }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  )
}

function songLabel(song, includeGroup = false) {
  if (!song) return ''
  return includeGroup && song.group_name ? `${song.group_name} · ${song.title}` : song.title
}

export default function PerformerSongView({ showNotation = false, onDarkDisplayChange }) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [songs, setSongs] = useState([])
  const [selectedSong, setSelectedSong] = useState(null)
  const [lines, setLines] = useState([])
  const [assignedLineIds, setAssignedLineIds] = useState(new Set())
  const [cueMap, setCueMap] = useState({})
  const [wordNotesMap, setWordNotesMap] = useState({})
  const [pendingAcks, setPendingAcks] = useState([])
  const [recentUpdates, setRecentUpdates] = useState([])
  const [collapsedSections, setCollapsedSections] = useState(new Set())
  const [fontSize, setFontSize] = useState(() => localStorage.getItem('performer_fontSize') || 'base')
  const [confirmingId, setConfirmingId] = useState(null)
  const [justConfirmedId, setJustConfirmedId] = useState(null)
  const [showHistory, setShowHistory] = useState(false)
  const [updatesCollapsed, setUpdatesCollapsed] = useState(false)
  const [yourSectionsCollapsed, setYourSectionsCollapsed] = useState(false)
  const [groupMembers, setGroupMembers] = useState([])
  const [expandedUpdateIds, setExpandedUpdateIds] = useState(new Set())
  const [showFloatingBadge, setShowFloatingBadge] = useState(false)
  const [groups, setGroups] = useState([])
  const [groupIds, setGroupIds] = useState([])
  const [selectedGroup, setSelectedGroup] = useState(null)

  // Display modes — persisted in localStorage
  const [stageMode, setStageMode] = useState(() => localStorage.getItem('performer_stageMode') === 'true')
  const [darkDisplay, setDarkDisplay] = useState(() => localStorage.getItem('performer_darkDisplay') === 'true')

  const updatesCardRef = useRef(null)
  const selectedGroupSongs = selectedGroup
    ? songs.filter(song => song.group_id === selectedGroup.group_id)
    : []

  // Persist preferences
  useEffect(() => { localStorage.setItem('performer_fontSize', fontSize) }, [fontSize])
  useEffect(() => {
    localStorage.setItem('performer_darkDisplay', darkDisplay)
    if (onDarkDisplayChange) onDarkDisplayChange(darkDisplay)
  }, [darkDisplay])
  useEffect(() => { localStorage.setItem('performer_stageMode', stageMode) }, [stageMode])

  // Notify parent of initial darkDisplay value on mount
  useEffect(() => {
    if (onDarkDisplayChange) onDarkDisplayChange(darkDisplay)
  }, [])

  // Floating badge: show when updates card is scrolled out of view
  useEffect(() => {
    if (pendingAcks.length === 0) { setShowFloatingBadge(false); return }
    function handleScroll() {
      const el = updatesCardRef.current
      if (!el) return
      setShowFloatingBadge(el.getBoundingClientRect().bottom < 0)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [pendingAcks.length])

  useEffect(() => { init() }, [])

  useEffect(() => {
    if (!selectedGroup) {
      setSelectedSong(null)
      return
    }
    setSelectedSong(current => {
      if (current?.group_id === selectedGroup.group_id) return current
      return selectedGroupSongs[0] || null
    })
  }, [selectedGroup?.group_id, songs])

  useEffect(() => {
    if (selectedSong) {
      fetchSongData(selectedSong.song_id)
      fetchRecentUpdates(selectedSong.song_id)
      fetchGroupMembers(selectedSong.group_id)
    } else {
      setLines([])
      setGroupMembers([])
    }
  }, [selectedSong])

  useEffect(() => {
    if (!user?.id) return
    const channel = supabase
      .channel(`performer-updates-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'acknowledgments', filter: `user_id=eq.${user.id}` },
        async payload => {
          const ackId = payload.new?.ack_id || payload.old?.ack_id
          await refreshPerformerUpdates(ackId)
        })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [user?.id, selectedSong?.song_id])

  // Realtime: assignment changes → update blue highlight instantly
  useEffect(() => {
    if (!user?.id) return
    const channel = supabase
      .channel(`assignments-${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'assignments', filter: `user_id=eq.${user.id}` },
        payload => {
          if (payload.new?.line_id) {
            setAssignedLineIds(prev => new Set([...prev, payload.new.line_id]))
          }
        })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'assignments' },
        async () => {
          // Re-fetch assignments for current song on any delete (line_id not always in payload without REPLICA IDENTITY FULL)
          if (selectedSong?.song_id) await fetchSongData(selectedSong.song_id)
        })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [user?.id, selectedSong?.song_id])

  useEffect(() => {
    if (groupIds.length === 0) return
    const channel = supabase
      .channel(`songs-${groupIds.join('-')}`)
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'songs' },
        payload => {
          const deletedId = payload.old?.song_id
          if (!deletedId || !groupIds.includes(payload.old?.group_id)) return
          setSongs(prev => {
            const remaining = prev.filter(s => s.song_id !== deletedId)
            setSelectedSong(sel => {
              if (sel?.song_id !== deletedId) return sel
              const next = remaining[0] || null
              if (!next) setLines([])
              return next
            })
            return remaining
          })
        })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'songs' },
        payload => {
          if (!groupIds.includes(payload.new?.group_id)) return
          const group = groups.find(g => g.group_id === payload.new.group_id)
          const nextSong = { ...payload.new, group_name: group?.name }
          setSongs(prev => [...prev, nextSong])
        })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [groupIds.join('|'), groups])

  useEffect(() => {
    if (!user?.id) return
    const intervalId = window.setInterval(() => { refreshPerformerUpdates() }, 2000)
    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') refreshPerformerUpdates()
    }
    window.addEventListener('focus', refreshPerformerUpdates)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      window.clearInterval(intervalId)
      window.removeEventListener('focus', refreshPerformerUpdates)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [user?.id, selectedSong?.song_id])

  async function init() {
    setLoading(true)
    const { data: memberships } = await supabase
      .from('group_members')
      .select('group_id, groups(group_id, name)')
      .eq('user_id', user.id)
    const ids = [...new Set((memberships || []).map(m => m.group_id).filter(Boolean))]
    if (ids.length === 0) { setLoading(false); return }
    setGroupIds(ids)

    const [{ data: groupData }, { data: songData }] = await Promise.all([
      supabase.from('groups').select('group_id, name').in('group_id', ids),
      supabase.from('songs').select('*').in('group_id', ids).order('created_at', { ascending: true }),
    ])
    const embeddedGroups = (memberships || [])
      .map(m => {
        const group = Array.isArray(m.groups) ? m.groups[0] : m.groups
        return group?.name ? { group_id: m.group_id, name: group.name } : null
      })
      .filter(Boolean)
    const groupNameByIdFromFetch = Object.fromEntries((groupData || []).map(g => [g.group_id, g.name]))
    const groupNameByIdFromMembership = Object.fromEntries(embeddedGroups.map(g => [g.group_id, g.name]))
    const loadedGroups = ids.map(group_id => ({
      group_id,
      name: groupNameByIdFromFetch[group_id] || groupNameByIdFromMembership[group_id] || 'Group'
    }))
    const groupNameById = Object.fromEntries(loadedGroups.map(g => [g.group_id, g.name]))
    const loadedSongs = (songData || []).map(song => ({ ...song, group_name: groupNameById[song.group_id] }))

    setGroups(loadedGroups)
    setSelectedGroup(loadedGroups[0] || null)
    setSongs(loadedSongs)
    setSelectedSong(loadedSongs.find(song => song.group_id === loadedGroups[0]?.group_id) || null)
    await fetchPendingAcks()
    setLoading(false)
  }

  async function fetchGroupMembers(nextGroupId) {
    if (!nextGroupId) { setGroupMembers([]); return }
    const { data } = await supabase
      .from('group_members').select('users(name)').eq('group_id', nextGroupId)
    setGroupMembers(data || [])
  }

  async function fetchSongData(songId) {
    const { data: lineData } = await supabase
      .from('lines').select('*').eq('song_id', songId).order('line_number', { ascending: true })
    if (!lineData) return
    setLines(lineData)
    const lineIds = lineData.map(l => l.line_id)
    const [{ data: assignData }, { data: cueData }, { data: noteData }] = await Promise.all([
      supabase.from('assignments').select('line_id').eq('user_id', user.id).in('line_id', lineIds),
      supabase.from('cues').select('line_id, cue_text').eq('user_id', user.id).in('line_id', lineIds),
      supabase.from('word_notes').select('line_id, word_index, note_text').in('line_id', lineIds),
    ])
    setAssignedLineIds(new Set((assignData || []).map(a => a.line_id)))
    setCueMap(Object.fromEntries((cueData || []).map(c => [c.line_id, c.cue_text])))
    const notesMap = {}
    for (const row of noteData || []) {
      if (!notesMap[row.line_id]) notesMap[row.line_id] = {}
      notesMap[row.line_id][row.word_index] = row.note_text
    }
    setWordNotesMap(notesMap)
  }

  async function fetchPendingAcks() {
    const { data } = await supabase
      .from('acknowledgments')
      .select(`ack_id, confirmed, change_log ( change_id, change_type, old_value, new_value, changed_at, line_id, lines ( lyric_text, section_label, song_id ) )`)
      .eq('user_id', user.id).eq('confirmed', false).order('ack_id', { ascending: false })
    setPendingAcks(data || [])
    return data || []
  }

  async function fetchRecentUpdates(songId) {
    const { data } = await supabase
      .from('acknowledgments')
      .select(`ack_id, confirmed, confirmed_at, change_log ( change_id, change_type, old_value, new_value, changed_at, line_id, lines ( lyric_text, section_label, song_id ) )`)
      .eq('user_id', user.id).order('confirmed_at', { ascending: false, nullsFirst: false }).limit(8)
    setRecentUpdates((data || []).filter(ack => ack.change_log?.lines?.song_id === songId))
  }

  async function fetchAckById(ackId) {
    const { data } = await supabase
      .from('acknowledgments')
      .select(`ack_id, confirmed, confirmed_at, change_log ( change_id, change_type, old_value, new_value, changed_at, line_id, lines ( lyric_text, section_label, song_id ) )`)
      .eq('ack_id', ackId).single()
    return data || null
  }

  async function refreshPerformerUpdates(ackId = null) {
    const ack = ackId ? await fetchAckById(ackId) : null
    const changedSongId = ack?.change_log?.lines?.song_id
    const changedLineId = ack?.change_log?.line_id
    await fetchPendingAcks()
    if (selectedSong?.song_id) await fetchRecentUpdates(selectedSong.song_id)
    const shouldRefreshSong = selectedSong?.song_id &&
      (changedSongId === selectedSong.song_id || lines.some(l => l.line_id === changedLineId))
    if (shouldRefreshSong) await fetchSongData(selectedSong.song_id)
  }

  async function confirmAck(ackId) {
    setConfirmingId(ackId)
    await supabase.from('acknowledgments')
      .update({ confirmed: true, confirmed_at: new Date().toISOString() }).eq('ack_id', ackId)
    setConfirmingId(null)
    setJustConfirmedId(ackId)
    // Refresh assignments immediately so the blue highlight updates right away
    if (selectedSong) await fetchSongData(selectedSong.song_id)
    setTimeout(async () => {
      setJustConfirmedId(null)
      await fetchPendingAcks()
      if (selectedSong) await fetchRecentUpdates(selectedSong.song_id)
    }, 1500)
  }

  async function confirmAllAcks() {
    const ids = pendingAcks.map(a => a.ack_id)
    if (!ids.length) return
    await supabase.from('acknowledgments')
      .update({ confirmed: true, confirmed_at: new Date().toISOString() }).in('ack_id', ids)
    await fetchPendingAcks()
    if (selectedSong) await fetchRecentUpdates(selectedSong.song_id)
  }

  function toggleSection(label) {
    setCollapsedSections(prev => {
      const next = new Set(prev)
      next.has(label) ? next.delete(label) : next.add(label)
      return next
    })
  }

  function scrollToLine(lineId) {
    const line = lines.find(l => l.line_id === lineId)
    if (!line) return
    const sectionLabel = line.section_label || 'General'
    setCollapsedSections(prev => { const next = new Set(prev); next.delete(sectionLabel); return next })
    setTimeout(() => {
      document.getElementById(`line-${lineId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 60)
  }

  function scrollToSection(label) {
    setCollapsedSections(prev => { const next = new Set(prev); next.delete(label); return next })
    setTimeout(() => {
      document.getElementById(`section-${label.replace(/\s+/g, '-').toLowerCase()}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 60)
  }

  function goToNextAssignedLine() {
    const assignedLines = lines.filter(l => assignedLineIds.has(l.line_id))
    if (!assignedLines.length) return
    const viewportMid = window.scrollY + window.innerHeight / 2
    let target = null
    for (const line of assignedLines) {
      const el = document.getElementById(`line-${line.line_id}`)
      if (el) {
        const absTop = el.getBoundingClientRect().top + window.scrollY
        if (absTop > viewportMid) { target = line; break }
      }
    }
    if (!target) target = assignedLines[0]
    if (target) scrollToLine(target.line_id)
  }

  function toggleUpdateExpanded(ackId) {
    setExpandedUpdateIds(prev => {
      const next = new Set(prev)
      next.has(ackId) ? next.delete(ackId) : next.add(ackId)
      return next
    })
  }

  const sections = lines.reduce((acc, line) => {
    const s = line.section_label || 'General'
    if (!acc[s]) acc[s] = []
    acc[s].push(line)
    return acc
  }, {})

  const mySections = [...new Set(
    lines.filter(l => assignedLineIds.has(l.line_id)).map(l => l.section_label || 'General')
  )]

  // First assigned line text per section (for preview in Your Sections)
  const sectionPreviewText = {}
  for (const section of mySections) {
    const firstLine = lines.find(l => (l.section_label || 'General') === section && assignedLineIds.has(l.line_id))
    if (firstLine) {
      const words = firstLine.lyric_text.split(' ')
      sectionPreviewText[section] = words.slice(0, 5).join(' ') + (words.length > 5 ? '…' : '')
    }
  }

  // Stage mode enforces minimum 'base' font size
  const effectiveFontSize = stageMode && fontSize === 'sm' ? 'base' : fontSize
  const fontSizeClass = { sm: 'text-sm', base: 'text-base', lg: 'text-lg' }[effectiveFontSize]
  const notesSizeClass = { sm: 'text-base', base: 'text-lg', lg: 'text-xl' }[effectiveFontSize]

  const memberNames = groupMembers.map(m => m.users?.name).filter(Boolean).join(', ')
  const hasUpdates = pendingAcks.length > 0 || recentUpdates.length > 0
  const hasAssignedLines = assignedLineIds.size > 0

  // Dark display theme tokens
  const dk = darkDisplay
  const card = dk ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
  const cardBorder = dk ? 'border-gray-700' : 'border-gray-100'
  const headingText = dk ? 'text-gray-100' : 'text-gray-900'
  const subText = dk ? 'text-gray-400' : 'text-gray-500'
  const mutedText = dk ? 'text-gray-500' : 'text-gray-400'
  const sectionHover = dk ? 'hover:bg-gray-800' : 'hover:bg-gray-50'
  const assignedLineBg = dk ? 'bg-[#4D3342]' : 'bg-[#FFF4EA]'
  const assignedLineText = dk ? 'text-[#FFD3AC] font-medium' : 'text-[#8A2B0E] font-medium'
  const unassignedLineText = dk ? 'text-gray-500' : 'text-gray-400'
  const stageUnassignedLineText = dk ? 'text-gray-700' : 'text-gray-300'
  const cueBg = dk ? 'bg-white border-white' : 'bg-black border-black'
  const cueText = dk ? 'text-gray-900' : 'text-white'
  const selectorShellClass = 'border-[#F0D7C8] bg-[#FFF9F5]'
  const selectorDividerClass = 'border-[#F0D7C8]'
  const selectorLabelClass = 'text-[#8A2B0E]'
  const groupActiveClass = 'border-[#8A2B0E] bg-[#8A2B0E] text-white shadow-sm'
  const groupIdleClass = 'border-[#F0D7C8] bg-white text-gray-600 hover:border-[#8A2B0E] hover:text-[#8A2B0E]'
  const songSelectClass = 'bg-white border-[#F0D7C8] text-gray-900 focus:ring-[#FFD3AC] focus:border-[#8A2B0E]'
  const rehearsalPanelClass = 'border-[#F0D7C8] bg-white'
  const sectionCountBadgeClass = dk
    ? 'bg-[#4D3342] text-[#FFD3AC] border border-[#FFD3AC]/20'
    : 'bg-[#FFF4EA] text-[#8A2B0E] border border-[#F0D7C8]'
  const updatesCardClass = dk ? card : 'bg-[#FFF9F5] border-[#F0D7C8]'
  const updatesBorderClass = dk ? cardBorder : 'border-[#F3E4DC]'
  const updatesRowClass = dk ? 'hover:bg-gray-800/50' : 'bg-white hover:bg-[#FFF4EA]'
  const updatesActiveTabClass = dk ? 'bg-[#FFD3AC] text-[#8A2B0E]' : 'bg-[#8A2B0E] text-white'
  const updatesIdleTabClass = dk ? 'bg-gray-800 text-gray-400 hover:text-gray-200' : 'bg-white text-gray-500 hover:text-[#8A2B0E]'

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-6 h-6 border-2 border-[#E35336] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (songs.length === 0) {
    return (
      <div className={`rounded-3xl border p-8 text-center shadow-sm ${dk ? 'bg-gray-900 border-gray-700' : 'bg-white border-orange-100'}`}>
        {groups.length > 1 && (
          <div className="mb-5 flex flex-wrap justify-center gap-2">
            {groups.map(group => (
              <button
                key={group.group_id}
                onClick={() => setSelectedGroup(group)}
                className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${selectedGroup?.group_id === group.group_id
                  ? 'border-[#8A2B0E] bg-[#8A2B0E] text-white'
                  : dk ? 'border-gray-700 bg-gray-800 text-gray-300' : 'border-gray-200 bg-gray-50 text-gray-600'}`}
              >
                {group.name}
              </button>
            ))}
          </div>
        )}
        <p className="text-sm text-gray-400">No songs in your groups yet. Check back once your manager adds some.</p>
      </div>
    )
  }

  return (
    <div className={`space-y-4 transition-colors duration-200 ${dk ? 'bg-gray-950 p-3 sm:p-4 rounded-3xl' : ''}`}>

      {/* Group and song selectors */}
      {!stageMode && (
        <div className={`rounded-2xl border px-3 pb-3 pt-4 shadow-sm ${dk ? 'bg-gray-900 border-gray-700' : 'bg-white border-[#F0D7C8]'}`}>
          <div className={`grid overflow-hidden rounded-xl border lg:grid-cols-[minmax(0,0.95fr)_minmax(280px,0.9fr)] ${selectorShellClass}`}>
            <div className="divide-y divide-[#F0D7C8]">
              <div className="flex flex-col gap-2 px-4 pb-3 pt-4 sm:flex-row sm:items-center sm:gap-4">
                <p className={`text-[11px] font-bold uppercase tracking-[0.14em] ${selectorLabelClass}`}>
                  Group
                </p>
                <div className="flex flex-wrap gap-2">
                  {groups.map(group => (
                    <button
                      key={group.group_id}
                      onClick={() => setSelectedGroup(group)}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${selectedGroup?.group_id === group.group_id
                        ? groupActiveClass
                        : groupIdleClass}`}
                    >
                      {group.name}
                    </button>
                  ))}
                </div>
              </div>
              <div className={`flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:gap-4 ${selectorDividerClass}`}>
                <p className={`text-[11px] font-bold uppercase tracking-[0.14em] ${selectorLabelClass}`}>Song</p>
                {selectedGroupSongs.length > 0 ? (
                  <div className="relative flex-1">
                    <select
                      value={selectedSong?.song_id || ''}
                      onChange={e => setSelectedSong(selectedGroupSongs.find(s => s.song_id === e.target.value))}
                      className={`w-full appearance-none rounded-lg border px-3 py-2 pr-8 text-sm font-semibold cursor-pointer focus:outline-none focus:ring-2 ${songSelectClass}`}
                    >
                      {selectedGroupSongs.map(s => <option key={s.song_id} value={s.song_id}>{s.title}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-gray-400" />
                  </div>
                ) : (
                  <p className="rounded-lg border border-[#F0D7C8] bg-white px-3 py-2 text-sm text-gray-500">
                    No songs in this group yet.
                  </p>
                )}
              </div>
            </div>

            <div className={`border-t px-4 py-3 lg:border-l lg:border-t-0 ${rehearsalPanelClass}`}>
              <div className="flex h-full flex-col justify-center gap-2">
                <div>
                  <p className={`text-[11px] font-bold uppercase tracking-[0.14em] ${selectorLabelClass}`}>Current rehearsal</p>
                  <h2 className="mt-1 text-xl font-semibold text-gray-950">
                    {selectedSong ? selectedSong.title : 'Select a song'}
                  </h2>
                </div>
                {selectedSong && (
                  <div className="flex flex-wrap gap-2">
                    {selectedSong.bpm && (
                      <span className="rounded-full border border-[#FFD3AC]/20 bg-[#8A2B0E] px-3 py-1 text-xs font-semibold text-white">
                        BPM {selectedSong.bpm}
                      </span>
                    )}
                    {selectedSong.scale && (
                      <span className="rounded-full border border-[#FFD3AC]/20 bg-[#8A2B0E] px-3 py-1 text-xs font-semibold text-white">
                        Scale {selectedSong.scale}
                      </span>
                    )}
                  </div>
                )}
                {memberNames && <p className="text-xs text-gray-500">Group members: {memberNames}</p>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stage mode header — song title + next line btn + exit btn */}
      {stageMode && (
        <div className="flex items-center justify-between px-1 gap-2">
          <h1 className={`text-xl font-bold ${headingText}`}>{songLabel(selectedSong, groups.length > 1)}</h1>
          <div className="flex items-center gap-2 shrink-0">
            {assignedLineIds.size > 0 && (
              <button
                onClick={goToNextAssignedLine}
                className="text-xs font-semibold px-3 py-2.5 rounded-lg bg-[#8A2B0E] text-white hover:bg-[#6F220B] transition min-h-[44px]"
              >
                Next Line →
              </button>
            )}
            <button
              onClick={() => setStageMode(false)}
              className="text-xs font-medium px-3 py-2.5 rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600 transition min-h-[44px]"
            >
              Exit Stage
            </button>
          </div>
        </div>
      )}

      {/* Updates card — hidden in stage mode */}
      {hasUpdates && !stageMode && (
        <div ref={updatesCardRef} className={`rounded-2xl border overflow-hidden shadow-sm ${updatesCardClass}`}>
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`text-sm font-semibold ${headingText}`}>Updates</span>
              {pendingAcks.length > 0 && (
                <span className="bg-[#E35336] text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                  {pendingAcks.length}
                </span>
              )}
            </div>
            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={() => setShowHistory(false)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${!showHistory ? updatesActiveTabClass : updatesIdleTabClass}`}
              >
                Pending{pendingAcks.length > 0 ? ` (${pendingAcks.length})` : ''}
              </button>
              <button
                onClick={() => setShowHistory(true)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${showHistory ? updatesActiveTabClass : updatesIdleTabClass}`}
              >
                History
              </button>
              <button onClick={() => setUpdatesCollapsed(v => !v)} className={`${mutedText} hover:text-gray-600 transition p-2`}>
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${updatesCollapsed ? '' : 'rotate-180'}`} />
              </button>
            </div>
          </div>

          {!updatesCollapsed && (
            <>
              {!showHistory && (
                <div>
                  {pendingAcks.length === 0 ? (
                    <p className={`text-xs px-4 py-3 ${mutedText}`}>No pending updates.</p>
                  ) : (
                    pendingAcks.map(ack => {
                      const change = ack.change_log
                      const isJustConfirmed = justConfirmedId === ack.ack_id
                      const isExpanded = expandedUpdateIds.has(ack.ack_id)
                      const displayText = renderChangeSummary(change) || CHANGE_LABELS[change?.change_type] || change?.change_type
                      return (
                        <div key={ack.ack_id} className={`flex items-center gap-3 px-4 py-2.5 border-b ${updatesBorderClass} last:border-b-0 transition-colors duration-300 ${isJustConfirmed ? 'bg-green-50' : updatesRowClass}`}>
                          <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${isJustConfirmed ? 'bg-green-500' : 'bg-[#E35336]'}`} />
                          <button
                            onClick={() => toggleUpdateExpanded(ack.ack_id)}
                            className={`flex-1 min-w-0 text-sm text-left leading-5 break-words ${isExpanded ? '' : 'line-clamp-2'} ${dk ? 'text-gray-200' : 'text-gray-800'}`}
                          >
                            {displayText}
                          </button>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => scrollToLine(change?.line_id)}
                              className={`${mutedText} hover:text-gray-600 p-1.5 rounded-lg transition min-h-[30px] min-w-[30px] flex items-center justify-center`}
                              title="Jump to line"
                            >
                              <SearchIcon />
                            </button>
                            {isJustConfirmed ? (
                              <span className="text-xs font-semibold text-green-600 bg-green-100 px-2.5 py-1.5 rounded-lg">Confirmed!</span>
                            ) : (
                              <button
                                onClick={() => confirmAck(ack.ack_id)}
                                disabled={confirmingId === ack.ack_id}
                                className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition disabled:opacity-40 min-h-[30px] ${dk ? 'bg-emerald-600 text-white hover:bg-emerald-500' : 'bg-emerald-700 text-white hover:bg-emerald-800'}`}
                              >
                                {confirmingId === ack.ack_id ? '...' : 'Confirm'}
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              )}

              {showHistory && (
                <div>
                  {recentUpdates.length === 0 ? (
                    <p className={`text-xs px-4 py-3 ${mutedText}`}>No confirmed updates yet.</p>
                  ) : (
                    recentUpdates.map(ack => {
                      const change = ack.change_log
                      const isExpanded = expandedUpdateIds.has(ack.ack_id)
                      const displayText = renderChangeSummary(change) || CHANGE_LABELS[change?.change_type] || change?.change_type
                      return (
                        <div key={ack.ack_id} className={`flex items-center gap-3 px-4 py-2.5 border-b ${updatesBorderClass} last:border-b-0 ${updatesRowClass}`}>
                          <div className="h-2.5 w-2.5 rounded-full bg-[#C9B8AE] shrink-0" />
                          <button
                            onClick={() => toggleUpdateExpanded(ack.ack_id)}
                            className={`flex-1 min-w-0 text-sm text-left leading-5 break-words ${isExpanded ? '' : 'line-clamp-2'} ${dk ? 'text-gray-300' : 'text-gray-700'}`}
                          >
                            {displayText}
                          </button>
                          <button
                            onClick={() => scrollToLine(change?.line_id)}
                            className={`${mutedText} hover:text-gray-600 p-1.5 rounded-lg transition min-h-[30px] min-w-[30px] flex items-center justify-center`}
                            title="Jump to line"
                          >
                            <SearchIcon />
                          </button>
                        </div>
                      )
                    })
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Your Sections card — hidden in stage mode */}
      {mySections.length > 0 && !stageMode && (
        <div className={`rounded-2xl border overflow-hidden ${card}`}>
          <button onClick={() => setYourSectionsCollapsed(v => !v)} className="w-full flex items-center justify-between px-4 py-3 min-h-[44px]">
            <div className="flex items-center gap-2">
              <span className={`text-sm font-semibold ${headingText}`}>Your Sections</span>
              <span className={`text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 ${sectionCountBadgeClass}`}>
                {mySections.length}
              </span>
            </div>
            <ChevronDown className={`w-4 h-4 ${mutedText} transition-transform duration-200 ${yourSectionsCollapsed ? '' : 'rotate-180'}`} />
          </button>
          {!yourSectionsCollapsed && (
            <div className={`border-t ${cardBorder} px-4 py-3 space-y-2`}>
              {mySections.map(section => {
                const count = lines.filter(l => (l.section_label || 'General') === section && assignedLineIds.has(l.line_id)).length
                const preview = sectionPreviewText[section]
                return (
                  <button
                    key={section}
                    onClick={() => scrollToSection(section)}
                    className={`w-full text-left rounded-xl px-3 py-2.5 transition min-h-[44px] ${dk ? 'bg-[#4D3342] hover:bg-[#5B3C4D] active:bg-[#684557]' : 'bg-[#FFF4EA] hover:bg-[#FFD3AC] active:bg-[#F7BE96]'}`}
                  >
                    <p className={`text-xs font-semibold ${dk ? 'text-[#FFD3AC]' : 'text-[#8A2B0E]'}`}>
                      {section}
                      <span className={`font-normal ml-1 ${dk ? 'text-[#FFD3AC]/80' : 'text-[#8A2B0E]/70'}`}>
                        — {count} line{count !== 1 ? 's' : ''}
                      </span>
                    </p>
                    {preview && (
                      <p className={`text-xs mt-0.5 italic ${dk ? 'text-gray-400' : 'text-gray-500'}`}>"{preview}"</p>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Controls bar — sticky */}
      <div className={`sticky top-[64px] z-30 rounded-2xl border px-4 py-3 flex items-center gap-3 flex-wrap shadow-sm backdrop-blur ${card}`}>
        <span className={`text-xs font-semibold ${subText}`}>Controls</span>

        {/* Stage mode toggle */}
        <button
          onClick={() => setStageMode(v => !v)}
          className={`text-xs font-semibold px-3 py-2.5 rounded-lg transition min-h-[44px] ${
            stageMode
              ? 'bg-[#8A2B0E] text-white hover:bg-[#6F220B]'
              : dk ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {stageMode ? '⚡ Exit Stage' : 'Enter Stage Mode'}
        </button>

        {/* Light / dark display */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setDarkDisplay(false)}
            title="Light display"
            className={`w-8 h-8 rounded-full border-2 transition bg-white ${!dk ? 'border-[#8A2B0E]' : 'border-gray-500 hover:border-gray-400'}`}
          />
          <button
            onClick={() => setDarkDisplay(true)}
            title="Dark display"
            className={`w-8 h-8 rounded-full border-2 transition bg-gray-900 ${dk ? 'border-[#FFD3AC]' : 'border-gray-400 hover:border-gray-300'}`}
          />
        </div>

        {/* Song picker in controls (when multiple songs in the selected group) */}
        {selectedGroupSongs.length > 1 && (
          <div className="relative">
            <select
              value={selectedSong?.song_id || ''}
              onChange={e => setSelectedSong(selectedGroupSongs.find(s => s.song_id === e.target.value))}
              className={`text-xs border-2 rounded-lg pl-2 pr-6 py-2.5 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#FFD3AC] min-h-[44px] ${dk ? 'bg-gray-800 border-gray-600 text-gray-200 hover:border-gray-500' : 'bg-white border-gray-300 text-gray-700 hover:border-[#8A2B0E]'}`}
            >
              {selectedGroupSongs.map(s => <option key={s.song_id} value={s.song_id}>{s.title}</option>)}
            </select>
            <ChevronDown className={`absolute right-1.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none ${subText}`} />
          </div>
        )}

        {/* Font size */}
        <div className="flex items-center gap-1 ml-auto">
          <button
            onClick={() => setFontSize(prev => prev === 'lg' ? 'base' : 'sm')}
            className={`font-semibold border-2 rounded-lg px-3 py-2 transition min-h-[44px] min-w-[44px] text-sm ${dk ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-600 hover:bg-gray-100'}`}
          >
            A−
          </button>
          <button
            onClick={() => setFontSize(prev => prev === 'sm' ? 'base' : 'lg')}
            className={`font-semibold border-2 rounded-lg px-3 py-2 transition min-h-[44px] min-w-[44px] text-sm ${dk ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-600 hover:bg-gray-100'}`}
          >
            A+
          </button>
        </div>
      </div>

      {/* Song sections */}
      {selectedSong && Object.keys(sections).length === 0 && (
        <p className={`text-sm px-1 ${mutedText}`}>This song has no lines yet.</p>
      )}

      {stageMode && selectedSong && lines.length > 0 && !hasAssignedLines && (
        <div className={`rounded-2xl border px-4 py-3 ${dk ? 'bg-amber-900/20 border-amber-800 text-amber-200' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
          <p className="text-sm font-semibold">No lines assigned.</p>
        </div>
      )}

      {Object.entries(sections).map(([sectionLabel, sectionLines]) => {
        const isCollapsed = collapsedSections.has(sectionLabel)
        const hasAssignedInSection = sectionLines.some(l => assignedLineIds.has(l.line_id))

        // In stage mode, hide sections with no assigned lines entirely
        if (stageMode && hasAssignedLines && !hasAssignedInSection) return null

        return (
          <div
            key={sectionLabel}
            id={`section-${sectionLabel.replace(/\s+/g, '-').toLowerCase()}`}
            className={`rounded-2xl border overflow-hidden ${card}`}
          >
            <button
              onClick={() => toggleSection(sectionLabel)}
              className={`w-full flex items-center gap-2 px-4 py-3 text-left transition min-h-[44px] ${sectionHover}`}
            >
              <svg
                className={`w-3 h-3 shrink-0 transition-transform duration-150 ${subText} ${isCollapsed ? '' : 'rotate-90'}`}
                fill="currentColor" viewBox="0 0 24 24"
              >
                <path d="M8 5l8 7-8 7V5z" />
              </svg>
              <span className={`text-sm font-semibold ${headingText}`}>{sectionLabel}</span>
              {stageMode && hasAssignedInSection && (
                <span className="ml-auto text-[10px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full">Your lines</span>
              )}
            </button>

            {!isCollapsed && (
              <div className={`border-t ${cardBorder}`}>
                {sectionLines.map(line => {
                  const isAssigned = assignedLineIds.has(line.line_id)
                  const cue = cueMap[line.line_id]
                  const lineTextClass = isAssigned
                    ? assignedLineText
                    : stageMode
                      ? stageUnassignedLineText
                      : unassignedLineText

                  return (
                    <div
                      key={line.line_id}
                      className={stageMode && hasAssignedLines && !isAssigned ? 'opacity-45' : ''}
                    >
                      {cue && (
                        <div className={`border-b px-4 py-2 ${cueBg}`}>
                          <div className="flex items-start gap-3">
                            <span className={`shrink-0 rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${dk ? 'bg-gray-900 text-white' : 'bg-white text-gray-950'}`}>
                              Cue
                            </span>
                            <span className={`text-sm font-semibold leading-5 ${cueText}`}>{cue}</span>
                          </div>
                        </div>
                      )}
                      <div
                        id={`line-${line.line_id}`}
                        className={`px-4 py-2.5 border-b ${cardBorder} last:border-b-0 ${isAssigned ? assignedLineBg : ''}`}
                      >
                        {!line.lyric_text?.trim() ? (
                          /* Instrumental / BGM line */
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${dk ? 'bg-teal-900/40 text-teal-400' : 'bg-teal-50 text-teal-600'}`}>
                              Instrumental
                            </span>
                            {line.notation_text && (
                              <span className={`${notesSizeClass} font-mono font-semibold ${dk ? 'text-teal-400' : 'text-teal-700'}`}>
                                {line.notation_text}
                              </span>
                            )}
                          </div>
                        ) : showNotation ? (
                          <div className="flex flex-wrap items-end gap-x-1.5 gap-y-3">
                            {line.lyric_text.split(' ').map((word, index) => {
                              const note = wordNotesMap[line.line_id]?.[index]
                              return (
                                <span key={index} className="flex flex-col items-center">
                                  <span className={`${notesSizeClass} font-mono font-semibold ${dk ? 'text-teal-400' : 'text-teal-600'} mb-0.5 ${note ? '' : 'opacity-0 select-none pointer-events-none'}`}>
                                    {note || '.'}
                                  </span>
                                  <span className={`${fontSizeClass} ${lineTextClass}`}>
                                    {word}
                                  </span>
                                </span>
                              )
                            })}
                          </div>
                        ) : (
                          <p className={`${fontSizeClass} ${lineTextClass}`}>
                            {line.lyric_text}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}

      {/* Floating pending updates badge */}
      {showFloatingBadge && pendingAcks.length > 0 && (
        <button
          onClick={() => {
            setUpdatesCollapsed(false)
            updatesCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-red-500 text-white text-xs font-bold px-4 py-3 rounded-full shadow-lg hover:bg-red-600 active:bg-red-700 transition"
        >
          <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
          {pendingAcks.length} pending update{pendingAcks.length !== 1 ? 's' : ''}
        </button>
      )}
    </div>
  )
}
