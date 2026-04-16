import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../supabase/client'
import { useAuth } from '../../context/useAuth'

function partValue(lineId, role) {
  return `${lineId}:${role}`
}

function parsePartValue(value) {
  const [lineId, role] = value.split(':')
  return { lineId, role }
}

function roleLabel(role) {
  return role === 'singer' ? 'Singer' : 'Musician'
}

function assignmentLabel(role) {
  return role === 'singer' ? 'Lyrics' : 'Notation'
}

function roleBadgeClass(role) {
  return role === 'singer'
    ? 'bg-[#FDEBE6] text-[#B43A22] border-[#F2C7BB]'
    : 'bg-[#F3EEF5] text-[#6F5D78] border-[#DED3E4]'
}

function partButtonClass(role, assigned) {
  if (role === 'singer') {
    return assigned
      ? 'border-[#F2C7BB] bg-[#FDEBE6]/55 text-[#B43A22]/70 hover:bg-[#FDEBE6] hover:text-[#B43A22]'
      : 'border-[#F2C7BB] bg-[#FDEBE6] text-[#B43A22] shadow-sm hover:bg-[#F9D8CF]'
  }
  return assigned
    ? 'border-[#DED3E4] bg-[#F3EEF5]/55 text-[#6F5D78]/70 hover:bg-[#F3EEF5] hover:text-[#6F5D78]'
    : 'border-[#DED3E4] bg-[#F3EEF5] text-[#6F5D78] shadow-sm hover:bg-[#E8DFEC]'
}

function linePreview(line) {
  return line?.lyric_text?.trim() || '(instrumental)'
}

function notationPreview(line, wordNotes = {}) {
  const lineNotation = line?.notation_text?.trim()
  const noteEntries = Object.entries(wordNotes)
    .map(([index, note]) => [Number(index), note?.trim()])
    .filter(([, note]) => note)
    .sort(([a], [b]) => a - b)

  if (!noteEntries.length) return lineNotation || ''

  const words = line?.lyric_text?.trim()?.split(/\s+/) || []
  const noteMap = Object.fromEntries(noteEntries)
  const wordPattern = words.length
    ? words.map((_, index) => noteMap[index] || '...').join(' ')
    : noteEntries.map(([, note]) => note).join(' ')

  return lineNotation ? `${lineNotation} · ${wordPattern}` : wordPattern
}

