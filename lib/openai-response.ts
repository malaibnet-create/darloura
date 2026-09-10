type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as JsonRecord
    : null;
}

/** Extracts the first text block returned by the OpenAI Responses API. */
export function getOpenAIResponseText(payload: unknown): string {
  const response = asRecord(payload);
  if (!response) return '';
  if (typeof response.output_text === 'string') return response.output_text;

  const output = Array.isArray(response.output) ? response.output : [];
  for (const outputItem of output) {
    const item = asRecord(outputItem);
    const content = item && Array.isArray(item.content) ? item.content : [];
    for (const contentItem of content) {
      const block = asRecord(contentItem);
      if (block?.type === 'output_text' && typeof block.text === 'string') return block.text;
    }
  }
  return '';
}
