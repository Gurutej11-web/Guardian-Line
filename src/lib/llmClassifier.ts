import { Language } from "./types";
import { CategoryMatch } from "./scamClassifier";
import { FlagCategory, Severity } from "./types";

/**
 * Optional bring-your-own-key LLM classifier.
 *
 * The heuristic rule engine in scamClassifier.ts is the default and
 * always available offline. If a user opts in and supplies their own
 * API key + an OpenAI-chat-completions-compatible endpoint, this
 * function sends the transcript chunk for classification instead. It
 * is never called unless both settings are populated, and a network or
 * parsing failure falls back to the heuristic classifier rather than
 * silently returning nothing.
 */

const CATEGORIES: FlagCategory[] = [
  "urgency",
  "financial-request",
  "isolation",
  "authority-impersonation",
  "emotional-manipulation",
];

const SYSTEM_PROMPT = `You are a scam-call detection classifier. Given a short chunk of call transcript, identify which of these categories apply: urgency, financial-request, isolation, authority-impersonation, emotional-manipulation. Respond ONLY with compact JSON: {"matches": [{"category": "...", "severity": "low"|"medium"|"high", "phrase": "<exact substring from the text>"}]}. If none apply, respond {"matches": []}. Never include commentary.`;

interface LlmMatchResponse {
  matches: { category: string; severity: string; phrase: string }[];
}

export async function classifyWithLlm(
  text: string,
  lang: Language,
  apiKey: string,
  endpoint: string
): Promise<CategoryMatch[] | null> {
  if (!apiKey || !endpoint) return null;
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `Language: ${lang}\nTranscript chunk: "${text}"` },
        ],
        temperature: 0,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const content: string | undefined = data?.choices?.[0]?.message?.content;
    if (!content) return null;
    const parsed = JSON.parse(content) as LlmMatchResponse;
    if (!Array.isArray(parsed.matches)) return null;

    const matches: CategoryMatch[] = [];
    for (const m of parsed.matches) {
      if (!CATEGORIES.includes(m.category as FlagCategory)) continue;
      const index = text.toLowerCase().indexOf((m.phrase ?? "").toLowerCase());
      if (index === -1) continue;
      matches.push({
        category: m.category as FlagCategory,
        severity: (["low", "medium", "high"].includes(m.severity) ? m.severity : "medium") as Severity,
        phrase: m.phrase,
        index,
      });
    }
    return matches;
  } catch {
    return null;
  }
}
