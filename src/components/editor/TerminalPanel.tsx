import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertCircle, ChevronDown, ChevronRight, Terminal as TerminalIcon } from 'lucide-react'
import type { WebContainerStatus } from '@/hooks/useWebContainer'
import type { SandboxError } from '@/lib/sandboxErrors'
import { sandboxErrorTitle } from '@/lib/sandboxErrors'
import { stripAnsi } from '@/lib/terminalSanitize'

type PanelTab = 'problems' | 'terminal'

function colorizeLine(line: string): string {
  if (/^ERROR:|npm error|ERR!|failed|fatal|ETARGET|notarget/i.test(line)) return 'text-[#f48771]'
  if (/^\[.*\]|runtime42|────/.test(line)) return 'text-[#569cd6]'
  if (/^\$ /.test(line)) return 'text-[#dcdcaa]'
  if (/✓|ready|compiled|Local:|Server ready/i.test(line)) return 'text-[#4ec9b0]'
  if (/warn|warning/i.test(line)) return 'text-[#dcdcaa]'
  if (/npm|next|install|webpack|added|packages/i.test(line)) return 'text-[#9cdcfe]'
  return 'text-[#cccccc]'
}

interface TerminalPanelProps {
  output: string
  status?: WebContainerStatus
  error?: string | null
  sandboxErrors?: SandboxError[]
  /** @deprecated use sandboxErrors */
  buildErrors?: string[]
}

