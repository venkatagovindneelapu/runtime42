import { FilePenLine } from 'lucide-react'

export type FileChange = {
  path: string
  before: string
  after: string
}

interface EditedFilesListProps {
  changes: FileChange[]
  onSelectFile: (change: FileChange) => void
}

export default function EditedFilesList({ changes, onSelectFile }: EditedFilesListProps) {
  if (changes.length === 0) return null

  return (
    <div className="space-y-2 pt-1">
      {changes.map((change) => (
        <button
          key={change.path}
          type="button"
          onClick={() => onSelectFile(change)}
          className="flex items-center gap-2 w-full text-left group"
        >
          <FilePenLine className="w-4 h-4 text-muted-foreground shrink-0 group-hover:text-foreground transition-colors" />
          <span className="text-sm text-foreground">Edited</span>
          <span className="text-xs px-2.5 py-1 rounded-full bg-muted/80 border border-border font-mono text-foreground group-hover:border-primary/40 group-hover:bg-muted transition-colors truncate max-w-full">
            {change.path}
          </span>
        </button>
      ))}
    </div>
  )
}
