import { useEffect, useState } from 'react'
import { supabase } from '../../supabase/client'

export default function MemberList({ groupId, onMembersLoaded }) {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMembers()
  }, [groupId])

  async function fetchMembers() {
    setLoading(true)

    const { data, error } = await supabase
      .from('group_members')
      .select('user_id, users(name, role)')
      .eq('group_id', groupId)

    if (!error) {
      const formatted = data.map(m => ({
        user_id: m.user_id,
        name: m.users.name,
        role: m.users.role
      }))
      setMembers(formatted)
      if (onMembersLoaded) onMembersLoaded(formatted)
    }

    setLoading(false)
  }

  const roleColor = {
    singer: 'bg-pink-100 text-pink-600',
    musician: 'bg-blue-100 text-blue-600',
    manager: 'bg-indigo-100 text-indigo-600'
  }

  if (loading) return <p className="text-sm text-gray-400">Loading members...</p>

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Group Members</h2>
      {members.length === 0 ? (
        <p className="text-sm text-gray-400">No members yet. Add some above.</p>
      ) : (
        <div className="space-y-2">
          {members.map(member => (
            <div
              key={member.user_id}
              className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-xl"
            >
              <span className="text-sm text-gray-800">{member.name}</span>
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${roleColor[member.role]}`}>
                {member.role}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}