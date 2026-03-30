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

    // Fetch group_members first
    const { data: memberData, error: memberError } = await supabase
      .from('group_members')
      .select('user_id')
      .eq('group_id', groupId)

    if (memberError || !memberData) {
      setLoading(false)
      return
    }

    // Fetch each user's profile separately
    const userIds = memberData.map(m => m.user_id)

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('user_id, name, role')
      .in('user_id', userIds)

    if (userError || !userData) {
      setLoading(false)
      return
    }

    setMembers(userData)
    if (onMembersLoaded) onMembersLoaded(userData)
    setLoading(false)
  }

  const roleColor = {
    singer: 'bg-pink-100 text-pink-600',
    musician: 'bg-blue-100 text-blue-600',
    manager: 'bg-indigo-100 text-indigo-600'
  }

  if (loading) return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <p className="text-sm text-gray-400">Loading members...</p>
    </div>
  )

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