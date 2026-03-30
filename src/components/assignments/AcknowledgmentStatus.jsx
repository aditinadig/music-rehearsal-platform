import { useState, useEffect } from 'react'
import { supabase } from '../../supabase/client'

export default function AcknowledgmentStatus({ songId }) {
  const [changes, setChanges] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchChanges()
  }, [songId])

  async function fetchChanges() {
    setLoading(true)

    const { data, error } = await supabase
      .from('change_log')
      .select(`
        change_id,
        change_type,
        new_value,
        changed_at,
        lines(lyric_text, section_label),
        acknowledgments(confirmed, user_id, users(name))
      `)
      .eq('lines.song_id', songId)
      .order('changed_at', { ascending: false })
      .limit(20)

    if (!error && data) setChanges(data)
    setLoading(false)
  }

  if (loading) return <p className="text-sm text-gray-400">Loading changes...</p>
  if (changes.length === 0) return null

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Change Status</h2>
      <div className="space-y-4">
        {changes.map(change => {
          const total = change.acknowledgments?.length || 0
          const confirmed = change.acknowledgments?.filter(a => a.confirmed).length || 0

          return (
            <div key={change.change_id} className="border border-gray-100 rounded-xl p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="text-sm text-gray-800">{change.new_value}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {change.lines?.section_label} — "{change.lines?.lyric_text}"
                  </p>
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                  confirmed === total && total > 0
                    ? 'bg-green-100 text-green-600'
                    : 'bg-yellow-100 text-yellow-600'
                }`}>
                  {confirmed}/{total} confirmed
                </span>
              </div>

              {change.acknowledgments?.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {change.acknowledgments.map(ack => (
                    <span
                      key={ack.user_id}
                      className={`text-xs px-2 py-1 rounded-full ${
                        ack.confirmed
                          ? 'bg-green-50 text-green-600'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {ack.users?.name} {ack.confirmed ? '✓' : '...'}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}