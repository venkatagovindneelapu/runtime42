import { useEffect, useState } from 'react'

type ThinkingPhase = 'thinking' | 'done'

interface ThinkingInstructionProps {
  label: string | null
  phase: ThinkingPhase
}

export default function ThinkingInstruction({ label, phase }: ThinkingInstructionProps) {
  const target =
    phase === 'done' ? 'Done' : label?.trim() || 'Thinking'

  const [displayed, setDisplayed] = useState(target)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    if (target === displayed) {
      setVisible(true)
      return
    }

    setVisible(false)
    const swap = window.setTimeout(() => {
      setDisplayed(target)
      setVisible(true)
    }, 280)

    return () => window.clearTimeout(swap)
  }, [target, displayed])

  const showBlink = phase === 'thinking' && displayed !== 'Done'

  return (
    <p
      className={`text-sm text-muted-foreground transition-opacity duration-300 ease-in-out min-h-[1.25rem] ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
      aria-live="polite"
    >
      {displayed}
      {showBlink && (
        <span className="inline-flex ml-0.5 gap-[1px]">
          <span className="animate-pulse">.</span>
          <span className="animate-pulse [animation-delay:150ms]">.</span>
          <span className="animate-pulse [animation-delay:300ms]">.</span>
        </span>
      )}
    </p>
  )
}
