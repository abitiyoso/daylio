// One-page operational summary. Values are computed counts, never child identifiers.
export function operationsPdf(counts) {
  const escape = (s) =>
    String(s)
      .replace(/[^\x20-\x7e]/g, "?")
      .replace(/[()\\]/g, "\\$&");
  const lines = [
    "Daylio by Elenio",
    "Operations summary",
    ...Object.entries(counts).map(([key, value]) => `${key}: ${value}`),
  ];
  const stream =
    "BT /F1 14 Tf 50 790 Td 22 TL " +
    lines.map((line, i) => `${i ? "T* " : ""}(${escape(line)}) Tj`).join("\n") +
    " ET";
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (let i = 0; i < objects.length; i++) {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xref = Buffer.byteLength(pdf);
  pdf +=
    `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n` +
    offsets
      .slice(1)
      .map((n) => String(n).padStart(10, "0") + " 00000 n \n")
      .join("") +
    `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf);
}
export function textPdf(title, paragraphs) {
  const lines = [title, "", ...paragraphs].flatMap((value) =>
    String(value)
      .split("\n")
      .flatMap((line) => line.match(/.{1,86}(?:\s|$)|.{1,86}/g) || [""]),
  );
  const pages = [];
  for (let i = 0; i < lines.length; i += 43) pages.push(lines.slice(i, i + 43));
  const objects = [
    "",
    "",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  const pageIds = [];
  for (const page of pages) {
    const pageId = objects.length + 1,
      streamId = pageId + 1;
    pageIds.push(pageId);
    const escape = (s) =>
      String(s)
        .normalize("NFKD")
        .replace(/[^\x20-\x7e]/g, "")
        .replace(/[()\\]/g, "\\$&");
    const stream =
      "BT /F1 11 Tf 45 790 Td 17 TL " +
      page
        .map((line, i) => `${i ? "T* " : ""}(${escape(line)}) Tj`)
        .join("\n") +
      " ET";
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${streamId} 0 R >>`,
      `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
    );
  }
  objects[0] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[1] = `<< /Type /Pages /Kids [${pageIds.map((i) => i + " 0 R").join(" ")}] /Count ${pages.length} >>`;
  let output = "%PDF-1.4\n";
  const offsets = [0];
  for (let i = 0; i < objects.length; i++) {
    offsets.push(Buffer.byteLength(output));
    output += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xref = Buffer.byteLength(output);
  output +=
    `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n` +
    offsets
      .slice(1)
      .map((offset) => String(offset).padStart(10, "0") + " 00000 n \n")
      .join("") +
    `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(output);
}
