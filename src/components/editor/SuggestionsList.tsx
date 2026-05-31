interface SuggestionsListProps {
  suggestions: string[]
  onSelect: (text: string) => void
  title?: string
  variant?: 'default' | 'error'
}

function cleanSuggestion(text: string) {
  return text.replace(/^Try:\s*/i, '').trim()
}

export default function SuggestionsList({
  suggestions,
  onSelect,
  title = 'Suggestions',
  variant = 'default',
}: SuggestionsListProps) {
  if (suggestions.length === 0) return null

  const isError = variant === 'error'

  return (
    <div className="space-y-2 pt-2">
      <h4
        className={`text-sm font-medium ${
          isError ? 'text-destructive' : 'text-foreground'
        }`}
      >
        {title}
      </h4>
      <div className="flex flex-col gap-2">
        {suggestions.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onSelect(cleanSuggestion(s))}
            className={`text-left text-xs px-3 py-2.5 rounded-full border transition-colors leading-relaxed ${
              isError
                ? 'border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/15 hover:border-destructive/60'
                : 'border-border bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground hover:border-primary/30'
            }`}
          >
            {cleanSuggestion(s)}
          </button>
        ))}
      </div>
    </div>
  )
}