export default function AssignmentPanel({ lines, members, onAssignmentSaved }) {
  const { user } = useAuth()
  const [selectedLine, setSelectedLine] = useState('')
  const [selectedMember, setSelectedMember] = useState('')
  const [cueText, setCueText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [assignments, setAssignments] = useState([])
  const [cues, setCues] = useState([])
  const [wordNotes, setWordNotes] = useState({})

  // Undo state
  const [undoAction, setUndoAction] = useState(null) // { lineId, prevAssignments, prevCues }
  const undoTimerRef = useRef(null)

  useEffect(() => {
    if (lines.length > 0) {
      fetchAssignments()
      fetchWordNotes()
    } else {
      setAssignments([])
      setCues([])
      setWordNotes({})
    }
    return () => { if (undoTimerRef.current) clearTimeout(undoTimerRef.current) }
  }, [lines])

  async function fetchAssignments() {
    const lineIds = lines.map(l => l.line_id)

    const [{ data: assignData }, { data: cueData }] = await Promise.all([
      supabase.from('assignments').select('*').in('line_id', lineIds),
      supabase.from('cues').select('*').in('line_id', lineIds)
    ])

    if (assignData) setAssignments(assignData)
    if (cueData) setCues(cueData)
  }

  async function fetchWordNotes() {
    const lineIds = lines.map(l => l.line_id)
    const { data } = await supabase
      .from('word_notes')
      .select('line_id, word_index, note_text')
      .in('line_id', lineIds)

    const map = {}
    for (const row of data || []) {
      if (!map[row.line_id]) map[row.line_id] = {}
      map[row.line_id][row.word_index] = row.note_text
    }
    setWordNotes(map)
  }

  async function saveAssignment(lineId, requiredRole, memberId, cue, { onSuccess, onError, setLoadingFn }) {
    setLoadingFn(true)
    let snapshotAssignments = []
    let snapshotCues = []

    try {
      const line = lines.find(l => l.line_id === lineId)
      if (!line) throw new Error('Select a valid song line.')
      if (!['singer', 'musician'].includes(requiredRole)) throw new Error('Select lyrics or notation for this line.')
      if (requiredRole === 'singer' && !line.lyric_text?.trim()) throw new Error('Only lyric lines can be assigned to singers.')
      if (requiredRole === 'musician' && !notationPreview(line, wordNotes[lineId]).trim()) {
        throw new Error('Only lines with notation can be assigned to musicians.')
      }

      const [{ data: existingAssignments, error: assignmentFetchError }, { data: existingCues, error: cueFetchError }] = await Promise.all([
        supabase.from('assignments').select('assignment_id, user_id').eq('line_id', lineId),
        supabase.from('cues').select('cue_id, user_id, cue_text').eq('line_id', lineId)
      ])

      if (assignmentFetchError || cueFetchError) {
        throw new Error(assignmentFetchError?.message || cueFetchError?.message || 'Unable to load current assignment state.')
      }

      const currentAssignments = existingAssignments || []
      const currentCues = existingCues || []
      const memberRoleById = Object.fromEntries(members.map(m => [m.user_id, m.role]))
      const currentRoleAssignments = currentAssignments.filter(a => memberRoleById[a.user_id] === requiredRole)
      const currentRoleCues = currentCues.filter(c => memberRoleById[c.user_id] === requiredRole)
      const currentAssigneeIds = currentRoleAssignments.map(a => a.user_id)
      const currentCueUserIds = currentRoleCues.map(c => c.user_id)
      const affectedUserIds = [...new Set([...currentAssigneeIds, ...currentCueUserIds, ...(memberId ? [memberId] : [])])]
      snapshotAssignments = currentAssignments.map(a => ({ ...a }))
      snapshotCues = currentCues.map(c => ({ ...c }))

      const previousAssigneeNames = members
        .filter(m => currentAssigneeIds.includes(m.user_id))
        .map(m => m.name)
        .join(', ') || 'Unassigned'

      const isUnassign = !memberId

      if (isUnassign) {
        if (currentRoleAssignments.length > 0) {
          const { error: deleteAssignmentsError } = await supabase
            .from('assignments').delete().in('assignment_id', currentRoleAssignments.map(a => a.assignment_id))
          if (deleteAssignmentsError) throw new Error(deleteAssignmentsError.message)
        }
        if (currentRoleCues.length > 0) {
          const { error: deleteCuesError } = await supabase
            .from('cues').delete().in('cue_id', currentRoleCues.map(c => c.cue_id))
          if (deleteCuesError) throw new Error(deleteCuesError.message)
        }
        if (currentRoleAssignments.length > 0) {
          await writeChangeLog(lineId, 'assignment_changed', `${assignmentLabel(requiredRole)}: ${previousAssigneeNames}`, 'Unassigned', affectedUserIds)
        }
      } else {
        const member = members.find(m => m.user_id === memberId)
        if (!member) throw new Error('Select a valid group member.')
        if (member.role !== requiredRole) {
          throw new Error(`${assignmentLabel(requiredRole)} can only be assigned to ${roleLabel(requiredRole).toLowerCase()}s.`)
        }
        const selectedAssignment = currentRoleAssignments.find(a => a.user_id === memberId)
        const assignmentsToRemove = currentRoleAssignments.filter(a => a.user_id !== memberId)

        if (assignmentsToRemove.length > 0) {
          const { error: deleteAssignmentsError } = await supabase
            .from('assignments').delete().in('assignment_id', assignmentsToRemove.map(a => a.assignment_id))
          if (deleteAssignmentsError) throw new Error(deleteAssignmentsError.message)
        }

        if (!selectedAssignment) {
          const { error: assignError } = await supabase
            .from('assignments').insert({ line_id: lineId, user_id: memberId, assigned_by: user.id })
          if (assignError) throw new Error(assignError.message)
        }

        const assignmentChanged = currentAssigneeIds.length !== 1 || currentAssigneeIds[0] !== memberId

        const existingCueForMember = currentRoleCues.find(c => c.user_id === memberId)
        const otherCueIds = currentRoleCues.filter(c => c.user_id !== memberId).map(c => c.cue_id)

        if (otherCueIds.length > 0) {
          const { error: deleteOtherCuesError } = await supabase
            .from('cues').delete().in('cue_id', otherCueIds)
          if (deleteOtherCuesError) throw new Error(deleteOtherCuesError.message)
        }

        const trimmedCue = cue.trim()
        const previousCueValue = existingCueForMember?.cue_text || currentRoleCues[0]?.cue_text || null
        const cueChanged = (previousCueValue || '') !== trimmedCue

        if (assignmentChanged) {
          await writeChangeLog(
            lineId, 'assignment_changed', previousAssigneeNames,
            `${member.name} assigned to ${assignmentLabel(requiredRole).toLowerCase()}: "${previewForRole(line, requiredRole)}"`,
            affectedUserIds
          )
        }

        if (trimmedCue) {
          if (existingCueForMember) {
            const { error: updateCueError } = await supabase
              .from('cues').update({ cue_text: trimmedCue, updated_at: new Date().toISOString() }).eq('cue_id', existingCueForMember.cue_id)
            if (updateCueError) throw new Error(updateCueError.message)
          } else {
            const { error: insertCueError } = await supabase
              .from('cues').insert({ line_id: lineId, user_id: memberId, cue_text: trimmedCue, created_by: user.id })
            if (insertCueError) throw new Error(insertCueError.message)
          }
        } else if (existingCueForMember) {
          const { error: deleteCueError } = await supabase
            .from('cues').delete().eq('cue_id', existingCueForMember.cue_id)
          if (deleteCueError) throw new Error(deleteCueError.message)
        }

        if (cueChanged) {
          await writeChangeLog(lineId, 'cue_changed', previousCueValue, trimmedCue || 'Cue cleared', affectedUserIds)
        }
      }

      fetchAssignments()
      if (onAssignmentSaved) onAssignmentSaved()

      // Arm undo for 5 seconds
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current)
      setUndoAction({ lineId, prevAssignments: snapshotAssignments, prevCues: snapshotCues })
      undoTimerRef.current = setTimeout(() => setUndoAction(null), 5000)

      onSuccess()
    } catch (err) {
      await rollbackAssignmentState(lineId, snapshotAssignments, snapshotCues)
      onError(err.message || 'Unable to save assignment changes.')
    } finally {
      setLoadingFn(false)
    }
  }

  async function handleSaveNew() {
    if (!selectedLine || !selectedMember) return
    const { lineId, role } = parsePartValue(selectedLine)
    setError('')
    setSuccess('')
    await saveAssignment(lineId, role, selectedMember, cueText, {
      setLoadingFn: setLoading,
      onSuccess: () => {
        setSuccess('Assignment saved!')
      },
      onError: msg => setError(msg),
    })
  }

  async function handleUnassignSelected() {
    if (!selectedLine) return
    const { lineId, role } = parsePartValue(selectedLine)
    setError('')
    setSuccess('')
    await saveAssignment(lineId, role, '', '', {
      setLoadingFn: setLoading,
      onSuccess: () => {
        setSuccess('Assignment cleared.')
        setSelectedMember('')
        setCueText('')
      },
      onError: msg => setError(msg),
    })
  }

  async function handleUndoAssignment() {
    if (!undoAction) return
    const { lineId, prevAssignments, prevCues } = undoAction
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current)
    setUndoAction(null)
    await rollbackAssignmentState(lineId, prevAssignments, prevCues)
  }

  async function rollbackAssignmentState(lineId, originalAssignments, originalCues) {
    try {
      const [{ data: currentAssignments }, { data: currentCues }] = await Promise.all([
        supabase.from('assignments').select('assignment_id, user_id').eq('line_id', lineId),
        supabase.from('cues').select('cue_id, user_id, cue_text, created_by').eq('line_id', lineId),
      ])

      if ((currentAssignments || []).length > 0) {
        await supabase.from('assignments').delete().in('assignment_id', currentAssignments.map(a => a.assignment_id))
      }
      if ((currentCues || []).length > 0) {
        await supabase.from('cues').delete().in('cue_id', currentCues.map(c => c.cue_id))
      }
      if ((originalAssignments || []).length > 0) {
        await supabase.from('assignments').insert(
          originalAssignments.map(a => ({ line_id: lineId, user_id: a.user_id, assigned_by: user.id }))
        )
      }
      if ((originalCues || []).length > 0) {
        await supabase.from('cues').insert(
          originalCues.map(c => ({ line_id: lineId, user_id: c.user_id, cue_text: c.cue_text, created_by: c.created_by || user.id }))
        )
      }
    } catch (rollbackError) {
      console.error('Rollback failed:', rollbackError)
    } finally {
      fetchAssignments()
    }
  }

  async function writeChangeLog(lineId, changeType, oldValue, newValue, affectedUserIds) {
    const { data: changeData, error: changeError } = await supabase
      .from('change_log')
      .insert({ line_id: lineId, change_type: changeType, old_value: oldValue, new_value: newValue, changed_by: user.id })
      .select()
      .single()

    if (changeError || !changeData) {
      throw new Error(changeError?.message || `Failed to write ${changeType} to change_log.`)
    }

    if (!affectedUserIds.length) return

    const { error: ackError } = await supabase
      .from('acknowledgments')
      .insert(affectedUserIds.map(uid => ({ change_id: changeData.change_id, user_id: uid, confirmed: false })))

    if (ackError) throw new Error(ackError.message || 'Failed to create acknowledgment rows.')
  }

  function previewForRole(line, role) {
    return role === 'musician' ? notationPreview(line, wordNotes[line.line_id]) : linePreview(line)
  }

  function assignmentForPart(part) {
    if (!part) return null
    return assignments.find(a => {
      const member = members.find(m => m.user_id === a.user_id)
      return a.line_id === part.line.line_id && member?.role === part.role
    }) || null
  }

  function cueForAssignment(assignment) {
    if (!assignment) return null
    return cues.find(c => c.line_id === assignment.line_id && c.user_id === assignment.user_id) || null
  }

  function handleSelectPart(part) {
    const assignment = assignmentForPart(part)
    const cue = cueForAssignment(assignment)
    setSelectedLine(part.key)
    setSelectedMember(assignment?.user_id || '')
    setCueText(cue?.cue_text || '')
    setError('')
    setSuccess('')
  }

  const assignableParts = lines.flatMap(line => {
    const parts = []
    if (line.lyric_text?.trim()) {
      parts.push({ key: partValue(line.line_id, 'singer'), line, role: 'singer', preview: linePreview(line) })
    }
    const notation = notationPreview(line, wordNotes[line.line_id])
    if (notation.trim()) {
      parts.push({ key: partValue(line.line_id, 'musician'), line, role: 'musician', preview: notation })
    }
    return parts
  })

  const sortedLines = [...lines].sort((a, b) => a.line_number - b.line_number)
  const groupedLines = sortedLines.reduce((acc, line) => {
    const section = line.section_label || 'General'
    if (!acc[section]) acc[section] = []
    acc[section].push(line)
    return acc
  }, {})

  const selectedPart = assignableParts.find(part => part.key === selectedLine)
  const selectedAssignment = assignmentForPart(selectedPart)
  const selectedAssignee = selectedAssignment ? members.find(m => m.user_id === selectedAssignment.user_id) : null
  const selectedRequiredRole = selectedPart?.role || null
  const eligibleMembers = selectedRequiredRole
    ? members.filter(m => m.role === selectedRequiredRole)
    : []

  function partsForLine(line) {
    return assignableParts.filter(part => part.line.line_id === line.line_id)
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl shadow-sm border border-orange-100 p-5 bg-gradient-to-br from-white to-orange-50">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-orange-700 mb-1">Assignment desk</p>
            <h2 className="text-lg font-semibold text-gray-800">Assign Lines & Set Cues</h2>
            <p className="text-sm text-gray-500 mt-1">
              Select a lyric or notation part from the song, then assign it to the right performer.
            </p>
          </div>
          <span className="rounded-xl bg-white border border-orange-100 px-3 py-2 text-xs font-bold text-orange-700 shadow-sm">MAP</span>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm rounded-lg px-4 py-3 mb-4">{error}</div>
        )}
        {success && !undoAction && (
          <div className="bg-green-50 text-green-600 text-sm rounded-lg px-4 py-3 mb-4">{success}</div>
        )}
        {undoAction && (
          <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4">
            <p className="text-xs text-amber-800">Assignment saved.</p>
            <button
              onClick={handleUndoAssignment}
              className="text-xs font-semibold text-amber-700 hover:underline ml-4"
            >
              Undo
            </button>
          </div>
        )}

        <div className="grid gap-5 lg:grid-cols-[1.35fr_0.9fr]">
          <div className="rounded-2xl border border-orange-100 bg-white p-4 shadow-sm">
            <div className="mb-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-orange-700 mb-1">Song map</p>
              <p className="text-sm text-gray-500">Click Lyrics or Notation on any line to assign that part.</p>
            </div>
            <div className="space-y-5">
              {Object.entries(groupedLines).map(([section, sectionLines]) => (
                <div key={section}>
                  <h3 className="text-xs font-semibold text-violet-500 uppercase tracking-wide mb-2">{section}</h3>
                  <div className="divide-y divide-gray-100 rounded-xl border border-gray-100 bg-gray-50">
                    {sectionLines.map(line => (
                      <div key={line.line_id} className="px-4 py-3">
                        <div className="flex gap-3">
                          <span className="mt-1 w-6 shrink-0 text-xs text-gray-400">{line.line_number}</span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium leading-6 text-gray-800">
                              {linePreview(line)}
                            </p>
                            {notationPreview(line, wordNotes[line.line_id]) && (
                              <p className="mt-1 text-xs font-semibold text-[#6F5D78]">
                                {notationPreview(line, wordNotes[line.line_id])}
                              </p>
                            )}
                            <div className="mt-3 flex flex-wrap gap-2">
                              {partsForLine(line).map(part => {
                                const assignment = assignmentForPart(part)
                                const member = assignment ? members.find(m => m.user_id === assignment.user_id) : null
                                const selected = selectedLine === part.key
                                const assigned = Boolean(assignment)
                                const idleClass = partButtonClass(part.role, assigned)
                                return (
                                  <button
                                    key={part.key}
                                    onClick={() => handleSelectPart(part)}
                                    className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                                      selected
                                        ? part.role === 'singer'
                                          ? 'border-[#B43A22] bg-[#B43A22] text-white'
                                          : 'border-[#6F5D78] bg-[#6F5D78] text-white'
                                        : idleClass
                                    }`}
                                  >
                                    {assignmentLabel(part.role)}
                                    {member ? `: ${member.name}` : ': unassigned'}
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-orange-100 bg-white p-4 shadow-sm lg:sticky lg:top-24 self-start">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-orange-700 mb-1">Selected part</p>
            {!selectedPart ? (
              <div className="rounded-xl bg-gray-50 px-4 py-5 text-sm text-gray-500">
                Select Lyrics or Notation from the song map.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-xl bg-gray-50 px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold border ${roleBadgeClass(selectedPart.role)}`}>
                      {assignmentLabel(selectedPart.role)}
                    </span>
                    <span className="text-xs text-gray-400">{selectedPart.line.section_label}</span>
                  </div>
                  <p className="text-sm font-medium text-gray-800">{selectedPart.preview}</p>
                  {selectedPart.role === 'musician' && selectedPart.line.lyric_text?.trim() && (
                    <p className="mt-2 text-xs text-gray-500">Line: {selectedPart.line.lyric_text}</p>
                  )}
                  <p className="mt-2 text-xs text-gray-400">
                    Current: {selectedAssignee ? `${selectedAssignee.name} (${selectedAssignee.role})` : 'Unassigned'}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Assign to {roleLabel(selectedRequiredRole)}
                  </label>
                  <select
                    value={selectedMember}
                    onChange={e => setSelectedMember(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                  >
                    <option value="">Select a {roleLabel(selectedRequiredRole).toLowerCase()}...</option>
                    {eligibleMembers.length === 0 && (
                      <option disabled value="">No {roleLabel(selectedRequiredRole).toLowerCase()}s in this group</option>
                    )}
                    {eligibleMembers.map(member => (
                      <option key={member.user_id} value={member.user_id}>
                        {member.name} ({member.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Entry Cue <span className="text-gray-400">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={cueText}
                    onChange={e => setCueText(e.target.value)}
                    placeholder="e.g. Enter after bar 8, or after the guitar intro"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={handleSaveNew}
                    disabled={loading || !selectedMember}
                    className="bg-violet-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-violet-700 transition disabled:opacity-50"
                  >
                    {loading ? 'Saving...' : 'Save Assignment'}
                  </button>
                  {selectedAssignment && (
                    <button
                      onClick={handleUnassignSelected}
                      disabled={loading}
                      className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                    >
                      Unassign
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {assignments.length > 0 && (
        <div className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-orange-700 mb-1">Summary</p>
              <h3 className="text-sm font-semibold text-gray-700">Assigned parts</h3>
            </div>
            <span className="text-xs font-semibold text-gray-500 bg-gray-100 rounded-full px-3 py-1">
              {assignments.length} assigned
            </span>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            {assignments.map(a => {
              const line = lines.find(l => l.line_id === a.line_id)
              const member = members.find(m => m.user_id === a.user_id)
              const cue = cues.find(c => c.line_id === a.line_id && c.user_id === a.user_id)
              if (!line || !member) return null
              return (
                <button
                  key={a.assignment_id}
                  onClick={() => {
                    const part = assignableParts.find(p => p.line.line_id === line.line_id && p.role === member.role)
                    if (part) handleSelectPart(part)
                  }}
                  className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-left transition hover:border-[#F0D7C8] hover:bg-[#FFF9F5]"
                >
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold border ${roleBadgeClass(member.role)}`}>
                      {assignmentLabel(member.role)}
                    </span>
                    <span className="text-xs text-gray-400">{line.section_label}</span>
                  </div>
                  <p className="text-sm font-medium text-gray-800 truncate">{previewForRole(line, member.role)}</p>
                  <p className="mt-1 text-xs text-gray-500">{member.name} ({member.role})</p>
                  {cue && <p className="mt-1 text-xs text-gray-400 truncate">Cue: {cue.cue_text}</p>}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {assignments.length === 0 && lines.length > 0 && (
        <p className="text-xs text-gray-400">No assignments yet for this song.</p>
      )}
    </div>
  )
}
