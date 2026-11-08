import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Daylio by Elenio",
  description: "Buat daycare lebih dipercaya dan mudah dikelola.",
  icons: { icon: "/marketing/assets/daylio-favicon.svg" },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
