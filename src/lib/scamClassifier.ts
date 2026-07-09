import { CallLanguage, CustomPattern, FlagCategory, RiskSpan, Severity } from "./types";

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

type PatternLibrary = Record<FlagCategory, Partial<Record<CallLanguage, PatternDef[]>>>;

/**
 * Language coverage note: en/es have the deepest pattern sets since
 * they're also the app's translated display languages. fr/zh/vi/tl
 * cover the same five categories with real, native-phrased patterns
 * for the tactics most common in scam calls targeting those language
 * communities (e.g. the Mandarin "public security bureau / frozen
 * account" impersonation scam), but are intentionally narrower — this
 * build does not translate the rest of the UI into those languages,
 * so results are only ever surfaced through the (English/Spanish)
 * interface. See CallLanguage in types.ts.
 */
const patterns: Partial<PatternLibrary> = {
  urgency: {
    en: [
      { pattern: /\bact now\b/i, severity: "high" },
      { pattern: /\bright now\b/i, severity: "medium" },
      { pattern: /\bimmediately\b/i, severity: "medium" },
      { pattern: /\bdon'?t wait\b/i, severity: "high" },
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
      { pattern: /\bantes de que sea demasiado tarde\b/i, severity: "high" },
      { pattern: /\b(última|ultima) oportunidad\b/i, severity: "medium" },
    ],
    fr: [
      { pattern: /\bagissez maintenant\b/i, severity: "high" },
      { pattern: /\bimmédiatement\b/i, severity: "medium" },
      { pattern: /\bavant qu'?il ne soit trop tard\b/i, severity: "high" },
      { pattern: /\bdernière chance\b/i, severity: "medium" },
    ],
    zh: [
      { pattern: /紧急/, severity: "medium" },
      { pattern: /立即|马上/, severity: "medium" },
      { pattern: /不然就太晚了/, severity: "high" },
    ],
    vi: [
      { pattern: /\bhành động ngay\b/i, severity: "high" },
      { pattern: /\bngay lập tức\b/i, severity: "medium" },
      { pattern: /\btrước khi quá muộn\b/i, severity: "high" },
    ],
    tl: [
      { pattern: /\bkumilos ka na ngayon\b/i, severity: "high" },
      { pattern: /\bagad-agad\b/i, severity: "medium" },
      { pattern: /\bbago pa huli ang lahat\b/i, severity: "high" },
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
      // Crypto-recovery / "recover your lost funds" scams
      { pattern: /\brecover(y)? (your |my )?(lost |stolen )?(funds|crypto|bitcoin)\b/i, severity: "high" },
      { pattern: /\bcrypto (wallet|recovery) (seed|phrase|key)\b/i, severity: "high" },
      { pattern: /\bseed phrase\b/i, severity: "high" },
      { pattern: /\bremote access (to your computer|software|app)\b/i, severity: "high" },
      { pattern: /\b(anydesk|teamviewer|any desk|team viewer)\b/i, severity: "high" },
      // UK-specific
      { pattern: /\bnational insurance number\b/i, severity: "high" },
      // India-specific
      { pattern: /\baadhaar\b/i, severity: "high" },
      { pattern: /\bkyc (update|verification)\b/i, severity: "medium" },
    ],
    es: [
      { pattern: /\btransferencia bancaria\b/i, severity: "high" },
      { pattern: /\btarjeta(s)? de regalo\b/i, severity: "high" },
      { pattern: /\bcriptomoneda\b/i, severity: "high" },
      { pattern: /\bnúmero de cuenta\b/i, severity: "high" },
      { pattern: /\bnúmero de seguro social\b/i, severity: "high" },
      { pattern: /\benv(í|i)a dinero\b/i, severity: "high" },
      { pattern: /\bfianza\b/i, severity: "high" },
      { pattern: /\brecuperar (tus |mis )?(fondos|criptomonedas)\b/i, severity: "high" },
      { pattern: /\bacceso remoto a (tu|su) (computadora|equipo)\b/i, severity: "high" },
      { pattern: /\bfrase semilla\b/i, severity: "high" },
    ],
    fr: [
      { pattern: /\bvirement bancaire\b/i, severity: "high" },
      { pattern: /\bcarte(s)? cadeau\b/i, severity: "high" },
      { pattern: /\bcrypto-?monnaie\b/i, severity: "high" },
      { pattern: /\bnuméro de compte\b/i, severity: "high" },
      { pattern: /\benvoyer de l'?argent\b/i, severity: "high" },
      { pattern: /\baccès à distance à votre ordinateur\b/i, severity: "high" },
    ],
    zh: [
      { pattern: /汇款|转账/, severity: "high" },
      { pattern: /银行卡号|账户号码/, severity: "high" },
      { pattern: /比特币|加密货币/, severity: "high" },
      { pattern: /礼品卡/, severity: "high" },
      { pattern: /远程(协助|控制)/, severity: "high" },
    ],
    vi: [
      { pattern: /\bchuyển tiền\b/i, severity: "high" },
      { pattern: /\bsố tài khoản ngân hàng\b/i, severity: "high" },
      { pattern: /\bthẻ quà tặng\b/i, severity: "high" },
      { pattern: /\btiền điện tử\b/i, severity: "high" },
    ],
    tl: [
      { pattern: /\bpadalhan (mo )?ng pera\b/i, severity: "high" },
      { pattern: /\bgift card\b/i, severity: "high" },
      { pattern: /\baccount number\b/i, severity: "high" },
      { pattern: /\bwire transfer\b/i, severity: "high" },
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
    fr: [
      { pattern: /\bne le dis à personne\b/i, severity: "high" },
      { pattern: /\bgarde(z)? (ça |cela )?secret\b/i, severity: "high" },
      { pattern: /\bne raccrochez? pas\b/i, severity: "medium" },
    ],
    zh: [
      { pattern: /不要告诉(任何人|别人|家人)/, severity: "high" },
      { pattern: /保密/, severity: "high" },
      { pattern: /先别挂电话/, severity: "medium" },
    ],
    vi: [
      { pattern: /\bđừng nói với ai\b/i, severity: "high" },
      { pattern: /\bgiữ bí mật\b/i, severity: "high" },
    ],
    tl: [
      { pattern: /\bhuwag mong sabihin kahit kanino\b/i, severity: "high" },
      { pattern: /\bpanatilihing lihim\b/i, severity: "high" },
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
      // Tech-support-scam impersonation
      { pattern: /\b(microsoft|apple|amazon) support\b/i, severity: "high" },
      { pattern: /\bvirus (detected|found) on your (computer|device)\b/i, severity: "high" },
      { pattern: /\byour (computer|account) (has been|is) compromised\b/i, severity: "high" },
      { pattern: /\btech support\b/i, severity: "medium" },
      // UK-specific
      { pattern: /\bhmrc\b/i, severity: "high" },
      { pattern: /\btv licen[cs]e\b/i, severity: "medium" },
      { pattern: /\bdvla\b/i, severity: "medium" },
      // India-specific
      { pattern: /\bdigital arrest\b/i, severity: "high" },
      { pattern: /\bcyber crime cell\b/i, severity: "high" },
      { pattern: /\btrai\b/i, severity: "medium" },
    ],
    es: [
      { pattern: /\bsoy del banco\b/i, severity: "high" },
      { pattern: /\bdepartamento de fraude\b/i, severity: "medium" },
      { pattern: /\bpolic(í|i)a\b/i, severity: "medium" },
      { pattern: /\borden de arresto\b/i, severity: "high" },
      { pattern: /\bhas sido arrestado\b/i, severity: "high" },
      { pattern: /\bagente [a-z]+\b/i, severity: "low" },
      { pattern: /\bsoporte t(é|e)cnico\b/i, severity: "medium" },
      { pattern: /\bvirus (detectado|encontrado) en (tu|su) (computadora|dispositivo)\b/i, severity: "high" },
    ],
    fr: [
      { pattern: /\bje suis (de|du) (la banque|votre banque)\b/i, severity: "high" },
      { pattern: /\bmandat d'?arrêt\b/i, severity: "high" },
      { pattern: /\bvous êtes en état d'?arrestation\b/i, severity: "high" },
      { pattern: /\bsupport technique\b/i, severity: "medium" },
      { pattern: /\bpolice\b/i, severity: "low" },
    ],
    zh: [
      { pattern: /公安局?|警察/, severity: "medium" },
      { pattern: /冻结(您的)?账户/, severity: "high" },
      { pattern: /逮捕令/, severity: "high" },
      { pattern: /涉嫌洗钱/, severity: "high" },
      { pattern: /(微软|苹果|亚马逊)客服/, severity: "high" },
    ],
    vi: [
      { pattern: /\bcông an\b/i, severity: "medium" },
      { pattern: /\blệnh bắt giữ\b/i, severity: "high" },
      { pattern: /\btôi là (từ|nhân viên) ngân hàng\b/i, severity: "high" },
    ],
    tl: [
      { pattern: /\bito ay mula sa bangko\b/i, severity: "high" },
      { pattern: /\bwarrant ng pag-?aresto\b/i, severity: "high" },
      { pattern: /\bpulis\b/i, severity: "low" },
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
      // Romance-scam framing
      { pattern: /\bmy love,? i need\b/i, severity: "high" },
      { pattern: /\bcan'?t (video call|video chat|show my face) (right now|yet)\b/i, severity: "medium" },
      { pattern: /\bi'?ve never felt this way (before|about anyone)\b/i, severity: "medium" },
      { pattern: /\bstuck (overseas|abroad|at customs)\b/i, severity: "high" },
    ],
    es: [
      { pattern: /\bestoy asustad[oa]\b/i, severity: "medium" },
      { pattern: /\bpor favor ay(ú|u)dame\b/i, severity: "medium" },
      { pattern: /\bestoy en (problemas|la c(á|a)rcel|el hospital)\b/i, severity: "high" },
      { pattern: /\beres la (ú|u)nica persona que puede ayudarme\b/i, severity: "medium" },
      { pattern: /\bsi de verdad me quieres\b/i, severity: "high" },
      { pattern: /\bmi amor,? necesito\b/i, severity: "high" },
      { pattern: /\bnunca (me hab(í|i)a sentido as(í|i)|hab(í|i)a sentido esto)\b/i, severity: "medium" },
      { pattern: /\batrapad[oa] en el extranjero\b/i, severity: "high" },
    ],
    fr: [
      { pattern: /\bj'?ai (tellement )?peur\b/i, severity: "medium" },
      { pattern: /\baide-?moi,? s'?il te plaît\b/i, severity: "medium" },
      { pattern: /\bje suis (en prison|à l'?hôpital|dans le pétrin)\b/i, severity: "high" },
      { pattern: /\bsi tu m'?aimes vraiment\b/i, severity: "high" },
    ],
    zh: [
      { pattern: /我很害怕/, severity: "medium" },
      { pattern: /请帮帮我/, severity: "medium" },
      { pattern: /我在(监狱|医院|麻烦)/, severity: "high" },
    ],
    vi: [
      { pattern: /\blàm ơn giúp tôi\b/i, severity: "medium" },
      { pattern: /\btôi đang gặp rắc rối\b/i, severity: "high" },
      { pattern: /\btôi rất sợ\b/i, severity: "medium" },
    ],
    tl: [
      { pattern: /\bpakitulungan mo ako\b/i, severity: "medium" },
      { pattern: /\bnasa gulo ako\b/i, severity: "high" },
      { pattern: /\bkung mahal mo talaga ako\b/i, severity: "high" },
    ],
  },
};

export function classifyText(text: string, lang: CallLanguage, customPatterns: CustomPattern[] = []): CategoryMatch[] {
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
  // Community-imported patterns are plain phrases (not regex — imported
  // from an untrusted file), so they're matched as a literal
  // case-insensitive substring rather than compiled into a RegExp.
  const lowerText = text.toLowerCase();
  for (const custom of customPatterns) {
    const phrase = custom.phrase.trim().toLowerCase();
    if (!phrase) continue;
    const index = lowerText.indexOf(phrase);
    if (index !== -1) {
      matches.push({ category: custom.category, severity: custom.severity, phrase: custom.phrase, index });
    }
  }
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
