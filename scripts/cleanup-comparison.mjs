import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
await mkdir("evidence/design-qa/cleanup", { recursive: true });
const report = [];
for (const [role, source] of [
  ["owner", "desktop_owner"],
  ["manager", "desktop_manager"],
  ["caregiver", "desktop_caregiver"],
  ["parent", "desktop_parent"],
]) {
  const ref = `design-reference/Daylio_Backend_v3/${source}.png`,
    actual = `evidence/screenshots/cleanup/${role}-1440-viewport.png`;
  const meta = await sharp(ref).metadata(),
    built = await sharp(actual).metadata(),
    height = Math.min(meta.height, built.height);
  await sharp({
    create: { width: 2880, height, channels: 3, background: "#ffffff" },
  })
    .composite([
      {
        input: await sharp(ref)
          .extract({ left: 0, top: 0, width: 1440, height })
          .toBuffer(),
        left: 0,
        top: 0,
      },
      {
        input: await sharp(actual)
          .extract({ left: 0, top: 0, width: 1440, height })
          .toBuffer(),
        left: 1440,
        top: 0,
      },
    ])
    .png()
    .toFile(`evidence/design-qa/cleanup/${role}-desktop-comparison.png`);
  report.push({
    role,
    reference: ref,
    actual,
    referencePixels: [meta.width, meta.height],
    actualPixels: [built.width, built.height],
    cssViewport: [1440, 1000],
    deviceScaleFactor: 1,
    comparisonRegion: [1440, height],
    left: "approved reference",
    right: "authenticated implementation",
  });
}
for (const role of ["owner", "caregiver", "parent"]) {
  const ref =
      role === "caregiver"
        ? "evidence/design-qa/cleanup/reference-states/caregiver-390.png"
        : `design-reference/Daylio_Backend_v3/mobile_${role}.png`,
    actual = `evidence/screenshots/cleanup/${role}-390.png`;
  const meta = await sharp(ref).metadata(),
    built = await sharp(actual).metadata(),
    height = Math.min(844, meta.height, built.height);
  await sharp({
    create: { width: 780, height, channels: 3, background: "#ffffff" },
  })
    .composite([
      {
        input: await sharp(ref)
          .extract({ left: 0, top: 0, width: 390, height })
          .toBuffer(),
        left: 0,
        top: 0,
      },
      {
        input: await sharp(actual)
          .extract({ left: 0, top: 0, width: 390, height })
          .toBuffer(),
        left: 390,
        top: 0,
      },
    ])
    .png()
    .toFile(`evidence/design-qa/cleanup/${role}-mobile-comparison.png`);
  report.push({
    role,
    reference: ref,
    actual,
    referencePixels: [meta.width, meta.height],
    actualPixels: [built.width, built.height],
    cssViewport: [390, 844],
    deviceScaleFactor: 1,
    comparisonRegion: [390, height],
  });
}
for (const [role, width] of [
  ["manager", 390],
  ["manager", 820],
  ["caregiver", 820],
]) {
  const ref = `evidence/design-qa/cleanup/reference-states/${role}-${width}-viewport.png`,
    actual = `evidence/screenshots/cleanup/${role}-${width}-viewport.png`;
  const height = width === 390 ? 844 : 1000;
  await sharp({
    create: { width: width * 2, height, channels: 3, background: "#ffffff" },
  })
    .composite([
      { input: await sharp(ref).toBuffer(), left: 0, top: 0 },
      { input: await sharp(actual).toBuffer(), left: width, top: 0 },
    ])
    .png()
    .toFile(
      `evidence/design-qa/cleanup/${role}-${width}-matched-comparison.png`,
    );
  report.push({
    role,
    reference: ref,
    actual,
    cssViewport: [width, height],
    deviceScaleFactor: 1,
    state: role === "manager" ? "Control Tower" : "Quick Care",
    left: "approved HTML rendered in matching state",
    right: "authenticated implementation",
  });
}
const sourceCard = await sharp(
  "design-reference/Daylio_Backend_v3/desktop_parent.png",
)
  .extract({ left: 278, top: 583, width: 660, height: 402 })
  .toBuffer();
const actualCard = await sharp(
  "evidence/screenshots/cleanup/parent-story-card-1440.png",
)
  .resize({ width: 660 })
  .toBuffer();
const actualMeta = await sharp(actualCard).metadata();
await sharp({
  create: {
    width: 1320,
    height: Math.max(402, actualMeta.height),
    channels: 3,
    background: "#f8f9fc",
  },
})
  .composite([
    { input: sourceCard, top: 0, left: 0 },
    { input: actualCard, top: 0, left: 660 },
  ])
  .png()
  .toFile("evidence/design-qa/cleanup/parent-story-focused.png");
report.push({
  region: "Parent Daily Story",
  sourceCrop: [278, 583, 660, 402],
  actual: "evidence/screenshots/cleanup/parent-story-card-1440.png",
  normalization:
    "same 660px card width; aspect ratio retained; narrative longer and typography deliberately larger than original reference per corrective brief",
});
const roles = ["owner", "manager", "caregiver", "parent"];
await sharp({
  create: { width: 1440, height: 1000, channels: 3, background: "#f8f9fc" },
})
  .composite(
    await Promise.all(
      roles.map(async (role, i) => ({
        input: await sharp(
          `evidence/screenshots/cleanup/${role}-1440-viewport.png`,
        )
          .resize(720, 500)
          .toBuffer(),
        left: (i % 2) * 720,
        top: Math.floor(i / 2) * 500,
      })),
    ),
  )
  .png()
  .toFile("evidence/screenshots/cleanup/desktop-overview.png");
await sharp({
  create: { width: 1560, height: 844, channels: 3, background: "#f8f9fc" },
})
  .composite(
    await Promise.all(
      roles.map(async (role, i) => ({
        input: await sharp(
          `evidence/screenshots/cleanup/${role}-390-viewport.png`,
        ).toBuffer(),
        left: i * 390,
        top: 0,
      })),
    ),
  )
  .png()
  .toFile("evidence/screenshots/cleanup/mobile-overview.png");
await writeFile(
  "evidence/design-qa/cleanup/comparison-manifest.json",
  JSON.stringify(report, null, 2),
);
console.log(
  "Matched viewport comparisons, focused Parent story, desktop/mobile overview screenshots.",
);
