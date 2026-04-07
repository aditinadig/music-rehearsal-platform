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
  const formRef = useRef(null)

  useEffect(() => {
    if (lines.length > 0) fetchAssignments()
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

  async function handleEditClick(assignment) {
    setSelectedLine(assignment.line_id)
    setSelectedMember(assignment.user_id)
    const existingCue = cues.find(c => c.line_id === assignment.line_id && c.user_id === assignment.user_id)
    setCueText(existingCue?.cue_text || '')
    setSuccess('')
    setError('')
    formRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  async function handleSave() {
    if (!selectedLine || !selectedMember) return
    setLoading(true)
    setError('')
    setSuccess('')
    let snapshotAssignments = []
    let snapshotCues = []

    try {
      const line = lines.find(l => l.line_id === selectedLine)
      const member = members.find(m => m.user_id === selectedMember)

      const [{ data: existingAssignments, error: assignmentFetchError }, { data: existingCues, error: cueFetchError }] = await Promise.all([
        supabase
          .from('assignments')
          .select('assignment_id, user_id')
          .eq('line_id', selectedLine),
        supabase
          .from('cues')
          .select('cue_id, user_id, cue_text')
          .eq('line_id', selectedLine)
      ])

      if (assignmentFetchError || cueFetchError) {
        throw new Error(assignmentFetchError?.message || cueFetchError?.message || 'Unable to load current assignment state.')
      }

      const currentAssignments = existingAssignments || []
      const currentCues = existingCues || []
      const currentAssigneeIds = currentAssignments.map(a => a.user_id)
      const currentCueUserIds = currentCues.map(c => c.user_id)
      const affectedUserIds = [...new Set([...currentAssigneeIds, ...currentCueUserIds, selectedMember])]
      snapshotAssignments = currentAssignments.map(a => ({ ...a }))
      snapshotCues = currentCues.map(c => ({ ...c }))

      const previousAssigneeNames = members
        .filter(m => currentAssigneeIds.includes(m.user_id))
        .map(m => m.name)
        .join(', ') || 'Unassigned'

      const selectedAssignment = currentAssignments.find(a => a.user_id === selectedMember)
      const assignmentsToRemove = currentAssignments.filter(a => a.user_id !== selectedMember)

      if (assignmentsToRemove.length > 0) {
        const { error: deleteAssignmentsError } = await supabase
          .from('assignments')
          .delete()
          .in('assignment_id', assignmentsToRemove.map(a => a.assignment_id))

        if (deleteAssignmentsError) {
          throw new Error(deleteAssignmentsError.message)
        }
      }

      if (!selectedAssignment) {
        const { error: assignError } = await supabase
          .from('assignments')
          .insert({
            line_id: selectedLine,
            user_id: selectedMember,
            assigned_by: user.id
          })

        if (assignError) {
          throw new Error(assignError.message)
        }
      }

      const assignmentChanged =
        currentAssigneeIds.length !== 1 ||
        currentAssigneeIds[0] !== selectedMember

      const existingCueForSelectedMember = currentCues.find(c => c.user_id === selectedMember)
      const otherCueIds = currentCues
        .filter(c => c.user_id !== selectedMember)
        .map(c => c.cue_id)

      if (otherCueIds.length > 0) {
        const { error: deleteOtherCuesError } = await supabase
          .from('cues')
          .delete()
          .in('cue_id', otherCueIds)

        if (deleteOtherCuesError) {
          throw new Error(deleteOtherCuesError.message)
        }
      }

      const trimmedCue = cueText.trim()
      const previousCueValue = existingCueForSelectedMember?.cue_text || currentCues[0]?.cue_text || null
      const cueChanged = (previousCueValue || '') !== trimmedCue

      if (assignmentChanged) {
        await writeChangeLog(
          selectedLine,
          'assignment_changed',
          previousAssigneeNames,
          member ? `${member.name} assigned to: "${line?.lyric_text}"` : `Assigned to user ${selectedMember}`,
          affectedUserIds
        )
      }

      if (trimmedCue) {
        if (existingCueForSelectedMember) {
          const { error: updateCueError } = await supabase
            .from('cues')
            .update({ cue_text: trimmedCue, updated_at: new Date().toISOString() })
            .eq('cue_id', existingCueForSelectedMember.cue_id)

          if (updateCueError) {
            throw new Error(updateCueError.message)
          }
        } else {
          const { error: insertCueError } = await supabase
            .from('cues')
            .insert({
              line_id: selectedLine,
              user_id: selectedMember,
              cue_text: trimmedCue,
              created_by: user.id
            })

          if (insertCueError) {
            throw new Error(insertCueError.message)
          }
        }
      } else if (existingCueForSelectedMember) {
        const { error: deleteCueError } = await supabase
          .from('cues')
          .delete()
          .eq('cue_id', existingCueForSelectedMember.cue_id)

        if (deleteCueError) {
          throw new Error(deleteCueError.message)
        }
      }

      if (cueChanged) {
        await writeChangeLog(
          selectedLine,
          'cue_changed',
          previousCueValue,
          trimmedCue || 'Cue cleared',
          affectedUserIds
        )
      }

      setSuccess('Assignment saved!')
      setSelectedLine('')
      setSelectedMember('')
      setCueText('')
      fetchAssignments()
      if (onAssignmentSaved) onAssignmentSaved()
    } catch (saveError) {
      await rollbackAssignmentState(selectedLine, snapshotAssignments, snapshotCues)
      console.error('Assignment save failed:', saveError)
      setError(saveError.message || 'Unable to save assignment changes.')
    } finally {
      setLoading(false)
    }
  }

  async function rollbackAssignmentState(lineId, originalAssignments, originalCues) {
    try {
      const [{ data: currentAssignments }, { data: currentCues }] = await Promise.all([
        supabase.from('assignments').select('assignment_id, user_id').eq('line_id', lineId),
        supabase.from('cues').select('cue_id, user_id, cue_text, created_by').eq('line_id', lineId),
      ])

      if ((currentAssignments || []).length > 0) {
        const { error: deleteAssignmentsError } = await supabase
          .from('assignments')
          .delete()
          .in('assignment_id', currentAssignments.map(a => a.assignment_id))

        if (deleteAssignmentsError) {
          console.error('Assignment rollback delete failed:', deleteAssignmentsError)
        }
      }

      if ((currentCues || []).length > 0) {
        const { error: deleteCuesError } = await supabase
          .from('cues')
          .delete()
          .in('cue_id', currentCues.map(c => c.cue_id))

        if (deleteCuesError) {
          console.error('Cue rollback delete failed:', deleteCuesError)
        }
      }

      if ((originalAssignments || []).length > 0) {
        const { error: restoreAssignmentsError } = await supabase
          .from('assignments')
          .insert(
            originalAssignments.map(assignment => ({
              line_id: lineId,
              user_id: assignment.user_id,
              assigned_by: user.id
            }))
          )

        if (restoreAssignmentsError) {
          console.error('Assignment rollback restore failed:', restoreAssignmentsError)
        }
      }

      if ((originalCues || []).length > 0) {
        const { error: restoreCuesError } = await supabase
          .from('cues')
          .insert(
            originalCues.map(cue => ({
              line_id: lineId,
              user_id: cue.user_id,
              cue_text: cue.cue_text,
              created_by: cue.created_by || user.id
            }))
          )

        if (restoreCuesError) {
          console.error('Cue rollback restore failed:', restoreCuesError)
        }
      }
    } catch (rollbackError) {
      console.error('Rollback failed:', { lineId, rollbackError })
    } finally {
      fetchAssignments()
    }
  }

  async function writeChangeLog(lineId, changeType, oldValue, newValue, affectedUserIds) {
    // Insert into change_log
    const { data: changeData, error: changeError } = await supabase
      .from('change_log')
      .insert({
        line_id: lineId,
        change_type: changeType,
        old_value: oldValue,
        new_value: newValue,
        changed_by: user.id
      })
      .select()
      .single()

    if (changeError || !changeData) {
      console.error('change_log insert failed:', {
        lineId,
        changeType,
        oldValue,
        newValue,
        userId: user.id,
        changeError,
      })
      throw new Error(changeError?.message || `Failed to write ${changeType} to change_log.`)
    }

    if (!affectedUserIds.length) return

    // Create acknowledgment rows for all affected users
    const { error: ackError } = await supabase
      .from('acknowledgments')
      .insert(
        affectedUserIds.map(affectedUserId => ({
          change_id: changeData.change_id,
          user_id: affectedUserId,
          confirmed: false
        }))
      )

    if (ackError) {
      console.error('acknowledgments insert failed:', {
        changeId: changeData.change_id,
        affectedUserIds,
        ackError,
      })
      throw new Error(ackError.message || 'Failed to create acknowledgment rows.')
    }
  }

  // Group lines by section for the dropdown
  const groupedLines = lines.reduce((acc, line) => {
    const section = line.section_label || 'General'
    if (!acc[section]) acc[section] = []
    acc[section].push(line)
    return acc
  }, {})

  const performers = members.filter(m => m.role !== 'manager')

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-1" ref={formRef}>Assign Lines & Set Cues</h2>
      <p className="text-sm text-gray-400 mb-6">
        Pick a line, assign it to a performer, and optionally set an entry cue for them.
      </p>

      {error && (
        <div className="bg-red-50 text-red-600 text-sm rounded-lg px-4 py-3 mb-4">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 text-green-600 text-sm rounded-lg px-4 py-3 mb-4">
          {success}
        </div>
      )}

      <div className="space-y-4">
        {/* Line picker */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Line</label>
          <select
            value={selectedLine}
            onChange={e => setSelectedLine(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            <option value="">Select a line...</option>
            {Object.entries(groupedLines).map(([section, sectionLines]) => (
              <optgroup key={section} label={section}>
                {sectionLines.map(line => (
                  <option key={line.line_id} value={line.line_id}>
                    {line.lyric_text}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        {/* Member picker */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Assign to</label>
          <select
            value={selectedMember}
            onChange={e => setSelectedMember(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            <option value="">Select a performer...</option>
            {performers.map(member => (
              <option key={member.user_id} value={member.user_id}>
                {member.name} ({member.role})
              </option>
            ))}
          </select>
        </div>

        {/* Cue input */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Entry Cue <span className="text-gray-400">(optional)</span>
          </label>
          <input
            type="text"
            value={cueText}
            onChange={e => setCueText(e.target.value)}
            placeholder="e.g. Enter after bar 8, or after the guitar intro"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>

        <button
          onClick={handleSave}
          disabled={loading || !selectedLine || !selectedMember}
          className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Save Assignment'}
        </button>
      </div>

      {/* Current assignments list */}
      {assignments.length > 0 && (
        <div className="mt-8">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Current Assignments</h3>
          <div className="space-y-2">
            {assignments.map(a => {
              const line = lines.find(l => l.line_id === a.line_id)
              const member = members.find(m => m.user_id === a.user_id)
              const cue = cues.find(c => c.line_id === a.line_id && c.user_id === a.user_id)
              if (!line || !member) return null
              return (
                <div key={a.assignment_id} className="bg-gray-50 rounded-xl px-4 py-3 text-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-indigo-500 font-medium mb-0.5">{line.section_label}</p>
                      <p className="text-gray-800 truncate">{line.lyric_text}</p>
                      {cue && (
                        <p className="text-xs text-gray-400 mt-1">Cue: {cue.cue_text}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0 space-y-1">
                      <p className="text-gray-700 font-medium">{member.name}</p>
                      <p className="text-xs text-gray-400 capitalize">{member.role}</p>
                      <button
                        onClick={() => handleEditClick(a)}
                        className="text-xs text-indigo-500 hover:underline block ml-auto"
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {assignments.length === 0 && lines.length > 0 && (
        <p className="text-xs text-gray-400 mt-6">No assignments yet for this song.</p>
      )}
    </div>
  )
}
