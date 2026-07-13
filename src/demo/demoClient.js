const ids = {
  manager: 'demo-manager',
  singer: 'demo-singer-maya',
  singerTwo: 'demo-singer-priya',
  musician: 'demo-musician-rohan',
  group: 'demo-group-riverside',
  song: 'demo-song-closer',
  songTwo: 'demo-song-signal',
}

const idFields = {
  groups: 'group_id',
  songs: 'song_id',
  lines: 'line_id',
  assignments: 'assignment_id',
  cues: 'cue_id',
  word_notes: 'note_id',
  change_log: 'change_id',
  acknowledgments: 'ack_id',
}

let counter = 100
let database = {}

function now(offsetMinutes = 0) {
  return new Date(Date.now() + offsetMinutes * 60_000).toISOString()
}

function seedDatabase() {
  return {
    users: [
      { user_id: ids.manager, name: 'Aditi', role: 'manager', email: 'aditi@cue.demo' },
      { user_id: ids.singer, name: 'Maya Shah', role: 'singer', email: 'maya@cue.demo' },
      { user_id: ids.singerTwo, name: 'Priya Rao', role: 'singer', email: 'priya@cue.demo' },
      { user_id: ids.musician, name: 'Rohan Mehta', role: 'musician', email: 'rohan@cue.demo' },
    ],
    groups: [
      { group_id: ids.group, name: 'The Riverside Sessions', manager_id: ids.manager, created_at: now(-240) },
    ],
    group_members: [
      { group_id: ids.group, user_id: ids.manager },
      { group_id: ids.group, user_id: ids.singer },
      { group_id: ids.group, user_id: ids.singerTwo },
      { group_id: ids.group, user_id: ids.musician },
    ],
    songs: [
      { song_id: ids.song, group_id: ids.group, title: 'Closer Than We Know', bpm: 92, scale: 'C major', created_by: ids.manager, created_at: now(-180) },
      { song_id: ids.songTwo, group_id: ids.group, title: 'The Signal', bpm: 108, scale: 'A minor', created_by: ids.manager, created_at: now(-120) },
    ],
    lines: [
      { line_id: 'demo-line-1', song_id: ids.song, section_label: 'Verse 1', line_number: 1, lyric_text: 'The room goes quiet, then the first light falls', notation_text: 'Am' },
      { line_id: 'demo-line-2', song_id: ids.song, section_label: 'Verse 1', line_number: 2, lyric_text: 'We find the rhythm underneath it all', notation_text: 'F  C' },
      { line_id: 'demo-line-3', song_id: ids.song, section_label: 'Chorus', line_number: 3, lyric_text: 'Hold on, we are closer than we know', notation_text: 'Am  F  C  G' },
      { line_id: 'demo-line-4', song_id: ids.song, section_label: 'Chorus', line_number: 4, lyric_text: 'Every voice will lead us home', notation_text: 'F  G  C' },
      { line_id: 'demo-line-5', song_id: ids.song, section_label: 'Bridge', line_number: 5, lyric_text: 'Listen for the space between the sound', notation_text: 'Dm  Am' },
      { line_id: 'demo-line-6', song_id: ids.songTwo, section_label: 'Verse 1', line_number: 1, lyric_text: 'Send the signal through the open air', notation_text: 'Am  G' },
      { line_id: 'demo-line-7', song_id: ids.songTwo, section_label: 'Chorus', line_number: 2, lyric_text: 'We will meet you when the lights are there', notation_text: 'F  C  G' },
    ],
    assignments: [
      { assignment_id: 'demo-assignment-1', line_id: 'demo-line-2', user_id: ids.singer, assigned_by: ids.manager },
      { assignment_id: 'demo-assignment-2', line_id: 'demo-line-3', user_id: ids.singer, assigned_by: ids.manager },
      { assignment_id: 'demo-assignment-3', line_id: 'demo-line-1', user_id: ids.singerTwo, assigned_by: ids.manager },
      { assignment_id: 'demo-assignment-4', line_id: 'demo-line-4', user_id: ids.singerTwo, assigned_by: ids.manager },
      { assignment_id: 'demo-assignment-5', line_id: 'demo-line-1', user_id: ids.musician, assigned_by: ids.manager },
      { assignment_id: 'demo-assignment-6', line_id: 'demo-line-3', user_id: ids.musician, assigned_by: ids.manager },
      { assignment_id: 'demo-assignment-7', line_id: 'demo-line-4', user_id: ids.musician, assigned_by: ids.manager },
      { assignment_id: 'demo-assignment-8', line_id: 'demo-line-6', user_id: ids.singer, assigned_by: ids.manager },
      { assignment_id: 'demo-assignment-9', line_id: 'demo-line-6', user_id: ids.musician, assigned_by: ids.manager },
    ],
    cues: [
      { cue_id: 'demo-cue-1', line_id: 'demo-line-1', user_id: ids.singerTwo, cue_text: 'Begin after the four-count', created_by: ids.manager },
      { cue_id: 'demo-cue-2', line_id: 'demo-line-3', user_id: ids.singer, cue_text: 'Enter after the second guitar hit', created_by: ids.manager },
      { cue_id: 'demo-cue-3', line_id: 'demo-line-3', user_id: ids.musician, cue_text: 'Open up on the second chorus', created_by: ids.manager },
      { cue_id: 'demo-cue-4', line_id: 'demo-line-4', user_id: ids.singerTwo, cue_text: 'Harmony enters on “voice”', created_by: ids.manager },
      { cue_id: 'demo-cue-5', line_id: 'demo-line-6', user_id: ids.musician, cue_text: 'Clean guitar after the count-in', created_by: ids.manager },
    ],
    word_notes: [
      { note_id: 'demo-note-1', line_id: 'demo-line-3', word_index: 0, note_text: 'Am', created_by: ids.manager },
      { note_id: 'demo-note-2', line_id: 'demo-line-3', word_index: 2, note_text: 'F', created_by: ids.manager },
      { note_id: 'demo-note-3', line_id: 'demo-line-3', word_index: 5, note_text: 'C', created_by: ids.manager },
      { note_id: 'demo-note-4', line_id: 'demo-line-4', word_index: 0, note_text: 'F', created_by: ids.manager },
      { note_id: 'demo-note-5', line_id: 'demo-line-4', word_index: 3, note_text: 'G', created_by: ids.manager },
    ],
    change_log: [
      { change_id: 'demo-change-1', line_id: 'demo-line-3', change_type: 'lyric_edited', old_value: 'Hold on, we are closer than before', new_value: 'Hold on, we are closer than we know', changed_by: ids.manager, changed_at: now(-25) },
      { change_id: 'demo-change-2', line_id: 'demo-line-3', change_type: 'cue_changed', old_value: 'Enter after guitar', new_value: 'Enter after the second guitar hit', changed_by: ids.manager, changed_at: now(-18) },
      { change_id: 'demo-change-3', line_id: 'demo-line-4', change_type: 'note_edited', old_value: 'F  G', new_value: 'F  G  C', changed_by: ids.manager, changed_at: now(-12) },
    ],
    acknowledgments: [
      { ack_id: 'demo-ack-1', change_id: 'demo-change-1', user_id: ids.singer, confirmed: false, confirmed_at: null },
      { ack_id: 'demo-ack-2', change_id: 'demo-change-2', user_id: ids.singer, confirmed: true, confirmed_at: now(-10) },
      { ack_id: 'demo-ack-3', change_id: 'demo-change-3', user_id: ids.musician, confirmed: false, confirmed_at: null },
    ],
  }
}

