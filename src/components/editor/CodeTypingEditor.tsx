import { useEffect, useState } from 'react'
import { Highlight, themes } from 'prism-react-renderer'

interface CodeTypingEditorProps {
  code: string
  language: string
  isAnimating?: boolean
  onAnimationComplete?: () => void
}

export default function CodeTypingEditor({
  code,
  language,
  isAnimating = false,
  onAnimationComplete,
}: CodeTypingEditorProps) {
  const [visibleLength, setVisibleLength] = useState(isAnimating ? 0 : code.length)

  useEffect(() => {
    if (!isAnimating) {
      setVisibleLength(code.length)
      return
    }

    setVisibleLength(0)
    let index = 0
    const chunk = Math.max(8, Math.floor(code.length / 120))

    const timer = setInterval(() => {
      index += chunk
      if (index >= code.length) {
        setVisibleLength(code.length)
        clearInterval(timer)
        onAnimationComplete?.()
      } else {
        setVisibleLength(index)
      }
    }, 16)

    return () => clearInterval(timer)
  }, [code, isAnimating, onAnimationComplete])

  const displayCode = code.slice(0, visibleLength)

  return (
    <Highlight theme={themes.vsDark} code={displayCode} language={language}>
      {({ style, tokens, getLineProps, getTokenProps }) => (
        <pre
          className="p-4 text-sm font-mono leading-relaxed overflow-x-auto min-h-full"
          style={{ ...style, background: 'transparent' }}
        >
          {tokens.map((line, i) => (
            <div key={i} {...getLineProps({ line })} className="flex">
              <span className="w-10 text-right pr-4 text-muted-foreground/60 select-none text-xs">
                {i + 1}
              </span>
              <span>
                {line.map((token, key) => (
                  <span key={key} {...getTokenProps({ token })} />
                ))}
              </span>
            </div>
          ))}
          {isAnimating && visibleLength < code.length && (
            <span className="inline-block w-2 h-4 bg-primary/80 animate-pulse ml-14" />
          )}
        </pre>
      )}
    </Highlight>
  )
}
