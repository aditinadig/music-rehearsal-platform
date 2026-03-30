export default function LineItem({ line, lineNumber }) {
  return (
    <div className="flex gap-4 items-start py-3 border-b border-gray-100 last:border-0">
      <span className="text-xs text-gray-400 mt-1 w-5 shrink-0">{lineNumber}</span>
      <div className="flex-1">
        <p className="text-sm text-gray-800">{line.lyric_text}</p>
        {line.notation_text && (
          <p className="text-xs text-indigo-500 mt-1">{line.notation_text}</p>
        )}
      </div>
    </div>
  )
}