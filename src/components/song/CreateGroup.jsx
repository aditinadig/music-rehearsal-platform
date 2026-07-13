import { useState } from 'react'
import { supabase } from '../../supabase/client'
import { useAuth } from '../../context/useAuth'

export default function CreateGroup({ onGroupCreated }) {
  const { user } = useAuth()
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleCreate() {
    if (!name.trim()) return
    setLoading(true)
    setError('')

    // Create the group
    const { data, error: groupError } = await supabase
      .from('groups')
      .insert({ name, manager_id: user.id })
      .select()
      .single()

    if (groupError) {
      setError(groupError.message)
      setLoading(false)
      return
    }

    // Add manager as a member of the group
    const { error: memberError } = await supabase
      .from('group_members')
      .insert({ group_id: data.group_id, user_id: user.id })

    if (memberError) {
      setError(memberError.message)
      setLoading(false)
      return
    }

    setName('')
    setLoading(false)
    onGroupCreated(data)
  }

  return (
    <div data-demo-tour="create-group-form" className="rounded-2xl shadow-sm border border-orange-100 p-5 bg-gradient-to-br from-white to-orange-50">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-orange-700 mb-1">Workspace</p>
          <h2 className="text-lg font-semibold text-gray-800">Create a Group</h2>
        </div>
        <span className="rounded-xl bg-white border border-orange-100 px-3 py-2 text-xs font-bold text-orange-700 shadow-sm">GROUP</span>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 text-sm rounded-lg px-4 py-3 mb-4">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <input
          data-demo-tour="create-group-name"
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Group name (e.g. Chennai Choir)"
          className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
        <button
          data-demo-tour="create-group-submit"
          onClick={handleCreate}
          disabled={loading || !name.trim()}
          className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition disabled:opacity-50"
        >
          {loading ? 'Creating...' : 'Create'}
        </button>
      </div>
    </div>
  )
}
