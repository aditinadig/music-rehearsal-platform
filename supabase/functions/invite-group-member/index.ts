import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return json({ ok: false, error: 'Method not allowed.' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const siteUrl = Deno.env.get('SITE_URL')?.replace(/\/$/, '')
  const authorization = request.headers.get('Authorization')

  if (!supabaseUrl || !anonKey || !serviceRoleKey || !siteUrl) {
    return json({ ok: false, error: 'Invitation service is not configured.' }, 500)
  }
  if (!authorization) return json({ ok: false, error: 'Authentication required.' }, 401)

  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: { user: caller }, error: callerError } = await callerClient.auth.getUser()
  if (callerError || !caller) return json({ ok: false, error: 'Your session is invalid.' }, 401)

  let input: { groupId?: string; name?: string; email?: string; role?: string }
  try {
    input = await request.json()
  } catch {
    return json({ ok: false, error: 'Invalid request.' }, 400)
  }

  const groupId = input.groupId?.trim()
  const name = input.name?.trim()
  const email = input.email?.trim().toLowerCase()
  const role = input.role?.trim()

  if (!groupId || !name || !email || !['singer', 'musician'].includes(role || '')) {
    return json({ ok: false, error: 'Name, email, group, and performer role are required.' }, 400)
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ ok: false, error: 'Enter a valid email address.' }, 400)
  }

  const [{ data: callerProfile }, { data: group }] = await Promise.all([
    admin.from('users').select('role').eq('user_id', caller.id).maybeSingle(),
    admin.from('groups').select('group_id, name, manager_id').eq('group_id', groupId).maybeSingle(),
  ])

  if (callerProfile?.role !== 'manager' || !group || group.manager_id !== caller.id) {
    return json({ ok: false, error: 'Only this group’s manager can invite performers.' }, 403)
  }

  const { data: existingProfile, error: lookupError } = await admin
    .from('users')
    .select('user_id, role')
    .eq('email', email)
    .maybeSingle()
  if (lookupError) return json({ ok: false, error: 'Unable to check this email.' }, 500)

  if (existingProfile) {
    if (existingProfile.role !== role) {
      return json({ ok: false, error: `This email already belongs to a ${existingProfile.role}. Choose the matching role.` }, 409)
    }
    const { error: membershipError } = await admin
      .from('group_members')
      .upsert({ group_id: groupId, user_id: existingProfile.user_id }, { onConflict: 'group_id,user_id', ignoreDuplicates: true })
    if (membershipError) return json({ ok: false, error: membershipError.message }, 500)

    const { error: emailError } = await admin.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: `${siteUrl}/app?joined=${encodeURIComponent(groupId)}`,
      },
    })
    if (emailError) return json({ ok: false, error: 'The member was added, but the group email could not be sent.' }, 502)
    return json({ ok: true, status: 'existing', groupName: group.name })
  }

  const { data: invitation, error: invitationError } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { name, role, invited_group_id: groupId },
    redirectTo: `${siteUrl}/accept-invite`,
  })
  const invitedUser = invitation?.user
  if (invitationError || !invitedUser) {
    return json({ ok: false, error: invitationError?.message || 'Unable to create the invitation.' }, 400)
  }

  const { error: profileError } = await admin.from('users').upsert({
    user_id: invitedUser.id,
    name,
    email,
    role,
  }, { onConflict: 'user_id' })
  const { error: membershipError } = profileError
    ? { error: null }
    : await admin.from('group_members').upsert(
      { group_id: groupId, user_id: invitedUser.id },
      { onConflict: 'group_id,user_id', ignoreDuplicates: true },
    )

  if (profileError || membershipError) {
    await admin.auth.admin.deleteUser(invitedUser.id)
    return json({ ok: false, error: profileError?.message || membershipError?.message || 'Unable to create the performer profile.' }, 500)
  }

  return json({ ok: true, status: 'invited', groupName: group.name })
})
