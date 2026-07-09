import { describe, expect, it } from "vitest";
import { classifyText, scoreTranscriptRisk, toRiskSpans } from "./scamClassifier";

describe("classifyText", () => {
  it("flags a gift-card financial request in English", () => {
    const matches = classifyText("Please pay with gift cards right now", "en");
    const categories = matches.map((m) => m.category);
    expect(categories).toContain("financial-request");
    expect(categories).toContain("urgency");
  });

  it("flags the equivalent Spanish phrasing", () => {
    const matches = classifyText("Necesitas enviar dinero, actúa ahora mismo", "es");
    const categories = matches.map((m) => m.category);
    expect(categories).toContain("urgency");
  });

  it("returns no matches for a benign sentence", () => {
    const matches = classifyText("Are you still coming for dinner Sunday?", "en");
    expect(matches).toHaveLength(0);
  });

  it("does not cross-match categories between languages", () => {
    const matches = classifyText("tarjeta de regalo", "en");
    expect(matches).toHaveLength(0);
  });

  it("reports a correct match index for span highlighting", () => {
    const text = "Well, don't tell anyone about this.";
    const matches = classifyText(text, "en");
    const isolation = matches.find((m) => m.category === "isolation");
    expect(isolation).toBeDefined();
    expect(text.slice(isolation!.index, isolation!.index + isolation!.phrase.length).toLowerCase()).toBe(
      isolation!.phrase.toLowerCase()
    );
  });

  it("flags a French urgency phrase for the fr call language", () => {
    const matches = classifyText("Agissez maintenant, s'il vous plaît", "fr");
    expect(matches.map((m) => m.category)).toContain("urgency");
  });

  it("flags a Mandarin authority-impersonation phrase for the zh call language", () => {
    const matches = classifyText("我是公安局的，您的账户涉嫌洗钱", "zh");
    expect(matches.map((m) => m.category)).toContain("authority-impersonation");
  });

  it("matches a user-imported community pattern as a literal substring", () => {
    const matches = classifyText(
      "Okay, just send me a prepaid card and we're done",
      "en",
      [{ id: "p1", category: "financial-request", phrase: "send me a prepaid card", severity: "high" }]
    );
    expect(matches).toHaveLength(1);
    expect(matches[0]).toMatchObject({ category: "financial-request", severity: "high", phrase: "send me a prepaid card" });
  });

  it("does not match a community pattern that isn't present in the text", () => {
    const matches = classifyText("Are you still coming for dinner?", "en", [
      { id: "p1", category: "financial-request", phrase: "send me a prepaid card", severity: "high" },
    ]);
    expect(matches).toHaveLength(0);
  });
});

describe("toRiskSpans", () => {
  it("converts matches into start/end spans preserving category", () => {
    const matches = classifyText("gift cards, act now", "en");
    const spans = toRiskSpans(matches);
    expect(spans.length).toBe(matches.length);
    for (const span of spans) {
      expect(span.end).toBeGreaterThan(span.start);
    }
  });
});

describe("scoreTranscriptRisk", () => {
  it("returns 0 for no matches", () => {
    expect(scoreTranscriptRisk([])).toBe(0);
  });

  it("escalates further when multiple distinct categories fire together", () => {
    const single = scoreTranscriptRisk([{ category: "urgency", severity: "high", phrase: "act now", index: 0 }]);
    const combined = scoreTranscriptRisk([
      { category: "urgency", severity: "high", phrase: "act now", index: 0 },
      { category: "financial-request", severity: "high", phrase: "gift cards", index: 10 },
    ]);
    expect(combined).toBeGreaterThan(single);
  });

  it("never exceeds 100", () => {
    const many = Array.from({ length: 10 }, (_, i) => ({
      category: (["urgency", "financial-request", "isolation", "authority-impersonation", "emotional-manipulation"] as const)[
        i % 5
      ],
      severity: "high" as const,
      phrase: "x",
      index: i,
    }));
    expect(scoreTranscriptRisk(many)).toBeLessThanOrEqual(100);
  });
});
