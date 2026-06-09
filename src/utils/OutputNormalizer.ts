/**
 * OutputNormalizer
 * Extracts JSON from model output that may contain surrounding text,
 * markdown code blocks, or other noise.
 */

export function extractJson(text: string): any | null {
  // 1. Try direct parse
  try {
    return JSON.parse(text.trim());
  } catch {}

  // 2. Try extracting from ```json ... ``` code blocks
  const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1].trim());
    } catch {}
  }

  // 3. Try finding first { ... } or [ ... ] block
  const braceMatch = text.match(/(\{[\s\S]*\})/);
  if (braceMatch) {
    try {
      return JSON.parse(braceMatch[1].trim());
    } catch {}
  }

  const bracketMatch = text.match(/(\[[\s\S]*\])/);
  if (bracketMatch) {
    try {
      return JSON.parse(bracketMatch[1].trim());
    } catch {}
  }

  return null;
}

export function normalizeText(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\t/g, "  ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
