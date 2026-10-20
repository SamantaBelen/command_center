import { test } from "node:test";
import assert from "node:assert/strict";
import { suggestPriority, weekBounds } from "../../src/lib/planning";

test("suggestPriority: null until the three inputs are filled", () => {
  assert.equal(suggestPriority({ importance: null, impact: null, effort: null }), null);
  assert.equal(suggestPriority({ importance: "Need", impact: null, effort: null }), null);
  assert.equal(suggestPriority({ importance: "Need", impact: 4, effort: null }), null);
});

test("suggestPriority: Alta for Urgente/Necesaria", () => {
  assert.equal(suggestPriority({ importance: "Urgent", impact: 1, effort: 5 }), "High");
  assert.equal(suggestPriority({ importance: "Need", impact: 3, effort: 3 }), "High");
});

test("suggestPriority: Alta for high impact + low effort", () => {
  assert.equal(suggestPriority({ importance: "Required", impact: 5, effort: 2 }), "High");
});

test("suggestPriority: Baja for Quiero / low impact / heavy-low", () => {
  assert.equal(suggestPriority({ importance: "Want", impact: 3, effort: 3 }), "Low");
  assert.equal(suggestPriority({ importance: "Required", impact: 2, effort: 2 }), "Low");
  assert.equal(suggestPriority({ importance: "Required", impact: 3, effort: 4 }), "Low");
});

test("suggestPriority: Alta (quick win) overrides a mere Quiero", () => {
  // High impact + low effort is checked before the Want→Low rule, so a quick
  // win you only "want" is still Alta.
  assert.equal(suggestPriority({ importance: "Want", impact: 5, effort: 1 }), "High");
});

test("suggestPriority: Media otherwise", () => {
  assert.equal(suggestPriority({ importance: "Required", impact: 3, effort: 2 }), "Medium");
});

test("weekBounds: Monday–Sunday around a mid-week day", () => {
  // 2026-10-21 is a Wednesday
  const w = weekBounds("2026-10-21");
  assert.equal(w.start, "2026-10-19"); // Monday
  assert.equal(w.end, "2026-10-25"); // Sunday
  assert.equal(w.days.length, 7);
  assert.deepEqual(w.days[0], "2026-10-19");
  assert.deepEqual(w.days[6], "2026-10-25");
});

test("weekBounds: a Sunday stays in its own Mon–Sun week", () => {
  const w = weekBounds("2026-10-25"); // Sunday
  assert.equal(w.start, "2026-10-19");
  assert.equal(w.end, "2026-10-25");
});

test("weekBounds: handles month boundaries", () => {
  const w = weekBounds("2026-11-01"); // Sunday
  assert.equal(w.start, "2026-10-26");
  assert.equal(w.end, "2026-11-01");
});
