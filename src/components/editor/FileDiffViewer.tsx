import { useMemo } from 'react'
import { FilePenLine } from 'lucide-react'

interface DiffLine {
  type: 'context' | 'add' | 'remove'
  content: string
  oldLine?: number
  newLine?: number
}

function buildDiffLines(before: string, after: string): DiffLine[] {
  const oldLines = before.split('\n')
  const newLines = after.split('\n')
  const result: DiffLine[] = []

  const maxLen = Math.max(oldLines.length, newLines.length)
  for (let i = 0; i < maxLen; i++) {
    const oldL = oldLines[i]
    const newL = newLines[i]
    if (oldL === newL) {
      if (oldL !== undefined) {
        result.push({ type: 'context', content: oldL, oldLine: i + 1, newLine: i + 1 })
      }
    } else {
      if (oldL !== undefined) {
        result.push({ type: 'remove', content: oldL, oldLine: i + 1 })
      }
      if (newL !== undefined) {
        result.push({ type: 'add', content: newL, newLine: i + 1 })
      }
    }
  }

  return result
}

interface FileDiffViewerProps {
  path: string
  before: string
  after: string
  onClose?: () => void
}

export default function FileDiffViewer({ path, before, after }: FileDiffViewerProps) {
  const lines = useMemo(() => buildDiffLines(before, after), [before, after])
  const isNewFile = !before.trim()

  return (
    <div className="h-full flex flex-col min-h-0">
      <div className="px-4 py-2 border-b border-border flex items-center gap-2 shrink-0">
        <FilePenLine className="w-4 h-4 text-muted-foreground shrink-0" />
        <span className="text-sm text-foreground font-medium">Edited</span>
        <span className="text-xs px-2.5 py-1 rounded-full bg-muted border border-border font-mono">
          {path}
        </span>
        {isNewFile && (
          <span className="text-[10px] uppercase tracking-wide text-green-400 ml-auto">New file</span>
        )}
      </div>
      <div className="flex-1 overflow-auto font-mono text-xs leading-relaxed min-h-0">
        {lines.length === 0 ? (
          <p className="p-4 text-muted-foreground">No changes detected.</p>
        ) : (
          <table className="w-full border-collapse">
            <tbody>
              {lines.map((line, i) => (
                <tr
                  key={i}
                  className={
                    line.type === 'add'
                      ? 'bg-green-500/10'
                      : line.type === 'remove'
                        ? 'bg-red-500/10'
                        : ''
                  }
                >
                  <td className="w-10 text-right pr-2 pl-3 text-muted-foreground/50 select-none align-top py-0.5">
                    {line.oldLine ?? ''}
                  </td>
                  <td className="w-10 text-right pr-2 text-muted-foreground/50 select-none align-top py-0.5">
                    {line.newLine ?? ''}
                  </td>
                  <td
                    className={`w-6 text-center select-none align-top py-0.5 ${
                      line.type === 'add'
                        ? 'text-green-400'
                        : line.type === 'remove'
                          ? 'text-red-400'
                          : 'text-muted-foreground/40'
                    }`}
                  >
                    {line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' '}
                  </td>
                  <td
                    className={`pr-4 whitespace-pre-wrap break-all py-0.5 ${
                      line.type === 'add'
                        ? 'text-green-300'
                        : line.type === 'remove'
                          ? 'text-red-300'
                          : 'text-foreground/80'
                    }`}
                  >
                    {line.content || ' '}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