export function resetDemoStore() {
  counter = 100
  database = seedDatabase()
}

resetDemoStore()

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value))
}

function nextId(table) {
  counter += 1
  return `demo-${table}-${counter}`
}

function decorateRelations(table, row, selection) {
  const result = { ...row }

  if (table === 'group_members' && selection.includes('groups(')) {
    result.groups = clone(database.groups.find(group => group.group_id === row.group_id) || null)
  }
  if (table === 'group_members' && selection.includes('users(')) {
    result.users = clone(database.users.find(user => user.user_id === row.user_id) || null)
  }
  if (table === 'acknowledgments' && selection.includes('change_log')) {
    const change = database.change_log.find(item => item.change_id === row.change_id)
    const line = change ? database.lines.find(item => item.line_id === change.line_id) : null
    result.change_log = change ? { ...clone(change), lines: clone(line) } : null
  }
  if (table === 'change_log' && selection.includes('acknowledgments')) {
    result.acknowledgments = database.acknowledgments
      .filter(ack => ack.change_id === row.change_id)
      .map(ack => ({
        ...clone(ack),
        users: clone(database.users.find(user => user.user_id === ack.user_id) || null),
      }))
  }
  return result
}

class DemoQuery {
  constructor(table) {
    this.table = table
    this.operation = 'select'
    this.payload = null
    this.selection = '*'
    this.filters = []
    this.sort = null
    this.maxRows = null
    this.returnRows = true
    this.singleMode = null
  }

