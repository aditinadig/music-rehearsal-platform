import { useEffect, useState } from 'react'
import { supabase } from '../../supabase/client'

const demoPeople = [
  { userId: 'demo-singer-maya', name: 'Maya Shah', role: 'Singer', email: 'maya@cue.demo' },
  { userId: 'demo-musician-rohan', name: 'Rohan Mehta', role: 'Musician', email: 'rohan@cue.demo' },
]

export default function InviteMember({ groupId, onMemberAdded }) {
  const isDemo = window.location.pathname.startsWith('/demo')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('singer')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [addedDemoEmails, setAddedDemoEmails] = useState(new Set())

  useEffect(() => {
    if (!isDemo) return undefined
    let cancelled = false

    async function loadExistingDemoMembers() {
      const { data } = await supabase
        .from('group_members')
        .select('user_id')
        .eq('group_id', groupId)
      if (cancelled) return
      const memberIds = new Set((data || []).map(member => member.user_id))
      setAddedDemoEmails(new Set(demoPeople.filter(person => memberIds.has(person.userId)).map(person => person.email)))
    }

    loadExistingDemoMembers()
    return () => { cancelled = true }
  }, [groupId, isDemo])

  const availableDemoPeople = demoPeople.filter(person => !addedDemoEmails.has(person.email))

  async function handleInvite() {
    if (!email.trim()) return
    const selectedEmail = email.trim().toLowerCase()
    setLoading(true)
    setError('')
    setSuccess('')

    if (isDemo) {
      const { data: authData, error: authError } = await supabase
        .rpc('get_user_id_by_email', { email_input: selectedEmail })
      if (authError || !authData) {
        setError('This demo performer could not be found.')
        setLoading(false)
        return
      }
      const { error: memberError } = await supabase
        .from('group_members')
        .insert({ group_id: groupId, user_id: authData })
      if (memberError) {
        setError(memberError.code === '23505' ? 'This performer is already in the group.' : memberError.message)
        setLoading(false)
        return
      }
      setAddedDemoEmails(current => new Set(current).add(selectedEmail))
      setSuccess('Member added successfully!')
    } else {
      if (!name.trim()) {
        setError('Enter the performer’s name.')
        setLoading(false)
        return
      }
      const { data, error: inviteError } = await supabase.functions.invoke('invite-group-member', {
        body: { groupId, name: name.trim(), email: selectedEmail, role },
      })
      if (inviteError || !data?.ok) {
        setError(data?.error || inviteError?.message || 'Unable to send the invitation.')
        setLoading(false)
        return
      }
      setName('')
      setSuccess(data.status === 'existing'
        ? 'Existing Cue user added. A secure group link was emailed.'
        : 'Invitation sent. They can set their password from the email.')
    }

    setEmail('')
    setLoading(false)
    onMemberAdded()
  }

  return (
    <div data-demo-tour="invite-member-form" className="rounded-2xl shadow-sm border border-orange-100 p-5 bg-gradient-to-br from-white to-orange-50">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-orange-700 mb-1">People</p>
          <h2 className="text-lg font-semibold text-gray-800">Add Members</h2>
          <p className="text-sm text-gray-500 mt-1">
            {isDemo
              ? 'Choose from the prepared singers and musicians.'
              : 'Enter a performer once. New users set their password from a secure email; existing users receive the group link.'}
          </p>
        </div>
        <span className="rounded-xl bg-white border border-orange-100 px-3 py-2 text-xs font-bold text-orange-700 shadow-sm">TEAM</span>
      </div>

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

      {isDemo ? (
        <div className="flex gap-3">
          <select
            data-demo-tour="invite-member-email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            disabled={availableDemoPeople.length === 0}
            className="min-w-0 flex-1 border border-gray-300 bg-white rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
          >
            <option value="">{availableDemoPeople.length > 0 ? 'Choose a demo performer…' : 'Both demo performers have been added'}</option>
            {availableDemoPeople.map(person => (
              <option key={person.email} value={person.email}>{person.name} — {person.role}</option>
            ))}
          </select>
          <button
            data-demo-tour="invite-member-submit"
            onClick={handleInvite}
            disabled={loading || !email.trim()}
            className="bg-violet-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-violet-700 transition disabled:opacity-50"
          >
            {loading ? 'Adding...' : 'Add Member'}
          </button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <label>
            <span className="mb-1 block text-xs font-medium text-gray-600">Name</span>
            <input value={name} onChange={event => setName(event.target.value)} placeholder="Performer name" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-400" />
          </label>
          <label>
            <span className="mb-1 block text-xs font-medium text-gray-600">Email</span>
            <input data-demo-tour="invite-member-email" type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="performer@example.com" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-400" />
          </label>
          <label>
            <span className="mb-1 block text-xs font-medium text-gray-600">Role</span>
            <select value={role} onChange={event => setRole(event.target.value)} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-400">
              <option value="singer">Singer</option>
              <option value="musician">Musician</option>
            </select>
          </label>
          <button data-demo-tour="invite-member-submit" onClick={handleInvite} disabled={loading || !name.trim() || !email.trim()} className="self-end rounded-lg bg-violet-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-violet-700 disabled:opacity-50">
            {loading ? 'Sending…' : 'Send secure invite'}
          </button>
        </div>
      )}
    </div>
  )
}
