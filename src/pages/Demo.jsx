import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ManagerDashboard from './ManagerDashboard'
import SingerDashboard from './SingerDashboard'
import MusicianDashboard from './MusicianDashboard'
import { AuthContext } from '../context/authContextCore'
import { demoIdentities, resetDemoStore } from '../demo/demoClient'
import GuidedTour from '../components/demo/GuidedTour'

const roles = [
  { id: 'manager', label: 'Manager' },
  { id: 'singer', label: 'Singer' },
  { id: 'musician', label: 'Musician' },
]

const tourSteps = [
  {
    chapter: 'Manager · Setup',
    selector: '[data-demo-tour="manager-new-group"]',
    event: 'click',
    title: 'Create a rehearsal group',
    description: 'Click New group. A group keeps one team’s songs, people, assignments, and confirmations together.',
  },
  {
    chapter: 'Manager · Setup',
    selector: '[data-demo-tour="create-group-form"]',
    event: 'click',
    actionSelector: '[data-demo-tour="create-group-submit"]',
    validate: target => Boolean(target.querySelector('[data-demo-tour="create-group-name"]')?.value.trim()),
    delay: 450,
    title: 'Name the group',
    description: 'Enter a group name, then click Create Group. The whole form is active; the rest of the app stays paused.',
  },
  {
    chapter: 'Manager · Setup',
    selector: '[data-demo-tour="create-song-form"]',
    event: 'click',
    allowTab: true,
    actionSelector: '[data-demo-tour="create-song-submit"]',
    validate: target => Boolean(
      target.querySelector('[data-demo-tour="create-song-title"]')?.value.trim()
      && target.querySelector('[data-demo-tour="create-song-bpm"]')?.value
      && target.querySelector('[data-demo-tour="create-song-scale"]')?.value.trim()
    ),
    delay: 500,
    title: 'Create the first song',
    description: 'Add a title, BPM, and scale, then click Add Song. These details remain visible to everyone during rehearsal.',
  },
  {
    chapter: 'Manager · Song',
    selector: '[data-demo-tour="add-lyrics-form"]',
    event: 'click',
    actionSelector: '[data-demo-tour="add-section-submit"]',
    validate: target => {
      const lyrics = target.querySelector('[data-demo-tour="add-lyrics-input"]')?.value.trim().split('\n').filter(Boolean) || []
      return lyrics.length >= 2
    },
    delay: 500,
    title: 'Add lyrics and line notes',
    description: 'Copy the two lines below, paste them into Lyrics, then click Add Section. Line-level notation is optional; the next step shows how to add a note to an exact word.',
    example: 'City lights are fading into blue\nWe find the rhythm pulling us through',
  },
  {
    chapter: 'Manager · Song',
    selector: '[data-demo-tour="word-note-trigger"]',
    event: 'click',
    title: 'Choose one lyric word',
    description: 'Click the + above a word. Word notes let you place a chord, pitch, breath, or performance instruction exactly where it belongs.',
  },
  {
    chapter: 'Manager · Song',
    selector: '[data-demo-tour="word-note-editor"]',
    event: 'click',
    actionSelector: '[data-demo-tour="word-note-save"]',
    validate: target => Boolean(target.querySelector('[data-demo-tour="word-note-input"]')?.value.trim()),
    delay: 350,
    title: 'Save an individual word note',
    description: 'Choose a note, chord, or instruction from the dropdown, then click Save. It will appear directly above that word for musicians.',
  },
  {
    chapter: 'Manager · People',
    selector: '[data-demo-tour="manager-tab-members"]',
    event: 'click',
    title: 'Open People',
    description: 'Click People to add the performers who will rehearse this song.',
  },
  {
    chapter: 'Manager · People',
    selector: '[data-demo-tour="invite-member-form"]',
    event: 'click',
    actionSelector: '[data-demo-tour="invite-member-submit"]',
    validate: target => target.querySelector('[data-demo-tour="invite-member-email"]')?.value.trim().toLowerCase() === 'maya@cue.demo',
    delay: 450,
    title: 'Add a singer',
    description: 'Choose Maya Shah and click Add Member. This creates the singer side of the group.',
  },
  {
    chapter: 'Manager · People',
    selector: '[data-demo-tour="invite-member-form"]',
    event: 'click',
    actionSelector: '[data-demo-tour="invite-member-submit"]',
    validate: target => target.querySelector('[data-demo-tour="invite-member-email"]')?.value.trim().toLowerCase() === 'rohan@cue.demo',
    delay: 500,
    title: 'Add a musician',
    description: 'Choose Rohan Mehta and click Add Member. Two members are enough to demonstrate both performer roles.',
  },
  {
    chapter: 'Manager · Assign',
    selector: '[data-demo-tour="manager-tab-assignments"]',
    event: 'click',
    title: 'Open Assign parts',
    description: 'Click Assign parts. Every lyric and notation line can go to a specific person.',
  },
  {
    chapter: 'Manager · Assign',
    selector: '[data-demo-tour="assignment-part-singer"]',
    event: 'click',
    title: 'Choose a lyric part',
    description: 'Click Lyrics on the first line to open the singer assignment editor.',
  },
  {
    chapter: 'Manager · Assign',
    selector: '[data-demo-tour="assignment-editor"]',
    event: 'click',
    actionSelector: '[data-demo-tour="assignment-save"]',
    validate: target => target.querySelector('[data-demo-tour="assignment-member-select"]')?.value === 'demo-singer-maya',
    delay: 450,
    title: 'Assign Maya',
    description: 'Select Maya Shah and click Save Assignment. Only eligible singers appear for a lyric part.',
  },
  {
    chapter: 'Manager · Assign',
    selector: '[data-demo-tour="assignment-part-musician"]',
    event: 'click',
    title: 'Choose the notation part',
    description: 'Click Notation on a line to assign the instrumental information separately.',
  },
  {
    chapter: 'Manager · Assign',
    selector: '[data-demo-tour="assignment-editor"]',
    event: 'click',
    actionSelector: '[data-demo-tour="assignment-save"]',
    validate: target => target.querySelector('[data-demo-tour="assignment-member-select"]')?.value === 'demo-musician-rohan',
    delay: 500,
    title: 'Assign Rohan',
    description: 'Select Rohan Mehta and click Save Assignment. The musician will see both line notes and word-level notes.',
  },
  {
    chapter: 'Manager · Confirm',
    selector: '[data-demo-tour="manager-tab-status"]',
    event: 'click',
    title: 'Open Confirmations',
    description: 'Click Confirmations to close the communication loop.',
  },
  {
    chapter: 'Manager · Confirm',
    selector: '[data-demo-tour="confirmation-board"]',
    event: 'manual',
    title: 'Know who has seen each update',
    description: 'A confirmation means a performer explicitly acknowledged a lyric, note, cue, or assignment change. Pending names still need to review it; confirmed names are up to date.',
  },
  {
    chapter: 'Singer · Navigate',
    selector: '[data-demo-tour="role-singer"]',
    event: 'click',
    delay: 400,
    title: 'Move to the singer view',
    description: 'Click Singer. This is the same shared rehearsal data, filtered for Maya’s responsibilities.',
  },
  {
    chapter: 'Singer · Navigate',
    selector: '[data-demo-tour="performer-song-select"]',
    event: 'change',
    validate: target => target.value === 'demo-song-signal',
    delay: 350,
    title: 'Select a song',
    description: 'Choose The Signal from the song selector. Performers can move through the rehearsal set without leaving this screen.',
  },
  {
    chapter: 'Singer · Navigate',
    selector: '[data-demo-tour="performer-song-select"]',
    event: 'change',
    validate: target => target.value === 'demo-song-closer',
    delay: 350,
    title: 'Return to the song with updates',
    description: 'Choose Closer Than We Know so we can review its pending changes.',
  },
  {
    chapter: 'Singer · Updates',
    selector: '[data-demo-tour="performer-updates"]',
    event: 'manual',
    title: 'Review updates before rehearsing',
    description: 'Updates summarize exactly what changed. Pending items need attention; History keeps already confirmed changes available for reference.',
  },
  {
    chapter: 'Singer · Updates',
    selector: '[data-demo-tour="performer-confirm"]',
    event: 'click',
    delay: 400,
    title: 'Confirm an update',
    description: 'Click Confirm. The manager’s confirmation board now knows Maya has seen this change.',
  },
  {
    chapter: 'Singer · Rehearse',
    selector: '[data-demo-tour="performer-sections"]',
    event: 'click',
    title: 'Open Your Sections',
    description: 'Click Your Sections. It is a shortcut list of the song areas containing Maya’s assigned lines.',
  },
  {
    chapter: 'Singer · Rehearse',
    selector: '[data-demo-tour="singer-lyrics"]',
    event: 'manual',
    title: 'Read assignment emphasis',
    description: 'Maya’s assigned lyrics are emphasized in color and weight. Everyone else’s lines remain visible in grey for context, so she never loses her place.',
  },
  {
    chapter: 'Singer · Display',
    selector: '[data-demo-tour="font-increase"]',
    event: 'click',
    title: 'Increase the lyric size',
    description: 'Click A+ to make lyrics easier to read at a distance.',
  },
  {
    chapter: 'Singer · Display',
    selector: '[data-demo-tour="font-decrease"]',
    event: 'click',
    title: 'Decrease the lyric size',
    description: 'Click A− to return to a more compact view.',
  },
  {
    chapter: 'Singer · Display',
    selector: '[data-demo-tour="performer-dark-display"]',
    event: 'click',
    title: 'Enter Dark display',
    description: 'Click Dark for a low-light rehearsal room.',
  },
  {
    chapter: 'Singer · Display',
    selector: '[data-demo-tour="performer-light-display"]',
    event: 'click',
    title: 'Return to Light display',
    description: 'Click Light for normal room lighting.',
  },
  {
    chapter: 'Singer · Display',
    selector: '[data-demo-tour="performer-stage-mode"]',
    event: 'click',
    title: 'Enter Stage Mode',
    description: 'Click Enter Stage Mode. Setup panels disappear and unassigned material is reduced so the live-performance view stays focused.',
  },
  {
    chapter: 'Singer · Display',
    selector: '[data-demo-tour="performer-stage-mode"]',
    event: 'click',
    title: 'Exit Stage Mode',
    description: 'Click Exit Stage to return to the full rehearsal workspace.',
  },
  {
    chapter: 'Musician · Rehearse',
    selector: '[data-demo-tour="role-musician"]',
    event: 'click',
    delay: 450,
    title: 'Move to the musician view',
    description: 'Click Musician. Navigation, updates, confirmations, sections, font sizing, and display modes work exactly the same here.',
  },
  {
    chapter: 'Musician · Rehearse',
    selector: '[data-demo-tour="performer-group-select"]',
    event: 'change',
    validate: target => target.value !== 'demo-group-riverside',
    delay: 450,
    title: 'Open the group you created',
    description: 'Choose your newly created group. This lets Rohan rehearse the song and notes you added during the manager walkthrough.',
  },
  {
    chapter: 'Musician · Rehearse',
    selector: '[data-demo-tour="musician-notation"]',
    event: 'manual',
    title: 'See notation above the lyrics',
    description: 'The musician view adds word-level notes above the same lyrics, while assigned material, cues, sections, updates, confirmations, font controls, and display modes behave just as they did for the singer.',
  },
]