  select(selection = '*') {
    this.selection = selection
    this.returnRows = true
    return this
  }

  insert(payload) {
    this.operation = 'insert'
    this.payload = Array.isArray(payload) ? payload : [payload]
    this.returnRows = false
    return this
  }

  update(payload) {
    this.operation = 'update'
    this.payload = payload
    this.returnRows = false
    return this
  }

  delete() {
    this.operation = 'delete'
    this.returnRows = false
    return this
  }

  eq(column, value) {
    this.filters.push(row => row[column] === value)
    return this
  }

  in(column, values) {
    this.filters.push(row => values.includes(row[column]))
    return this
  }

  order(column, options = {}) {
    this.sort = { column, ascending: options.ascending !== false }
    return this
  }

  limit(count) {
    this.maxRows = count
    return this
  }

  single() {
    this.singleMode = 'single'
    return this
  }

  maybeSingle() {
    this.singleMode = 'maybe'
    return this
  }

  matches(row) {
    return this.filters.every(filter => filter(row))
  }

  execute() {
    const tableRows = database[this.table]
    if (!tableRows) return { data: null, error: { message: `Unknown demo table: ${this.table}` } }

    let affected = []
    if (this.operation === 'select') {
      affected = tableRows.filter(row => this.matches(row))
    }

    if (this.operation === 'insert') {
      if (this.table === 'group_members') {
        const duplicate = this.payload.find(row => tableRows.some(existing => existing.group_id === row.group_id && existing.user_id === row.user_id))
        if (duplicate) return { data: null, error: { code: '23505', message: 'This user is already in the group.' } }
      }
      affected = this.payload.map(input => {
        const row = { ...clone(input) }
        const idField = idFields[this.table]
        if (idField && !row[idField]) row[idField] = nextId(this.table)
        if (['groups', 'songs'].includes(this.table) && !row.created_at) row.created_at = now()
        if (this.table === 'change_log' && !row.changed_at) row.changed_at = now()
        if (this.table === 'acknowledgments' && row.confirmed === undefined) row.confirmed = false
        tableRows.push(row)
        return row
      })
    }

    if (this.operation === 'update') {
      affected = tableRows.filter(row => this.matches(row))
      affected.forEach(row => Object.assign(row, clone(this.payload)))
    }

    if (this.operation === 'delete') {
      affected = tableRows.filter(row => this.matches(row))
      database[this.table] = tableRows.filter(row => !this.matches(row))
    }

    if (this.sort) {
      const { column, ascending } = this.sort
      affected = [...affected].sort((a, b) => {
        if (a[column] === b[column]) return 0
        if (a[column] === null || a[column] === undefined) return 1
        if (b[column] === null || b[column] === undefined) return -1
        return (a[column] > b[column] ? 1 : -1) * (ascending ? 1 : -1)
      })
    }
    if (this.maxRows !== null) affected = affected.slice(0, this.maxRows)

    const decorated = affected.map(row => decorateRelations(this.table, row, this.selection))
    let data = this.returnRows ? clone(decorated) : null
    if (this.singleMode === 'single') data = decorated.length === 1 ? clone(decorated[0]) : null
    if (this.singleMode === 'maybe') data = decorated.length > 0 ? clone(decorated[0]) : null
    return { data, error: null }
  }

  then(resolve, reject) {
    return Promise.resolve(this.execute()).then(resolve, reject)
  }
}

function createChannel() {
  return {
    on() { return this },
    subscribe() { return this },
    unsubscribe() {},
  }
}

export const demoSupabase = {
  from(table) {
    return new DemoQuery(table)
  },
  async rpc(name, params) {
    if (name !== 'get_user_id_by_email') return { data: null, error: { message: `Unknown demo RPC: ${name}` } }
    const user = database.users.find(item => item.email.toLowerCase() === params.email_input.toLowerCase())
    return { data: user?.user_id || null, error: user ? null : { message: 'User not found.' } }
  },
  channel() {
    return createChannel()
  },
  removeChannel() {},
  auth: {
    async getSession() {
      return { data: { session: null }, error: null }
    },
    onAuthStateChange() {
      return { data: { subscription: { unsubscribe() {} } } }
    },
    async signOut() {
      return { error: null }
    },
  },
}

export const demoIdentities = {
  manager: { user: { id: ids.manager }, profile: database.users.find(user => user.user_id === ids.manager) },
  singer: { user: { id: ids.singer }, profile: database.users.find(user => user.user_id === ids.singer) },
  musician: { user: { id: ids.musician }, profile: database.users.find(user => user.user_id === ids.musician) },
}
