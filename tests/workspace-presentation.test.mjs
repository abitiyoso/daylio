import { test } from "node:test";
import assert from "node:assert/strict";
import {
  leadStageCounts,
  displayDate,
  displayValue,
  emergencyContact,
  familyContacts,
} from "../lib/workspace-presentation.mjs";

test("Partial legacy passports expose missing emergency fields without fabricating a contact", () => {
  assert.deepEqual(emergencyContact({}), {
    complete: false,
    label: "Belum dilengkapi",
  });
  assert.deepEqual(emergencyContact({ emergencyName: "  Ratna  " }), {
    complete: false,
    label: "Ratna · Telepon belum dilengkapi",
  });
  assert.deepEqual(emergencyContact({ emergencyPhone: "081234" }), {
    complete: false,
    label: "Nama belum dilengkapi · 081234",
  });
  assert.deepEqual(
    emergencyContact({ emergencyName: "Ratna", emergencyPhone: "081234" }),
    { complete: true, label: "Ratna · 081234" },
  );
  assert.equal(displayValue("  "), "Belum dilengkapi");
  assert.equal(displayValue(undefined), "Belum dilengkapi");
  assert.equal(displayValue(1), "1");
});
test("Family contacts render available fields and tolerate absent legacy contact lists", () => {
  assert.equal(familyContacts(undefined), "Belum dilengkapi");
  assert.equal(
    familyContacts([null, {}, { name: "Fajar", relationship: "Ayah" }]),
    "Fajar · Ayah",
  );
  assert.equal(
    familyContacts([{ name: "Fajar", phone: "081234" }]),
    "Fajar · 081234",
  );
});

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
