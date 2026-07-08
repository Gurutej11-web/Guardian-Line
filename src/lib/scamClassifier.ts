import { FlagCategory, Language, RiskSpan, Severity } from "./types";

/**
 * Rolling scam-language classifier.
 *
 * In production this stage is described in the spec as an LLM-powered
 * classifier (a structured prompt tagging transcript chunks into risk
 * categories with confidence scores). For this build it is implemented
 * as a transparent, fast, fully offline rule engine — weighted
 * keyword/phrase matching per category, per language — so the demo
 * never depends on a network call or API key. The `classifyText`
 * function signature is intentionally the seam where a real LLM call
 * could be swapped in without touching any caller.
 */

export interface CategoryMatch {
  category: FlagCategory;
  severity: Severity;
  phrase: string;
  index: number;
}

interface PatternDef {
  pattern: RegExp;
  severity: Severity;
}

type PatternLibrary = Record<FlagCategory, Record<Language, PatternDef[]>>;

const patterns: Partial<PatternLibrary> = {
  urgency: {
    en: [
      { pattern: /\bact now\b/i, severity: "high" },
      { pattern: /\bright now\b/i, severity: "medium" },
      { pattern: /\bimmediately\b/i, severity: "medium" },
      { pattern: /\bdon'?t (wait|hang up)\b/i, severity: "high" },
      { pattern: /\bwithin (the next )?\d+ (minutes|hours)\b/i, severity: "high" },
      { pattern: /\bbefore it'?s too late\b/i, severity: "high" },
      { pattern: /\blast chance\b/i, severity: "medium" },
      { pattern: /\bexpir(es|ing|e) (today|soon)\b/i, severity: "medium" },
      { pattern: /\bhurry\b/i, severity: "medium" },
    ],
    es: [
      { pattern: /\bact(ú|u)a ahora\b/i, severity: "high" },
      { pattern: /\bahora mismo\b/i, severity: "medium" },
      { pattern: /\binmediatamente\b/i, severity: "medium" },
      { pattern: /\bno cuelgues\b/i, severity: "high" },
      { pattern: /\bantes de que sea demasiado tarde\b/i, severity: "high" },
      { pattern: /\b(última|ultima) oportunidad\b/i, severity: "medium" },
    ],
  },
  "financial-request": {
    en: [
      { pattern: /\bwire transfer\b/i, severity: "high" },
      { pattern: /\bgift card(s)?\b/i, severity: "high" },
      { pattern: /\bcrypto(currency)?\b/i, severity: "high" },
      { pattern: /\bbitcoin\b/i, severity: "high" },
      { pattern: /\bbank account number\b/i, severity: "high" },
      { pattern: /\brouting number\b/i, severity: "high" },
      { pattern: /\bsocial security number\b/i, severity: "high" },
      { pattern: /\bsend money\b/i, severity: "high" },
      { pattern: /\bpay(ment)? (with|via|using)\b/i, severity: "medium" },
      { pattern: /\bcash app|zelle|venmo\b/i, severity: "medium" },
      { pattern: /\bpost office box\b/i, severity: "low" },
      { pattern: /\bbail (money|amount)\b/i, severity: "high" },
    ],
    es: [
      { pattern: /\btransferencia bancaria\b/i, severity: "high" },
      { pattern: /\btarjeta(s)? de regalo\b/i, severity: "high" },
      { pattern: /\bcriptomoneda\b/i, severity: "high" },
      { pattern: /\bnúmero de cuenta\b/i, severity: "high" },
      { pattern: /\bnúmero de seguro social\b/i, severity: "high" },
      { pattern: /\benv(í|i)a dinero\b/i, severity: "high" },
      { pattern: /\bfianza\b/i, severity: "high" },
    ],
  },
  isolation: {
    en: [
      { pattern: /\bdon'?t tell (anyone|your family|your (mom|dad|wife|husband))\b/i, severity: "high" },
      { pattern: /\bkeep this (a )?secret\b/i, severity: "high" },
      { pattern: /\bjust between (us|you and me)\b/i, severity: "medium" },
      { pattern: /\bdon'?t hang up\b/i, severity: "medium" },
      { pattern: /\bconfidential\b/i, severity: "low" },
    ],
    es: [
      { pattern: /\bno le digas a nadie\b/i, severity: "high" },
      { pattern: /\bmantenlo en secreto\b/i, severity: "high" },
      { pattern: /\bsolo entre (nosotros|tú y yo)\b/i, severity: "medium" },
      { pattern: /\bno cuelgues\b/i, severity: "medium" },
    ],
  },
  "authority-impersonation": {
    en: [
      { pattern: /\bthis is (the )?irs\b/i, severity: "high" },
      { pattern: /\bsocial security administration\b/i, severity: "high" },
      { pattern: /\bfrom your bank\b/i, severity: "high" },
      { pattern: /\bfraud department\b/i, severity: "medium" },
      { pattern: /\bpolice department\b/i, severity: "medium" },
      { pattern: /\barrest warrant\b/i, severity: "high" },
      { pattern: /\byou'?ve been arrested\b/i, severity: "high" },
      { pattern: /\bcourt (case|order)\b/i, severity: "medium" },
      { pattern: /\bofficer [a-z]+\b/i, severity: "low" },
      { pattern: /\bcustoms (and border|agent)\b/i, severity: "medium" },
    ],
    es: [
      { pattern: /\bsoy del banco\b/i, severity: "high" },
      { pattern: /\bdepartamento de fraude\b/i, severity: "medium" },
      { pattern: /\bpolic(í|i)a\b/i, severity: "medium" },
      { pattern: /\borden de arresto\b/i, severity: "high" },
      { pattern: /\bhas sido arrestado\b/i, severity: "high" },
      { pattern: /\bagente [a-z]+\b/i, severity: "low" },
    ],
  },
  "emotional-manipulation": {
    en: [
      { pattern: /\bi'?m (so )?scared\b/i, severity: "medium" },
      { pattern: /\bplease help me\b/i, severity: "medium" },
      { pattern: /\bi'?m in (trouble|jail|the hospital)\b/i, severity: "high" },
      { pattern: /\bdon'?t be mad\b/i, severity: "low" },
      { pattern: /\byou'?re the only one (who|that) can help\b/i, severity: "medium" },
      { pattern: /\bif you (really )?love me\b/i, severity: "high" },
      { pattern: /\bi'?m so sorry to ask\b/i, severity: "low" },
    ],
    es: [
      { pattern: /\bestoy asustad[oa]\b/i, severity: "medium" },
      { pattern: /\bpor favor ay(ú|u)dame\b/i, severity: "medium" },
      { pattern: /\bestoy en (problemas|la c(á|a)rcel|el hospital)\b/i, severity: "high" },
      { pattern: /\beres la (ú|u)nica persona que puede ayudarme\b/i, severity: "medium" },
      { pattern: /\bsi de verdad me quieres\b/i, severity: "high" },
    ],
  },
};

export function classifyText(text: string, lang: Language): CategoryMatch[] {
  const matches: CategoryMatch[] = [];
  (Object.keys(patterns) as FlagCategory[]).forEach((category) => {
    const defs = patterns[category]?.[lang] ?? [];
    for (const def of defs) {
      const match = def.pattern.exec(text);
      if (match) {
        matches.push({
          category,
          severity: def.severity,
          phrase: match[0],
          index: match.index,
        });
      }
    }
  });
  return matches;
}

export function toRiskSpans(matches: CategoryMatch[]): RiskSpan[] {
  return matches.map((m) => ({
    start: m.index,
    end: m.index + m.phrase.length,
    category: m.category,
  }));
}

const severityWeight: Record<Severity, number> = { low: 8, medium: 18, high: 32 };

/** Aggregates a rolling window of matches (across recent transcript
 * chunks) into a single 0-100 conversational risk score. Multiple
 * distinct categories firing together escalates faster than repeats of
 * the same category, mirroring how a real scam call stacks tactics. */
export function scoreTranscriptRisk(recentMatches: CategoryMatch[]): number {
  if (recentMatches.length === 0) return 0;
  const byCategory = new Map<FlagCategory, number>();
  for (const m of recentMatches) {
    const weight = severityWeight[m.severity];
    byCategory.set(m.category, Math.max(byCategory.get(m.category) ?? 0, weight));
  }
  const distinctCategories = byCategory.size;
  const base = [...byCategory.values()].reduce((a, b) => a + b, 0);
  const diversityBonus = distinctCategories >= 2 ? (distinctCategories - 1) * 10 : 0;
  return Math.min(100, Math.round(base + diversityBonus));
}
