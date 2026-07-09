import { describe, expect, it } from "vitest";
import { bandForRisk, computeCombinedRisk, computeTrustSnapshot } from "./fusionEngine";

describe("computeCombinedRisk", () => {
  it("weighs the larger signal more heavily than the smaller one", () => {
    const risk = computeCombinedRisk(80, 0);
    // hi*0.6 + lo*0.4 = 80*0.6 + 0*0.4 = 48
    expect(risk).toBeCloseTo(48, 5);
  });

  it("escalates when both signals are high, beyond what either gives alone", () => {
    const oneSignal = computeCombinedRisk(80, 0);
    const bothSignals = computeCombinedRisk(80, 80);
    expect(bothSignals).toBeGreaterThan(oneSignal);
    expect(bothSignals).toBeCloseTo(80, 5);
  });

  it("clamps to the 0-100 range", () => {
    expect(computeCombinedRisk(0, 0)).toBe(0);
    expect(computeCombinedRisk(100, 100)).toBe(100);
  });
});

describe("bandForRisk", () => {
  it("classifies low combined risk as safe at neutral sensitivity", () => {
    expect(bandForRisk(10, 50)).toBe("safe");
  });

  it("classifies high combined risk as danger at neutral sensitivity", () => {
    expect(bandForRisk(90, 50)).toBe("danger");
  });

  it("higher sensitivity lowers the threshold into danger sooner", () => {
    const atNeutral = bandForRisk(60, 50);
    const atHighSensitivity = bandForRisk(60, 100);
    // Same risk score, but higher sensitivity should never read *safer*.
    const rank = { safe: 0, caution: 1, danger: 2 };
    expect(rank[atHighSensitivity]).toBeGreaterThanOrEqual(rank[atNeutral]);
  });
});

describe("computeTrustSnapshot", () => {
  it("produces a trust score that is the inverse of combined risk", () => {
    const snapshot = computeTrustSnapshot(0, 0, 50, 1000);
    expect(snapshot.trustScore).toBe(100);
    expect(snapshot.band).toBe("safe");
  });

  it("carries through the timestamp unchanged", () => {
    const snapshot = computeTrustSnapshot(20, 20, 50, 4242);
    expect(snapshot.timestampMs).toBe(4242);
  });
});
