/** Models that only support POST /v1/responses (not chat/completions). */
function usesResponsesApi(model: string): boolean {
  return /codex/i.test(model)
}

function extractResponsesText(data: Record<string, unknown>): string {
  if (typeof data.output_text === 'string' && data.output_text.trim()) {
    return data.output_text
  }

  const output = data.output
  if (!Array.isArray(output)) {
    throw new Error('OpenAI Responses API returned no output')
  }

  const parts: string[] = []
  for (const item of output) {
    if (!item || typeof item !== 'object') continue
    const row = item as Record<string, unknown>
    if (row.type !== 'message') continue
    const content = row.content
    if (!Array.isArray(content)) continue
    for (const block of content) {
      if (!block || typeof block !== 'object') continue
      const b = block as Record<string, unknown>
      if (b.type === 'output_text' && typeof b.text === 'string') {
        parts.push(b.text)
      }
    }
  }

  if (parts.length === 0) {
    const err = data.error as { message?: string } | undefined
    if (err?.message) throw new Error(err.message)
    throw new Error('OpenAI Responses API returned empty text')
  }

  return parts.join('\n')
}

async function callResponsesApi(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userContent: string
): Promise<string> {
  const body: Record<string, unknown> = {
    model,
    instructions: systemPrompt,
    input: userContent,
  }

  // Codex / reasoning models: no temperature; use reasoning effort instead
  if (/codex/i.test(model)) {
    body.reasoning = { effort: 'medium' }
  }

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const error = await response.text().catch(() => '')
    throw new Error(`OpenAI request failed (${model}): ${response.status} ${error}`)
  }

  const data = (await response.json()) as Record<string, unknown>
  return extractResponsesText(data)
}

async function callChatCompletionsApi(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userContent: string,
  temperature: number
): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
    }),
  })

  if (!response.ok) {
    const error = await response.text().catch(() => '')
    throw new Error(`OpenAI request failed (${model}): ${response.status} ${error}`)
  }

  const data = await response.json()
  const content = data?.choices?.[0]?.message?.content
  if (typeof content !== 'string') {
    throw new Error('OpenAI returned an empty response')
  }
  return content
}

export async function callOpenAI(
  model: string,
  systemPrompt: string,
  userContent: string,
  temperature = 0.3
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY is not configured')

  if (usesResponsesApi(model)) {
    return callResponsesApi(apiKey, model, systemPrompt, userContent)
  }
  return callChatCompletionsApi(apiKey, model, systemPrompt, userContent, temperature)
}
