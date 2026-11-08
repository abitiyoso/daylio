import sharp from "sharp";
import { mkdir } from "node:fs/promises";
await mkdir("evidence/design-qa", { recursive: true });
for (const [reference, actual, width, height] of [
  ["desktop_owner", "owner-1440", 1440, 1000],
  ["desktop_caregiver", "caregiver-1440", 1440, 1000],
  ["mobile_parent", "parent-390", 390, 844],
  ["mobile_caregiver", "caregiver-390", 390, 844],
]) {
  const source = await sharp(
    `design-reference/Daylio_Backend_v3/${reference}.png`,
  )
    .extract({ left: 0, top: 0, width, height })
    .png()
    .toBuffer();
  const built = await sharp(`evidence/screenshots/v3/${actual}.png`)
    .extract({ left: 0, top: 0, width, height })
    .png()
    .toBuffer();
  const label = Buffer.from(
    `<svg width="${width * 2}" height="32" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#233555"/><g fill="white" font-family="Arial" font-size="12"><text x="12" y="21">Approved reference</text><text x="${width + 12}" y="21">Authenticated implementation (synthetic test records)</text></g></svg>`,
  );
  await sharp({
    create: {
      width: width * 2,
      height: height + 32,
      channels: 3,
      background: "#ffffff",
    },
  })
    .composite([
      { input: label, top: 0, left: 0 },
      { input: source, top: 32, left: 0 },
      { input: built, top: 32, left: width },
    ])
    .png()
    .toFile(`evidence/design-qa/${actual}-comparison.png`);
}
console.log(
  "Four matched-width/top-viewport reference comparisons written to evidence/design-qa.",
);
