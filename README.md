# Cue: Music Rehearsal Platform

Cue is a web app for coordinating music rehearsals across managers, singers, and musicians. It replaces the usual mix of lyric sheets, chord screenshots, group chats, and last-minute verbal corrections with a role-aware rehearsal workspace: managers build songs line by line, assign lyric and notation responsibilities, attach entry cues, and track which performers have acknowledged each change.

## Try the Interactive Demo

Open `/demo` on the deployed app to explore a complete rehearsal workflow without creating an account. The demo renders the same manager, singer, and musician screens used after authentication, backed by a browser-only sample workspace. A blocking, action-gated tour spotlights one control at a time and guides visitors through assignments, cues, acknowledgements, Stage Mode, and role-specific views. Demo actions never write to production data, and resetting the workspace restarts the tour.

The project is intentionally centered on the human coordination problem in rehearsal. In a live or semi-live music setting, the hardest part is often not storing the song; it is making sure the right person sees the right part, understands what changed, and confirms that they are ready before rehearsal or performance.

## Core Experience

- Managers create rehearsal groups, invite performers by name, email, and role, build songs by section, and maintain lyrics, chords, notation, BPM, and scale metadata.
- Singers see the lyric lines assigned to them, with update prompts when lyrics, cues, or assignments change.
- Musicians see notation, chords, word-level notes, cues, BPM, and scale in a performance-oriented view.
- Performers can confirm updates, giving managers a live status board for who has seen each change.
- The app supports realtime refreshes for assignment and acknowledgement state so rehearsal coordination feels current without manual page reloads.

## HCI Focus

Cue is designed around role-specific attention. Managers need overview, control, and accountability; performers need clarity, low distraction, and confidence that they are looking at the latest version.

Key interaction choices include:

- **Role-based routing:** after login, users land directly in the workspace that matches their rehearsal responsibility: manager, singer, or musician.
- **Progressive song construction:** managers can paste lyrics section by section, add full-line notation, and then refine individual lines with word-level notes.
- **Separate lyric and notation assignment:** a single song line can expose different assignable parts, so a singer can own the lyric while a musician owns the chords or instrumental cue.
- **Cue-centered rehearsal support:** optional entry cues help performers understand when to come in, not just what to perform.
- **Acknowledgement loops:** every meaningful edit can create confirmation work for affected performers, turning "did everyone see this?" into a visible status state.
- **Undo affordances:** recent line edits and assignment changes expose short-lived undo actions, reducing anxiety around fast rehearsal edits.
- **Performer display preferences:** stage mode, dark display, collapsible sections, font-size preferences, and floating pending-update indicators support rehearsal and performance contexts.

## Backend Architecture

The app uses Supabase as the backend layer, with React calling Supabase directly from the client. Supabase provides authentication, Postgres data storage, RPC support, and realtime subscriptions.

The main data model is organized around these entities:

- `users`: application profile records linked to Supabase Auth users, including name, normalized email, and role.
- `groups`: rehearsal groups owned by managers.
- `group_members`: membership join table connecting users to groups.
- `songs`: songs within a group, including metadata such as title, BPM, and scale.
- `lines`: ordered song lines with section labels, lyric text, and optional notation.
- `word_notes`: word-indexed notes for precise chord or notation placement over lyrics.
- `assignments`: performer ownership of lyric or notation work on specific lines.
- `cues`: entry or timing cues attached to assigned lines.
- `change_log`: durable record of assignment, cue, lyric, and notation changes.
- `acknowledgments`: per-performer confirmation rows generated from change log entries.

Backend behavior is split between direct table operations and a manager-authorized invitation function:

- Authentication sessions are persisted through a custom Supabase auth storage adapter that mirrors session state to `localStorage` and a same-site cookie.
- Public registration creates manager accounts only. A database trigger creates the manager profile when the Auth account is created.
- Managers create groups and are automatically inserted as group members.
- Managers call the authenticated `invite-group-member` Edge Function with a performer name, email, and singer/musician role.
- New performers receive a Supabase invitation and choose their own password at `/accept-invite`; passwords are never generated or emailed by Cue.
- Existing Cue users are added to the group and receive a secure email login link instead of a second account.
- Line edits, cue changes, and assignment changes write to `change_log`, then create `acknowledgments` for affected performers.
- Performer dashboards subscribe to Supabase realtime changes for acknowledgements, assignments, and songs.
- Manager status views subscribe to change and acknowledgement updates to keep confirmation state current.

Because the client writes directly to Supabase tables, row-level security policies are an important part of any production deployment. The UI already assumes role-aware access patterns, but the database should enforce them too.

## Frontend Stack

- React 19
- React Router
- Vite
- Tailwind CSS
- Supabase JavaScript client

The app is organized around route-level dashboards and focused components:

- `src/pages/ManagerDashboard.jsx`: group, song, member, assignment, and status workspace.
- `src/pages/SingerDashboard.jsx`: singer portal wrapping the performer song view.
- `src/pages/MusicianDashboard.jsx`: musician portal wrapping the performer song view.
- `src/components/song/SongBuilder.jsx`: section-based song editing, line editing, word notes, metadata, and change logging.
- `src/components/assignments/AssignmentPanel.jsx`: lyric/notation assignment, cue editing, undo, and acknowledgement generation.
- `src/components/performer/PerformerSongView.jsx`: performer-facing rehearsal display, update confirmations, realtime refresh, and display preferences.
- `src/context/AuthContext.jsx`: Supabase session and profile loading.

## Local Development

Install dependencies:

```bash
npm install
```

Create a local environment file with Supabase credentials:

```bash
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Apply the invitation migration and deploy the authenticated Edge Function:

```bash
supabase db push
supabase secrets set SITE_URL=http://localhost:5173
supabase functions deploy invite-group-member
```

For production, set `SITE_URL` to the deployed HTTPS origin. Add both
`https://your-domain/accept-invite` and `https://your-domain/app` to the
Supabase Auth redirect URL allow list. Supabase provides `SUPABASE_URL`,
`SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` to deployed Edge Functions;
the service-role key must never be exposed through a `VITE_` client variable.

Start the development server:

```bash
npm run dev
```

Run lint checks:

```bash
npm run lint
```

Build for production:

```bash
npm run build
```

## Current Scope

Cue currently focuses on the rehearsal coordination loop: manager-controlled performer onboarding, song construction, assignments, role-specific views, and update acknowledgements. Natural next backend extensions include a complete versioned baseline schema, stricter RLS documentation, delivery monitoring for invitation email, and server-side cleanup or cascade policies for deleting songs and their dependent records.
