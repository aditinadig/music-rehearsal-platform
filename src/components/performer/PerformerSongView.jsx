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
  const [groupId, setGroupId] = useState(null)

  // Display modes — persisted in localStorage
  const [stageMode, setStageMode] = useState(() => localStorage.getItem('performer_stageMode') === 'true')
  const [darkDisplay, setDarkDisplay] = useState(() => localStorage.getItem('performer_darkDisplay') === 'true')

  const updatesCardRef = useRef(null)

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
    if (selectedSong) {
      fetchSongData(selectedSong.song_id)
      fetchRecentUpdates(selectedSong.song_id)
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

  useEffect(() => {
    if (!groupId) return
    const channel = supabase
      .channel(`songs-${groupId}`)
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'songs' },
        payload => {
          const deletedId = payload.old?.song_id
          if (!deletedId) return
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
          if (payload.new?.group_id !== groupId) return
          setSongs(prev => [...prev, payload.new])
        })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [groupId])

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
    const { data: membership } = await supabase
      .from('group_members').select('group_id').eq('user_id', user.id).single()
    if (!membership) { setLoading(false); return }
    setGroupId(membership.group_id)

    const [{ data: songData }, { data: memberData }] = await Promise.all([
      supabase.from('songs').select('*').eq('group_id', membership.group_id).order('created_at', { ascending: true }),
      supabase.from('group_members').select('users(name)').eq('group_id', membership.group_id),
    ])

    if (songData?.length) { setSongs(songData); setSelectedSong(songData[0]) }
    setGroupMembers(memberData || [])
    await fetchPendingAcks()
    setLoading(false)
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

  // Dark display theme tokens
  const dk = darkDisplay
  const card = dk ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
  const cardBorder = dk ? 'border-gray-700' : 'border-gray-100'
  const headingText = dk ? 'text-gray-100' : 'text-gray-900'
  const subText = dk ? 'text-gray-400' : 'text-gray-500'
  const mutedText = dk ? 'text-gray-500' : 'text-gray-400'
  const sectionHover = dk ? 'hover:bg-gray-800' : 'hover:bg-gray-50'
  const assignedLineBg = dk ? 'bg-blue-900/40' : 'bg-blue-50'
  const assignedLineText = dk ? 'text-blue-300 font-medium' : 'text-blue-900 font-medium'
  const unassignedLineText = dk ? 'text-gray-600' : 'text-gray-500'
  const cueBg = dk ? 'bg-amber-900/30 border-amber-800' : 'bg-amber-50 border-amber-100'
  const cueText = dk ? 'text-amber-400' : 'text-amber-800'

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-6 h-6 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (songs.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
        <p className="text-sm text-gray-400">No songs in your group yet. Check back once your manager adds some.</p>
      </div>
    )
  }

  return (
    <div className={`space-y-3 transition-colors duration-200 ${dk ? 'bg-gray-950 p-3 sm:p-4 rounded-3xl' : ''}`}>

      {/* Song title + performers */}
      {!stageMode && (
        <div className="px-1 pb-1">
          {songs.length > 1 ? (
            <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border ${dk ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'}`}>
              <svg className={`w-3.5 h-3.5 shrink-0 ${mutedText}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
              <div className="relative">
                <select
                  value={selectedSong?.song_id || ''}
                  onChange={e => setSelectedSong(songs.find(s => s.song_id === e.target.value))}
                  className={`appearance-none text-sm font-semibold pr-5 bg-transparent border-none cursor-pointer focus:outline-none ${headingText}`}
                >
                  {songs.map(s => <option key={s.song_id} value={s.song_id}>{s.title}</option>)}
                </select>
                <ChevronDown className={`absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none ${mutedText}`} />
              </div>
            </div>
          ) : (
            <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border ${dk ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'}`}>
              <svg className={`w-3.5 h-3.5 shrink-0 ${mutedText}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
              <span className={`text-sm font-semibold ${headingText}`}>{selectedSong?.title}</span>
            </div>
          )}
          {memberNames && <p className={`text-xs mt-1.5 pl-1 ${mutedText}`}>{memberNames}</p>}
        </div>
      )}

      {/* Stage mode header — song title + next line btn + exit btn */}
      {stageMode && (
        <div className="flex items-center justify-between px-1 gap-2">
          <h1 className={`text-xl font-bold ${headingText}`}>{selectedSong?.title}</h1>
          <div className="flex items-center gap-2 shrink-0">
            {assignedLineIds.size > 0 && (
              <button
                onClick={goToNextAssignedLine}
                className="text-xs font-semibold px-3 py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 transition min-h-[44px]"
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
        <div ref={updatesCardRef} className={`rounded-2xl border overflow-hidden ${card}`}>
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2">
              <span className={`text-sm font-semibold ${headingText}`}>Updates</span>
              {pendingAcks.length > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                  {pendingAcks.length}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {!showHistory && pendingAcks.length > 1 && (
                <button onClick={confirmAllAcks} className="text-xs font-medium text-white bg-green-500 hover:bg-green-600 px-3 py-2 rounded-lg transition min-h-[40px]">
                  Confirm All
                </button>
              )}
              <button onClick={() => setUpdatesCollapsed(v => !v)} className={`${mutedText} hover:text-gray-600 transition p-2`}>
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${updatesCollapsed ? '' : 'rotate-180'}`} />
              </button>
            </div>
          </div>

          {!updatesCollapsed && (
            <>
              {/* Pending / History tabs */}
              <div className={`flex border-b ${cardBorder}`}>
                <button
                  onClick={() => setShowHistory(false)}
                  className={`flex-1 py-2.5 text-xs font-semibold transition border-b-2 -mb-px ${!showHistory
                    ? (dk ? 'border-blue-400 text-blue-400' : 'border-violet-600 text-violet-600')
                    : `border-transparent ${mutedText} hover:${dk ? 'text-gray-400' : 'text-gray-600'}`}`}
                >
                  Pending{pendingAcks.length > 0 ? ` (${pendingAcks.length})` : ''}
                </button>
                <button
                  onClick={() => setShowHistory(true)}
                  className={`flex-1 py-2.5 text-xs font-semibold transition border-b-2 -mb-px ${showHistory
                    ? (dk ? 'border-blue-400 text-blue-400' : 'border-violet-600 text-violet-600')
                    : `border-transparent ${mutedText} hover:${dk ? 'text-gray-400' : 'text-gray-600'}`}`}
                >
                  History
                </button>
              </div>

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
                        <div key={ack.ack_id} className={`flex items-start gap-3 px-4 py-3 border-b ${cardBorder} last:border-b-0 transition-colors duration-300 ${isJustConfirmed ? 'bg-green-50' : ''}`}>
                          <div className={`w-1 self-stretch rounded-full shrink-0 mt-1 ${isJustConfirmed ? 'bg-green-400' : 'bg-red-400'}`} />
                          <button
                            onClick={() => toggleUpdateExpanded(ack.ack_id)}
                            className={`flex-1 min-w-0 text-sm text-left break-words ${isExpanded ? '' : 'line-clamp-2'} ${dk ? 'text-gray-200' : 'text-gray-800'}`}
                          >
                            {displayText}
                          </button>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => scrollToLine(change?.line_id)}
                              className={`${mutedText} hover:text-gray-600 p-2 rounded-lg transition min-h-[44px] min-w-[44px] flex items-center justify-center`}
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
                                className={`text-xs font-semibold px-3 py-2.5 rounded-lg transition disabled:opacity-40 min-h-[44px] ${dk ? 'bg-gray-700 border border-gray-600 text-gray-200 hover:bg-gray-600' : 'bg-gray-100 border-2 border-gray-300 text-gray-700 hover:bg-gray-200'}`}
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
                        <div key={ack.ack_id} className={`flex items-start gap-3 px-4 py-3 border-b ${cardBorder} last:border-b-0`}>
                          <div className="w-1 self-stretch bg-blue-300 rounded-full shrink-0 mt-1" />
                          <button
                            onClick={() => toggleUpdateExpanded(ack.ack_id)}
                            className={`flex-1 min-w-0 text-sm text-left break-words ${isExpanded ? '' : 'line-clamp-2'} ${dk ? 'text-gray-300' : 'text-gray-700'}`}
                          >
                            {displayText}
                          </button>
                          <button
                            onClick={() => scrollToLine(change?.line_id)}
                            className={`${mutedText} hover:text-gray-600 p-2 rounded-lg transition min-h-[44px] min-w-[44px] flex items-center justify-center`}
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
              <span className="bg-blue-100 text-blue-700 text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
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
                    className={`w-full text-left rounded-xl px-3 py-2.5 transition min-h-[44px] ${dk ? 'bg-blue-900/30 hover:bg-blue-900/50 active:bg-blue-900/70' : 'bg-blue-50 hover:bg-blue-100 active:bg-blue-200'}`}
                  >
                    <p className={`text-xs font-semibold ${dk ? 'text-blue-300' : 'text-blue-800'}`}>
                      {section}
                      <span className={`font-normal ml-1 ${dk ? 'text-blue-400' : 'text-blue-500'}`}>
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
      <div className={`sticky top-0 z-20 rounded-2xl border px-4 py-3 flex items-center gap-3 flex-wrap ${card}`}>
        <span className={`text-xs font-semibold ${subText}`}>Controls</span>

        {/* Stage mode toggle */}
        <button
          onClick={() => setStageMode(v => !v)}
          className={`text-xs font-semibold px-3 py-2.5 rounded-lg transition min-h-[44px] ${
            stageMode
              ? 'bg-amber-500 text-white hover:bg-amber-600'
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
            className={`w-8 h-8 rounded-full border-2 transition bg-white ${!dk ? 'border-violet-500' : 'border-gray-500 hover:border-gray-400'}`}
          />
          <button
            onClick={() => setDarkDisplay(true)}
            title="Dark display"
            className={`w-8 h-8 rounded-full border-2 transition bg-gray-900 ${dk ? 'border-violet-400' : 'border-gray-400 hover:border-gray-300'}`}
          />
        </div>

        {/* Song picker in controls (when multiple songs) */}
        {songs.length > 1 && (
          <div className="relative">
            <select
              value={selectedSong?.song_id || ''}
              onChange={e => setSelectedSong(songs.find(s => s.song_id === e.target.value))}
              className={`text-xs border-2 rounded-lg pl-2 pr-6 py-2.5 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-violet-400 min-h-[44px] ${dk ? 'bg-gray-800 border-gray-600 text-gray-200 hover:border-gray-500' : 'bg-white border-gray-300 text-gray-700 hover:border-violet-400'}`}
            >
              {songs.map(s => <option key={s.song_id} value={s.song_id}>{s.title}</option>)}
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

      {Object.entries(sections).map(([sectionLabel, sectionLines]) => {
        const isCollapsed = collapsedSections.has(sectionLabel)
        const hasAssignedInSection = sectionLines.some(l => assignedLineIds.has(l.line_id))

        // In stage mode, hide sections with no assigned lines entirely
        if (stageMode && !hasAssignedInSection) return null

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

                  return (
                    <div
                      key={line.line_id}
                      className={stageMode && !isAssigned ? 'opacity-25' : ''}
                    >
                      {cue && (
                        <div className={`flex items-center gap-2 border-b px-4 py-1.5 ${cueBg}`}>
                          <span className={`text-xs ${dk ? 'text-amber-400' : 'text-amber-500'}`}>⚡</span>
                          <span className={`text-xs font-medium ${cueText}`}>{cue}</span>
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
                                  <span className={`${fontSizeClass} ${isAssigned ? assignedLineText : unassignedLineText}`}>
                                    {word}
                                  </span>
                                </span>
                              )
                            })}
                          </div>
                        ) : (
                          <p className={`${fontSizeClass} ${isAssigned ? assignedLineText : unassignedLineText}`}>
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
