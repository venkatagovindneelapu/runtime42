import { useEffect, useMemo, useState } from 'react'
import type { GenerationSummary } from '@/lib/api'
import EditedFilesList, { type FileChange } from '@/components/editor/EditedFilesList'
import SuggestionsList from '@/components/editor/SuggestionsList'

interface StreamingAssistantResponseProps {
  summary: GenerationSummary
  fileChanges?: FileChange[]
  animate?: boolean
  onAnimationComplete?: () => void
  onSuggestion?: (text: string) => void
  onSelectFile?: (change: FileChange) => void
  /** When set, shown instead of summary.nextSuggestions (e.g. WebContainer errors) */
  errorSuggestions?: string[]
}

export default function StreamingAssistantResponse({
  summary,
  fileChanges = [],
  animate = true,
  onAnimationComplete,
  onSuggestion,
  onSelectFile,
  errorSuggestions = [],
}: StreamingAssistantResponseProps) {
  const bodyTokens = useMemo(() => {
    const text = summary.whatWasBuilt || ''
    return text.match(/\S+|\s+/g) ?? []
  }, [summary.whatWasBuilt])

  const [tokenIndex, setTokenIndex] = useState(animate ? 0 : bodyTokens.length)
  const [showExtras, setShowExtras] = useState(!animate)

  useEffect(() => {
    if (!animate) {
      setTokenIndex(bodyTokens.length)
      setShowExtras(true)
      return
    }

    setTokenIndex(0)
    setShowExtras(false)
    let index = 0
    const tick = window.setInterval(() => {
      index += 1
      setTokenIndex(index)
      if (index >= bodyTokens.length) {
        window.clearInterval(tick)
        setShowExtras(true)
        onAnimationComplete?.()
      }
    }, 28)

    return () => window.clearInterval(tick)
  }, [animate, bodyTokens, onAnimationComplete])

  const visibleBody = bodyTokens.slice(0, tokenIndex).join('')
  const showCursor = animate && tokenIndex < bodyTokens.length

  const changes =
    fileChanges.length > 0
      ? fileChanges
      : summary.filesSummary?.map((f) => ({
          path: f.file,
          before: '',
          after: '',
        })) ?? []

  return (
    <div className="space-y-3 pt-1">
      <h3 className="text-base font-semibold text-foreground leading-snug">
        {summary.headline}
      </h3>
      <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
        {visibleBody}
        {showCursor && (
          <span className="inline-block w-[2px] h-[1em] align-middle bg-primary/80 ml-0.5 animate-pulse" />
        )}
      </p>
      {showExtras && changes.length > 0 && onSelectFile && (
        <EditedFilesList changes={changes} onSelectFile={onSelectFile} />
      )}
      {showExtras && onSuggestion && errorSuggestions.length > 0 && (
        <SuggestionsList
          title="Preview errors"
          variant="error"
          suggestions={errorSuggestions}
          onSelect={onSuggestion}
        />
      )}
      {showExtras &&
        onSuggestion &&
        errorSuggestions.length === 0 &&
        summary.nextSuggestions?.length > 0 && (
          <SuggestionsList suggestions={summary.nextSuggestions} onSelect={onSuggestion} />
        )}
    </div>
  )
}
