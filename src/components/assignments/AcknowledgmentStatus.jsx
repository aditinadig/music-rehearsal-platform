import { useState, useEffect } from 'react'
import { supabase } from '../../supabase/client'

const CHANGE_LABELS = {
  assignment_changed: { label: 'Assignment', style: { background: '#E0E7FF', color: '#4F46E5' } },
  cue_changed: { label: 'Cue', style: { background: '#F3E8FF', color: '#9333EA' } },
  lyric_edited: { label: 'Lyric Edit', style: { background: '#FEF3C7', color: '#D97706' } },
  note_edited: { label: 'Note Update', style: { background: '#CCFBF1', color: '#0D9488' } },
}

function renderChangeValue(change) {
  if (!change.new_value) return null

  if (change.old_value) {
    return (
      <>
        <span className="line-through text-gray-400">{change.old_value}</span>
        {' -> '}
        {change.new_value}
      </>
    )
  }

  return change.new_value
}

export default function AcknowledgmentStatus({ songId }) {
  const [changes, setChanges] = useState([])
  const [loading, setLoading] = useState(true)
  const [recentlyConfirmedUsers, setRecentlyConfirmedUsers] = useState(new Set())

  useEffect(() => {
    fetchChanges()
  }, [songId])

  useEffect(() => {
    if (!songId) return

    const channel = supabase
      .channel(`manager-status-${songId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'change_log',
        },
        async () => {
          await fetchChanges()
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'acknowledgments',
        },
        async (payload) => {
          if (payload.new?.confirmed && !payload.old?.confirmed) {
            const userId = payload.new.user_id
            setRecentlyConfirmedUsers(prev => new Set(prev).add(userId))
            setTimeout(() => {
              setRecentlyConfirmedUsers(prev => {
                const next = new Set(prev)
                next.delete(userId)
                return next
              })
            }, 3000)
          }
          await fetchChanges()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [songId])

  async function fetchChanges() {
    setLoading(true)

    const { data: lineData } = await supabase
      .from('lines')
      .select('line_id, lyric_text, section_label')
      .eq('song_id', songId)

    if (!lineData?.length) {
      setChanges([])
      setLoading(false)
      return
    }

    const lineIds = lineData.map(line => line.line_id)
    const lineMap = Object.fromEntries(lineData.map(line => [line.line_id, line]))

    const { data, error } = await supabase
      .from('change_log')
      .select(`
        change_id,
        change_type,
        old_value,
        new_value,
        changed_at,
        line_id,
        acknowledgments ( user_id, confirmed, users(name) )
      `)
      .in('line_id', lineIds)
      .order('changed_at', { ascending: false })

    if (!error && data) {
      setChanges(data.map(change => ({ ...change, line: lineMap[change.line_id] })))
    }

    setLoading(false)
  }

  if (loading) return <p className="text-sm text-gray-400">Loading...</p>

  if (changes.length === 0) {
    return (
      <div data-demo-tour="confirmation-board" className="bg-white rounded-2xl shadow-sm border border-orange-100 p-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-orange-700 mb-1">Status board</p>
        <h2 className="text-lg font-semibold text-gray-800 mb-2">Update History</h2>
        <p className="text-sm text-gray-500 mb-3">
          Track edits and assignment changes that performers need to confirm.
        </p>
        <p className="text-sm text-gray-400">No changes have been pushed for this song yet.</p>
      </div>
    )
  }

  const totalAcks = changes.flatMap(change => change.acknowledgments || [])
  const confirmedCount = totalAcks.filter(ack => ack.confirmed).length

  return (
    <div data-demo-tour="confirmation-board" className="bg-white rounded-2xl shadow-sm border border-orange-100 p-5">
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-orange-700 mb-1">Status board</p>
          <h2 className="text-lg font-semibold text-gray-800">Update History</h2>
          <p className="text-sm text-gray-500 mt-1">
            Track edits and assignment changes that performers need to confirm.
          </p>
        </div>
        <span
          className={`text-xs font-medium px-3 py-1 rounded-full ${
            confirmedCount === totalAcks.length && totalAcks.length > 0
              ? 'bg-green-100 text-green-600'
              : 'bg-yellow-100 text-yellow-600'
          }`}
        >
          {confirmedCount}/{totalAcks.length} confirmed
        </span>
      </div>

      <div className="space-y-3">
        {changes.map(change => {
          const meta = CHANGE_LABELS[change.change_type] || {
            label: change.change_type,
            style: { background: '#f3f4f6', color: '#4b5563' },
          }
          const acknowledgments = change.acknowledgments || []
          const confirmed = acknowledgments.filter(ack => ack.confirmed).length

          return (
            <div key={change.change_id} className="border border-gray-100 rounded-xl p-4">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={meta.style}>
                      {meta.label}
                    </span>
                    <span className="text-xs text-gray-400">{change.line?.section_label}</span>
                  </div>
                  <p className="text-sm text-gray-700 truncate">"{change.line?.lyric_text}"</p>
                  {change.new_value && (
                    <p className="text-xs text-gray-500 mt-1">{renderChangeValue(change)}</p>
                  )}
                </div>
                <span
                  className={`text-xs font-medium px-2 py-1 rounded-full shrink-0 ${
                    confirmed === acknowledgments.length && acknowledgments.length > 0
                      ? 'bg-green-100 text-green-600'
                      : 'bg-yellow-100 text-yellow-600'
                  }`}
                >
                  {confirmed}/{acknowledgments.length}
                </span>
              </div>

              {acknowledgments.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {acknowledgments.map(ack => {
                    const justConfirmed = recentlyConfirmedUsers.has(ack.user_id) && ack.confirmed
                    return (
                      <span
                        key={ack.user_id}
                        className={`text-xs px-2 py-1 rounded-full transition-colors duration-300 ${
                          justConfirmed
                            ? 'bg-green-200 text-green-700 font-semibold ring-1 ring-green-400'
                            : ack.confirmed
                            ? 'bg-green-50 text-green-600'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {ack.users?.name} {ack.confirmed ? (justConfirmed ? 'Just confirmed!' : 'Confirmed') : 'Pending'}
                      </span>
                    )
                  })}
                </div>
              )}

              {acknowledgments.length === 0 && (
                <p className="text-xs text-gray-400">No performers need to acknowledge this change.</p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
