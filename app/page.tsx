import { readFile } from "node:fs/promises";
import Script from "next/script";
export default async function Home() {
  const html = (await readFile("daylio-web/index.html", "utf8")).replaceAll(
    "\r\n",
    "\n",
  );
  const body = html.match(/<body>([\s\S]*)<\/body>/)?.[1] || "";
  return (
    <>
      <link rel="stylesheet" href="/marketing/styles.css" />
      <div
        dangerouslySetInnerHTML={{
          __html: body
            .replace('<script src="app.js"></script>', "")
            .replaceAll('src="assets/', 'src="/marketing/assets/')
            .replaceAll('href="assets/', 'href="/marketing/assets/'),
        }}
      />
      <Script src="/marketing/app.js" strategy="afterInteractive" />
    </>
  );
}
