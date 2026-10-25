import { test } from "node:test";
import assert from "node:assert/strict";
import {
  leadStageCounts,
  displayDate,
} from "../lib/workspace-presentation.mjs";

test("Owner pipeline includes contacted and legacy tour records without counting lost/enrolled as active", () => {
  const stages = leadStageCounts({
    contacted: 2,
    tour: 1,
    "tour-booked": 3,
    qualified: 2,
    offered: 1,
    waitlisted: 1,
    lost: 8,
    enrolled: 12,
  });
  assert.equal(
    stages.reduce((sum, s) => sum + s.count, 0),
    10,
  );
  assert.equal(stages.find((s) => s.label === "Dihubungi").count, 2);
  assert.equal(stages.find((s) => s.label === "Survei").count, 4);
  assert.equal(stages.find((s) => s.label === "Penawaran").count, 3);
  assert.ok(leadStageCounts().every((s) => s.count === 0));
});
test("Date-only CRM start dates retain their Jakarta calendar date and missing dates remain explicit", () => {
  assert.match(displayDate("2026-10-24"), /24.*Okt.*2026/i);
  assert.equal(displayDate(null), "Belum ditentukan");
  assert.equal(displayDate("invalid"), "Tanggal belum tersedia");
});
