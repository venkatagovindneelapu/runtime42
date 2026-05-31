import { useMemo, useState } from 'react'
import { ChevronRight, ChevronDown, File, Folder, FolderOpen } from 'lucide-react'

export interface FileTreeNode {
  name: string
  path: string
  type: 'file' | 'folder'
  children?: FileTreeNode[]
}

function buildTree(paths: string[]): FileTreeNode[] {
  const root: FileTreeNode[] = []

  const sorted = [...paths].sort()
  for (const filePath of sorted) {
    const parts = filePath.split('/').filter(Boolean)
    let current = root
    let built = ''

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      built = built ? `${built}/${part}` : part
      const isFile = i === parts.length - 1
      const existing = current.find(n => n.name === part)

      if (existing) {
        if (!isFile && existing.type === 'folder') {
          current = existing.children ?? (existing.children = [])
        }
      } else {
        const node: FileTreeNode = {
          name: part,
          path: built,
          type: isFile ? 'file' : 'folder',
          children: isFile ? undefined : [],
        }
        current.push(node)
        current = node.children ?? []
      }
    }
  }

  return root
}

interface FileTreeProps {
  paths: string[]
  selectedPath: string | null
  writingPath?: string | null
  onSelect: (path: string) => void
}

function TreeNodeRow({
  node,
  depth,
  selectedPath,
  writingPath,
  onSelect,
}: {
  node: FileTreeNode
  depth: number
  selectedPath: string | null
  writingPath?: string | null
  onSelect: (path: string) => void
}) {
  const [open, setOpen] = useState(depth < 2)
  const isSelected = node.type === 'file' && selectedPath === node.path
  const isWriting = node.type === 'file' && writingPath === node.path

  if (node.type === 'folder') {
    return (
      <div>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="w-full flex items-center gap-1 px-2 py-1 rounded text-sm hover:bg-muted/50 text-foreground"
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
        >
          {open ? <ChevronDown className="w-3.5 h-3.5 shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 shrink-0" />}
          {open ? <FolderOpen className="w-4 h-4 text-amber-400 shrink-0" /> : <Folder className="w-4 h-4 text-amber-400 shrink-0" />}
          <span className="truncate">{node.name}</span>
        </button>
        {open && node.children?.map(child => (
          <TreeNodeRow
            key={child.path}
            node={child}
            depth={depth + 1}
            selectedPath={selectedPath}
            writingPath={writingPath}
            onSelect={onSelect}
          />
        ))}
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => onSelect(node.path)}
      className={`w-full flex items-center gap-1.5 px-2 py-1 rounded text-sm truncate ${
        isSelected ? 'bg-primary/20 text-primary' : 'hover:bg-muted/50 text-foreground'
      } ${isWriting ? 'animate-pulse' : ''}`}
      style={{ paddingLeft: `${depth * 12 + 20}px` }}
    >
      <File className="w-4 h-4 text-blue-400 shrink-0" />
      <span>{node.name}</span>
    </button>
  )
}

export default function FileTree({ paths, selectedPath, writingPath, onSelect }: FileTreeProps) {
  const tree = useMemo(() => buildTree(paths), [paths])

  if (paths.length === 0) {
    return <p className="text-sm text-muted-foreground p-3">No files yet</p>
  }

  return (
    <div className="p-1">
      {tree.map(node => (
        <TreeNodeRow
          key={node.path}
          node={node}
          depth={0}
          selectedPath={selectedPath}
          writingPath={writingPath}
          onSelect={onSelect}
        />
      ))}
    </div>
  )
}
