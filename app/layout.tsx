import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MelekCafe POS",
  description: "Sistem kasir dan manajemen inventori MelekCafe — Seribu Kenikmatan disetiap Seruputan.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
