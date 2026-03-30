import { useState } from 'react'
import { supabase } from '../../supabase/client'

export default function InviteMember({ groupId, onMemberAdded }) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function handleInvite() {
    if (!email.trim()) return
    setLoading(true)
    setError('')
    setSuccess('')

    // Find user by email in auth.users via our users table
    // We need to look up the user by email from the users table
    // But users table does not store email, so we use a Supabase function
    const { data: authData, error: authError } = await supabase
      .rpc('get_user_id_by_email', { email_input: email.trim() })

    if (authError || !authData) {
      setError('No user found with that email. Make sure they have registered first.')
      setLoading(false)
      return
    }

    // Add them to the group
    const { error: memberError } = await supabase
      .from('group_members')
      .insert({ group_id: groupId, user_id: authData })

    if (memberError) {
      if (memberError.code === '23505') {
        setError('This user is already in the group.')
      } else {
        setError(memberError.message)
      }
      setLoading(false)
      return
    }

    setEmail('')
    setSuccess('Member added successfully!')
    setLoading(false)
    onMemberAdded()
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-1">Add Members</h2>
      <p className="text-sm text-gray-400 mb-4">
        Add singers and musicians to your group by their email address.
        They must have already registered.
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

      <div className="flex gap-3">
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="member@email.com"
          className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
        <button
          onClick={handleInvite}
          disabled={loading || !email.trim()}
          className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition disabled:opacity-50"
        >
          {loading ? 'Adding...' : 'Add Member'}
        </button>
      </div>
    </div>
  )
}