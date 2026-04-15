import { useEffect, useState } from 'react'
import { supabase } from '../../supabase/client'

export default function MemberList({ groupId, onMembersLoaded }) {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [removingId, setRemovingId] = useState(null)

  useEffect(() => {
    fetchMembers()
  }, [groupId])

  async function fetchMembers() {
    setLoading(true)

    const { data: memberData, error: memberError } = await supabase
      .from('group_members')
      .select('user_id')
      .eq('group_id', groupId)

    if (memberError || !memberData) { setLoading(false); return }

    const userIds = memberData.map(m => m.user_id)

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('user_id, name, role')
      .in('user_id', userIds)

    if (userError || !userData) { setLoading(false); return }

    setMembers(userData)
    if (onMembersLoaded) onMembersLoaded(userData)
    setLoading(false)
  }

  async function handleRemoveMember(member) {
    if (!window.confirm(`Remove ${member.name} from this group?`)) return
    setRemovingId(member.user_id)

    const { error } = await supabase
      .from('group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', member.user_id)

    if (error) { setRemovingId(null); return }

    const updated = members.filter(m => m.user_id !== member.user_id)
    setMembers(updated)
    if (onMembersLoaded) onMembersLoaded(updated)
    setRemovingId(null)
  }

  const roleStyle = {
    singer: { background: '#FCE7F3', color: '#DB2777' },
    musician: { background: '#DBEAFE', color: '#2563EB' },
    manager: { background: '#F3E8FF', color: '#9333EA' },
  }

  if (loading) return (
    <div className="bg-white rounded-2xl shadow-sm border border-orange-100 p-5">
      <div className="flex items-center justify-center py-4">
        <div className="w-5 h-5 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
      </div>
    </div>
  )

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-orange-100 p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-orange-700 mb-1">Roster</p>
          <h2 className="text-lg font-semibold text-gray-800">Group Members</h2>
        </div>
        <span className="text-xs font-semibold text-gray-500 bg-gray-100 rounded-full px-3 py-1">
          {members.length} total
        </span>
      </div>
      {members.length === 0 ? (
        <p className="text-sm text-gray-400">No members yet. Add some above.</p>
      ) : (
        <div className="space-y-2">
          {members.map(member => (
            <div
              key={member.user_id}
              className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-xl border border-gray-100"
            >
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-800">{member.name}</span>
                <span
                  className="text-xs font-medium px-2 py-1 rounded-full"
                  style={roleStyle[member.role] || { background: '#f3f4f6', color: '#4b5563' }}
                >
                  {member.role}
                </span>
              </div>
              <button
                onClick={() => handleRemoveMember(member)}
                disabled={removingId === member.user_id}
                className="text-xs text-red-400 hover:text-red-600 hover:underline disabled:opacity-40 transition"
              >
                {removingId === member.user_id ? 'Removing…' : 'Remove'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