export default function TerminalPanel({
  output,
  status = 'idle',
  error,
  sandboxErrors = [],
  buildErrors = [],
}: TerminalPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [activeTab, setActiveTab] = useState<PanelTab>('terminal')
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  const problems: SandboxError[] = useMemo(() => {
    if (sandboxErrors.length > 0) return sandboxErrors
    return buildErrors.map((msg, i) => ({
      id: `legacy-${i}-${msg.slice(0, 40)}`,
      message: msg,
    }))
  }, [sandboxErrors, buildErrors])

  const problemCount = problems.length + (error ? 1 : 0)
  const isBusy = status === 'booting' || status === 'installing' || status === 'starting'

  useEffect(() => {
    if (problemCount > 0 && status === 'error') setActiveTab('problems')
    else if (isBusy) setActiveTab('terminal')
  }, [problemCount, status, isBusy])

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [output])

  const processes = useMemo(() => {
    const list: Array<{ id: string; label: string; active: boolean }> = []
    if (isBusy || status === 'installing' || output.includes('npm install')) {
      list.push({
        id: 'npm-install',
        label: 'npm install',
        active: status === 'installing',
      })
    }
    if (
      status === 'starting' ||
      status === 'ready' ||
      output.includes('npm run dev') ||
      output.includes('next dev')
    ) {
      list.push({
        id: 'next-dev',
        label: 'npm run dev',
        active: status === 'starting' || status === 'ready',
      })
    }
    if (list.length === 0) {
      list.push({ id: 'shell', label: 'bash', active: isBusy })
    }
    return list
  }, [output, status, isBusy])

  const outputLines = stripAnsi(output).split('\n').filter((line, i, arr) => {
    if (i === arr.length - 1 && !line) return false
    const t = line.trim()
    if (!t) return false
    if (/^[\|\\/\-]+$/.test(t)) return false
    return true
  })

  const statusLabel =
    status === 'booting'
      ? 'Booting'
      : status === 'installing'
        ? 'Installing'
        : status === 'starting'
          ? 'Starting'
          : status === 'ready'
            ? 'Ready'
            : status === 'error'
              ? 'Error'
              : 'Idle'

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="h-full flex flex-col bg-[#1e1e1e] border-t border-[#2d2d2d] text-[#cccccc] font-mono text-[12px] leading-[18px]">
      <div className="h-[35px] flex items-end px-2 gap-0 border-b border-[#2d2d2d] bg-[#252526] shrink-0 select-none">
        <TabButton
          active={activeTab === 'problems'}
          onClick={() => setActiveTab('problems')}
          badge={problemCount > 0 ? problemCount : undefined}
        >
          Problems
        </TabButton>
        <TabButton active={activeTab === 'terminal'} onClick={() => setActiveTab('terminal')}>
          Terminal
        </TabButton>
        <span className="ml-auto text-[10px] text-[#858585] pr-2 uppercase tracking-wide flex items-center gap-2">
          {isBusy && (
            <span className="w-1.5 h-1.5 rounded-full bg-[#007acc] animate-pulse" />
          )}
          {statusLabel}
        </span>
      </div>

      <div className="flex-1 flex min-h-0">
        <div ref={scrollRef} className="flex-1 overflow-y-auto min-w-0 p-3">
          {activeTab === 'problems' && (
            <div className="space-y-1">
              {error && (
                <ProblemRow
                  title={error.slice(0, 120)}
                  expanded={expandedIds.has('__top__')}
                  onToggle={() => toggleExpanded('__top__')}
                >
                  <DetailField label="Summary" value={error} />
                </ProblemRow>
              )}
              {problems.map((err) => (
                <ProblemRow
                  key={err.id}
                  title={sandboxErrorTitle(err)}
                  expanded={expandedIds.has(err.id)}
                  onToggle={() => toggleExpanded(err.id)}
                >
                  {err.code && <DetailField label="Code" value={err.code} />}
                  {err.package && <DetailField label="Package" value={err.package} />}
                  {err.requested && <DetailField label="Requested" value={err.requested} />}
                  <DetailField label="Message" value={err.message} />
                  {err.fixHint && <DetailField label="Fix" value={err.fixHint} className="text-[#4ec9b0]" />}
                  {err.raw && err.raw !== err.message && (
                    <DetailField label="Log" value={err.raw} className="text-[#858585]" />
                  )}
                </ProblemRow>
              ))}
              {problemCount === 0 && (
                <p className="text-[#858585]">No problems detected.</p>
              )}
            </div>
          )}

          {activeTab === 'terminal' && (
            <div className="space-y-0">
              {outputLines.length === 0 ? (
                <p className="text-[#858585]">Starting sandbox…</p>
              ) : (
                outputLines.map((line, i) => (
                  <div
                    key={i}
                    className={`whitespace-pre-wrap break-all ${colorizeLine(line)}`}
                  >
                    {line || '\u00a0'}
                  </div>
                ))
              )}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        <div className="w-[130px] shrink-0 border-l border-[#2d2d2d] bg-[#252526] overflow-y-auto">
          <div className="px-2 py-1.5 text-[10px] text-[#858585] uppercase tracking-wider">
            Processes
          </div>
          {processes.map((proc) => (
            <div
              key={proc.id}
              className={`flex items-center gap-1.5 px-2 py-1 text-[11px] truncate ${
                proc.active ? 'bg-[#37373d] text-[#ffffff]' : 'text-[#cccccc]'
              }`}
            >
              <TerminalIcon className="w-3 h-3 shrink-0 opacity-70" />
              <span className="truncate">{proc.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function TabButton({
  active,
  onClick,
  children,
  badge,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
  badge?: number
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative px-3 py-1.5 text-[12px] border-t-2 transition-colors ${
        active
          ? 'border-t-[#007acc] bg-[#1e1e1e] text-[#ffffff]'
          : 'border-t-transparent text-[#969696] hover:text-[#cccccc]'
      }`}
    >
      {children}
      {badge !== undefined && badge > 0 && (
        <span className="ml-1.5 inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-[#007acc] text-[10px] text-white">
          {badge}
        </span>
      )}
    </button>
  )
}

function ProblemRow({
  title,
  expanded,
  onToggle,
  children,
}: {
  title: string
  expanded: boolean
  onToggle: () => void
  children?: React.ReactNode
}) {
  return (
    <div className="rounded hover:bg-[#2a2d2e]">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-start gap-2 px-1 py-1 text-left"
      >
        {expanded ? (
          <ChevronDown className="w-3.5 h-3.5 text-[#858585] shrink-0 mt-0.5" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-[#858585] shrink-0 mt-0.5" />
        )}
        <AlertCircle className="w-3.5 h-3.5 text-[#f48771] shrink-0 mt-0.5" />
        <span className="text-[#f48771] break-all">{title}</span>
      </button>
      {expanded && children && (
        <div className="pl-8 pr-2 pb-2 space-y-1">{children}</div>
      )}
    </div>
  )
}

function DetailField({
  label,
  value,
  className = 'text-[#cccccc]',
}: {
  label: string
  value: string
  className?: string
}) {
  return (
    <div className="text-[11px]">
      <span className="text-[#858585]">{label}: </span>
      <span className={`whitespace-pre-wrap break-all ${className}`}>{value}</span>
    </div>
  )
}
