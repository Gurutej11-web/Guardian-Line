import { classifyText, scoreTranscriptRisk, toRiskSpans } from "./scamClassifier";
import { computeTrustSnapshot, generateTranscriptFlags } from "./fusionEngine";
import { getScenario } from "./demoScenarios";
import { CallReport, Language, RiskFlag, TranscriptEntry, TrustSnapshot } from "./types";

/** Builds a fully-formed sample CallReport from the built-in
 * "grandchild in jail" scenario, running it through the same real
 * classifier/fusion pipeline the live dashboard uses (just without a
 * live audio source) — so a first-time visitor to Reports can see a
 * realistic example instead of a truly empty page. Clearly labeled as
 * a sample in the UI that offers it. */
export function buildSampleReport(lang: Language): CallReport {
  const scenario = getScenario("grandchild-in-jail")!;
  const transcript: TranscriptEntry[] = [];
  const flags: RiskFlag[] = [];
  const trustHistory: TrustSnapshot[] = [];
  const recentMatches: { match: ReturnType<typeof classifyText>[number]; atMs: number }[] = [];
  let transcriptRisk = 0;
  let voiceAuth = 0;

  for (const line of scenario.lines) {
    const text = line.text[lang];
    const matches = classifyText(text, lang);
    matches.forEach((m) => recentMatches.push({ match: m, atMs: line.atMs }));
    transcriptRisk = scoreTranscriptRisk(recentMatches.map((r) => r.match));
    if (matches.length > 0) flags.push(...generateTranscriptFlags(matches, line.atMs, lang));

    transcript.push({
      id: `sample-${line.atMs}`,
      timestampMs: line.atMs,
      speaker: line.speaker,
      text,
      riskSpans: toRiskSpans(matches),
      isFinal: true,
    });

    if (typeof line.simulatedSyntheticProbability === "number") {
      voiceAuth = line.simulatedSyntheticProbability;
    }
    trustHistory.push(computeTrustSnapshot(voiceAuth, transcriptRisk, 50, line.atMs));
  }

  const final = trustHistory[trustHistory.length - 1];
  const now = new Date();

  return {
    id: `sample-report-${now.getTime()}`,
    startedAt: now.toISOString(),
    endedAt: now.toISOString(),
    durationMs: scenario.lines[scenario.lines.length - 1].atMs + 4500,
    scenario: `${scenario.name[lang]} (${lang === "en" ? "sample" : "muestra"})`,
    finalTrustScore: final.trustScore,
    finalBand: final.band,
    flags,
    transcript,
    trustHistory,
    voiceSamples: [],
    safeWordChallenged: true,
    safeWordPassed: false,
    tags: [lang === "en" ? "sample" : "muestra"],
    notes: "",
    feedback: null,
    callLanguage: lang,
  };
}
