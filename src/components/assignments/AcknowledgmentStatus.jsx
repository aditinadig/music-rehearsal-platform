import { useState, useEffect } from 'react'
import { supabase } from '../../supabase/client'

const CHANGE_LABELS = {
  assignment_changed: { label: 'Assignment', color: 'bg-indigo-100 text-indigo-600' },
  cue_changed:        { label: 'Cue',        color: 'bg-purple-100 text-purple-600' },
  lyric_edited:       { label: 'Lyric Edit', color: 'bg-amber-100 text-amber-600' },
  notation_edited:    { label: 'Notation Edit', color: 'bg-teal-100 text-teal-600' },
}

export default function AcknowledgmentStatus({ songId }) {
  const [changes, setChanges] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchChanges()
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

    const lineIds = lineData.map(l => l.line_id)
    const lineMap = Object.fromEntries(lineData.map(l => [l.line_id, l]))

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
      setChanges(data.map(c => ({ ...c, line: lineMap[c.line_id] })))
    }
    setLoading(false)
  }

  if (loading) return <p className="text-sm text-gray-400">Loading...</p>

  if (changes.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-2">Acknowledgment Status</h2>
        <p className="text-sm text-gray-400">No changes have been pushed for this song yet.</p>
      </div>
    )
  }

  const totalAcks = changes.flatMap(c => c.acknowledgments)
  const confirmedCount = totalAcks.filter(a => a.confirmed).length

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-semibold text-gray-800">Acknowledgment Status</h2>
        <span className={`text-xs font-medium px-3 py-1 rounded-full ${
          confirmedCount === totalAcks.length && totalAcks.length > 0
            ? 'bg-green-100 text-green-600'
            : 'bg-yellow-100 text-yellow-600'
        }`}>
          {confirmedCount}/{totalAcks.length} confirmed
        </span>
      </div>

      <div className="space-y-3">
        {changes.map(change => {
          const meta = CHANGE_LABELS[change.change_type] || { label: change.change_type, color: 'bg-gray-100 text-gray-600' }
          const acks = change.acknowledgments || []
          const confirmed = acks.filter(a => a.confirmed).length

          return (
            <div key={change.change_id} className="border border-gray-100 rounded-xl p-4">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${meta.color}`}>
                      {meta.label}
                    </span>
                    <span className="text-xs text-gray-400">{change.line?.section_label}</span>
                  </div>
                  <p className="text-sm text-gray-700 truncate">"{change.line?.lyric_text}"</p>
                  {change.new_value && (
                    <p className="text-xs text-gray-500 mt-1">
                      {change.change_type === 'lyric_edited' && (
                        <><span className="line-through text-gray-400">{change.old_value}</span>{' → '}{change.new_value}</>
                      )}
                      {change.change_type !== 'lyric_edited' && change.new_value}
                    </p>
                  )}
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded-full shrink-0 ${
                  confirmed === acks.length && acks.length > 0
                    ? 'bg-green-100 text-green-600'
                    : 'bg-yellow-100 text-yellow-600'
                }`}>
                  {confirmed}/{acks.length}
                </span>
              </div>

              {acks.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {acks.map(ack => (
                    <span
                      key={ack.user_id}
                      className={`text-xs px-2 py-1 rounded-full ${
                        ack.confirmed
                          ? 'bg-green-50 text-green-600'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {ack.users?.name} {ack.confirmed ? '✓' : '···'}
                    </span>
                  ))}
                </div>
              )}

              {acks.length === 0 && (
                <p className="text-xs text-gray-400">No performers need to acknowledge this change.</p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
