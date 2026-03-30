import { useState } from 'react'
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

  async function handleSave() {
    if (!selectedLine || !selectedMember) return
    setLoading(true)
    setError('')
    setSuccess('')

    // Check if assignment already exists for this line and user
    const { data: existing } = await supabase
      .from('assignments')
      .select('assignment_id')
      .eq('line_id', selectedLine)
      .eq('user_id', selectedMember)
      .single()

    if (existing) {
      // Update existing assignment - just update the change log
      const line = lines.find(l => l.line_id === selectedLine)
      const member = members.find(m => m.user_id === selectedMember)

      await writeChangeLog(
        selectedLine,
        'assignment_changed',
        null,
        `${member.name} assigned to: "${line.lyric_text}"`,
        selectedMember
      )
    } else {
      // Create new assignment
      const { error: assignError } = await supabase
        .from('assignments')
        .insert({
          line_id: selectedLine,
          user_id: selectedMember,
          assigned_by: user.id
        })

      if (assignError) {
        setError(assignError.message)
        setLoading(false)
        return
      }

      const line = lines.find(l => l.line_id === selectedLine)
      const member = members.find(m => m.user_id === selectedMember)

      await writeChangeLog(
        selectedLine,
        'assignment_changed',
        null,
        `${member.name} assigned to: "${line.lyric_text}"`,
        selectedMember
      )
    }

    // Save cue if provided
    if (cueText.trim()) {
      const { data: existingCue } = await supabase
        .from('cues')
        .select('cue_id')
        .eq('line_id', selectedLine)
        .eq('user_id', selectedMember)
        .single()

      if (existingCue) {
        await supabase
          .from('cues')
          .update({ cue_text: cueText, updated_at: new Date() })
          .eq('cue_id', existingCue.cue_id)
      } else {
        await supabase
          .from('cues')
          .insert({
            line_id: selectedLine,
            user_id: selectedMember,
            cue_text: cueText,
            created_by: user.id
          })
      }

      const line = lines.find(l => l.line_id === selectedLine)
      await writeChangeLog(
        selectedLine,
        'cue_changed',
        null,
        cueText,
        selectedMember
      )
    }

    setSuccess('Assignment saved!')
    setCueText('')
    setLoading(false)
    if (onAssignmentSaved) onAssignmentSaved()
  }

  async function writeChangeLog(lineId, changeType, oldValue, newValue, affectedUserId) {
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

    if (changeError || !changeData) return

    // Create acknowledgment row for the affected user
    await supabase
      .from('acknowledgments')
      .insert({
        change_id: changeData.change_id,
        user_id: affectedUserId,
        confirmed: false
      })
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
      <h2 className="text-lg font-semibold text-gray-800 mb-1">Assign Lines & Set Cues</h2>
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
    </div>
  )
}