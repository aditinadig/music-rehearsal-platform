import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../supabase/client'
import { useAuth } from '../../context/AuthContext'

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

  // Inline edit state
  const [editingId, setEditingId] = useState(null)
  const [inlineMember, setInlineMember] = useState('')
  const [inlineCue, setInlineCue] = useState('')
  const [inlineLoading, setInlineLoading] = useState(false)
  const [inlineError, setInlineError] = useState('')

  // Undo state
  const [undoAction, setUndoAction] = useState(null) // { lineId, prevAssignments, prevCues }
  const undoTimerRef = useRef(null)

  useEffect(() => {
    if (lines.length > 0) fetchAssignments()
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

  function openInlineEdit(assignment) {
    const existingCue = cues.find(c => c.line_id === assignment.line_id && c.user_id === assignment.user_id)
    setEditingId(assignment.assignment_id)
    setInlineMember(assignment.user_id)
    setInlineCue(existingCue?.cue_text || '')
    setInlineError('')
  }

  function closeInlineEdit() {
    setEditingId(null)
    setInlineMember('')
    setInlineCue('')
    setInlineError('')
  }

  async function saveAssignment(lineId, memberId, cue, { onSuccess, onError, setLoadingFn }) {
    setLoadingFn(true)
    let snapshotAssignments = []
    let snapshotCues = []

    try {
      const line = lines.find(l => l.line_id === lineId)

      const [{ data: existingAssignments, error: assignmentFetchError }, { data: existingCues, error: cueFetchError }] = await Promise.all([
        supabase.from('assignments').select('assignment_id, user_id').eq('line_id', lineId),
        supabase.from('cues').select('cue_id, user_id, cue_text').eq('line_id', lineId)
      ])

      if (assignmentFetchError || cueFetchError) {
        throw new Error(assignmentFetchError?.message || cueFetchError?.message || 'Unable to load current assignment state.')
      }

      const currentAssignments = existingAssignments || []
      const currentCues = existingCues || []
      const currentAssigneeIds = currentAssignments.map(a => a.user_id)
      const currentCueUserIds = currentCues.map(c => c.user_id)
      const affectedUserIds = [...new Set([...currentAssigneeIds, ...currentCueUserIds, ...(memberId ? [memberId] : [])])]
      snapshotAssignments = currentAssignments.map(a => ({ ...a }))
      snapshotCues = currentCues.map(c => ({ ...c }))

      const previousAssigneeNames = members
        .filter(m => currentAssigneeIds.includes(m.user_id))
        .map(m => m.name)
        .join(', ') || 'Unassigned'

      const isUnassign = !memberId

      if (isUnassign) {
        // Remove all assignments and cues for this line
        if (currentAssignments.length > 0) {
          const { error: deleteAssignmentsError } = await supabase
            .from('assignments').delete().in('assignment_id', currentAssignments.map(a => a.assignment_id))
          if (deleteAssignmentsError) throw new Error(deleteAssignmentsError.message)
        }
        if (currentCues.length > 0) {
          const { error: deleteCuesError } = await supabase
            .from('cues').delete().in('cue_id', currentCues.map(c => c.cue_id))
          if (deleteCuesError) throw new Error(deleteCuesError.message)
        }
        if (currentAssignments.length > 0) {
          await writeChangeLog(lineId, 'assignment_changed', previousAssigneeNames, 'Unassigned', affectedUserIds)
        }
      } else {
        const member = members.find(m => m.user_id === memberId)
        const selectedAssignment = currentAssignments.find(a => a.user_id === memberId)
        const assignmentsToRemove = currentAssignments.filter(a => a.user_id !== memberId)

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

        const existingCueForMember = currentCues.find(c => c.user_id === memberId)
        const otherCueIds = currentCues.filter(c => c.user_id !== memberId).map(c => c.cue_id)

        if (otherCueIds.length > 0) {
          const { error: deleteOtherCuesError } = await supabase
            .from('cues').delete().in('cue_id', otherCueIds)
          if (deleteOtherCuesError) throw new Error(deleteOtherCuesError.message)
        }

        const trimmedCue = cue.trim()
        const previousCueValue = existingCueForMember?.cue_text || currentCues[0]?.cue_text || null
        const cueChanged = (previousCueValue || '') !== trimmedCue

        if (assignmentChanged) {
          await writeChangeLog(
            lineId, 'assignment_changed', previousAssigneeNames,
            member ? `${member.name} assigned to: "${line?.lyric_text}"` : `Assigned to user ${memberId}`,
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
    setError('')
    setSuccess('')
    await saveAssignment(selectedLine, selectedMember, cueText, {
      setLoadingFn: setLoading,
      onSuccess: () => {
        setSuccess('Assignment saved!')
        setSelectedLine('')
        setSelectedMember('')
        setCueText('')
      },
      onError: msg => setError(msg),
    })
  }

  async function handleInlineSave(lineId) {
    setInlineError('')
    await saveAssignment(lineId, inlineMember, inlineCue, {
      setLoadingFn: setInlineLoading,
      onSuccess: closeInlineEdit,
      onError: msg => setInlineError(msg),
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

  const assignedLineIdSet = new Set(assignments.map(a => a.line_id))

  const unassignedGroupedLines = lines
    .filter(l => !assignedLineIdSet.has(l.line_id))
    .reduce((acc, line) => {
      const section = line.section_label || 'General'
      if (!acc[section]) acc[section] = []
      acc[section].push(line)
      return acc
    }, {})

  const groupedLines = lines.reduce((acc, line) => {
    const section = line.section_label || 'General'
    if (!acc[section]) acc[section] = []
    acc[section].push(line)
    return acc
  }, {})

  const performers = members.filter(m => m.role !== 'manager')

  return (
    <div className="space-y-6">
      {/* New assignment form */}
      <div className="rounded-2xl shadow-sm border border-orange-100 p-5 bg-gradient-to-br from-white to-orange-50">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-orange-700 mb-1">Assignment desk</p>
            <h2 className="text-lg font-semibold text-gray-800">Assign Lines & Set Cues</h2>
            <p className="text-sm text-gray-500 mt-1">
              Pick a line, assign it to a performer, and optionally set an entry cue.
            </p>
          </div>
          <span className="rounded-xl bg-white border border-orange-100 px-3 py-2 text-lg shadow-sm">🎼</span>
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

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Line</label>
            <select
              value={selectedLine}
              onChange={e => setSelectedLine(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
            >
              <option value="">Select a line...</option>
              {Object.entries(unassignedGroupedLines).map(([section, sectionLines]) => (
                <optgroup key={section} label={section}>
                  {sectionLines.map(line => (
                    <option key={line.line_id} value={line.line_id}>{line.lyric_text || '(instrumental)'}</option>
                  ))}
                </optgroup>
              ))}
              {Object.keys(unassignedGroupedLines).length === 0 && (
                <option disabled value="">All lines are assigned</option>
              )}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Assign to</label>
            <select
              value={selectedMember}
              onChange={e => setSelectedMember(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
            >
              <option value="">Select a performer...</option>
              {performers.map(member => (
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

          <button
            onClick={handleSaveNew}
            disabled={loading || !selectedLine || !selectedMember}
            className="bg-violet-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-violet-700 transition disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Assignment'}
          </button>
        </div>
      </div>

      {/* Current assignments list */}
      {assignments.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-orange-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-orange-700 mb-1">Live map</p>
              <h3 className="text-sm font-semibold text-gray-700">Current Assignments</h3>
            </div>
            <span className="text-xs font-semibold text-gray-500 bg-gray-100 rounded-full px-3 py-1">
              {assignments.length} assigned
            </span>
          </div>
          <div className="grid gap-2">
            {assignments.map(a => {
              const line = lines.find(l => l.line_id === a.line_id)
              const member = members.find(m => m.user_id === a.user_id)
              const cue = cues.find(c => c.line_id === a.line_id && c.user_id === a.user_id)
              if (!line || !member) return null
              const isEditing = editingId === a.assignment_id

              return (
                <div key={a.assignment_id} className={`rounded-xl border transition ${isEditing ? 'border-violet-300 bg-violet-50' : 'border-gray-100 bg-gray-50'}`}>
                  {/* Row summary */}
                  <div className="flex items-start justify-between gap-4 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-violet-500 font-medium mb-0.5">{line.section_label}</p>
                      <p className="text-sm text-gray-800 truncate">{line.lyric_text}</p>
                      {cue && !isEditing && (
                        <p className="text-xs text-gray-400 mt-1">Cue: {cue.cue_text}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0 space-y-1">
                      <p className="text-sm text-gray-700 font-medium">{member.name}</p>
                      <p className="text-xs text-gray-400 capitalize">{member.role}</p>
                      {!isEditing && (
                        <button
                          onClick={() => openInlineEdit(a)}
                          className="text-xs text-violet-500 hover:text-violet-700 font-medium block ml-auto"
                        >
                          Edit
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Inline edit form */}
                  {isEditing && (
                    <div className="border-t border-violet-200 px-4 py-4 space-y-3">
                      {inlineError && (
                        <div className="bg-red-50 text-red-600 text-xs rounded-lg px-3 py-2">{inlineError}</div>
                      )}
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Reassign to</label>
                        <select
                          value={inlineMember}
                          onChange={e => setInlineMember(e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white"
                        >
                          <option value="">— Unassign line —</option>
                          {performers.map(m => (
                            <option key={m.user_id} value={m.user_id}>
                              {m.name} ({m.role})
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
                          value={inlineCue}
                          onChange={e => setInlineCue(e.target.value)}
                          placeholder="e.g. Enter after bar 8"
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleInlineSave(a.line_id)}
                          disabled={inlineLoading}
                          className="bg-violet-600 text-white px-4 py-1.5 rounded-lg text-xs font-medium hover:bg-violet-700 transition disabled:opacity-50"
                        >
                          {inlineLoading ? 'Saving...' : 'Save'}
                        </button>
                        <button
                          onClick={closeInlineEdit}
                          className="px-4 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:bg-gray-200 transition"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
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