function resetDemoPreferences() {
  localStorage.removeItem('demo_performer_fontSize')
  localStorage.removeItem('demo_performer_stageMode')
  localStorage.removeItem('demo_performer_darkDisplay')
}

export default function Demo() {
  const navigate = useNavigate()
  const [role, setRole] = useState(() => {
    resetDemoStore()
    resetDemoPreferences()
    return 'manager'
  })
  const [version, setVersion] = useState(0)
  const [tourRun, setTourRun] = useState(0)
  const identity = demoIdentities[role]

  function reset() {
    resetDemoStore()
    resetDemoPreferences()
    setVersion(current => current + 1)
    setRole('manager')
    setTourRun(current => current + 1)
  }

  const authValue = {
    user: identity.user,
    profile: identity.profile,
    session: { user: identity.user },
    loading: false,
    logout: () => navigate('/'),
  }

  return (
    <AuthContext.Provider value={authValue}>
      <div key={`${role}-${version}`} className="pb-24">
        {role === 'manager' && <ManagerDashboard />}
        {role === 'singer' && <SingerDashboard />}
        {role === 'musician' && <MusicianDashboard />}
      </div>

      <div className="fixed bottom-4 left-1/2 z-[100] w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 rounded-2xl border border-[#F0D7C8] bg-white/95 p-2 shadow-2xl backdrop-blur">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/')} className="hidden rounded-xl px-3 py-2 text-xs font-semibold text-gray-500 hover:bg-gray-100 sm:block">
            Exit demo
          </button>
          <div className="grid min-w-0 flex-1 grid-cols-3 gap-1 rounded-xl bg-[#FFF4EA] p-1" aria-label="Switch demo role">
            {roles.map(item => (
              <button
                key={item.id}
                data-demo-tour={`role-${item.id}`}
                onClick={() => setRole(item.id)}
                className={`rounded-lg px-2 py-2 text-xs font-semibold transition ${role === item.id ? 'bg-[#12100A] text-white shadow-sm' : 'text-[#5F5550] hover:bg-white'}`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <button onClick={reset} className="rounded-xl px-3 py-2 text-xs font-semibold text-gray-500 hover:bg-gray-100">
            Reset
          </button>
        </div>
        <p className="mt-1 text-center text-[10px] text-gray-400">Demo data only · the screens and controls are the same as the signed-in app</p>
      </div>
      <GuidedTour key={tourRun} steps={tourSteps} />
    </AuthContext.Provider>
  )
}
