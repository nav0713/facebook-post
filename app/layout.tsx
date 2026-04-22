import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Taglish News Extractor",
  description:
    "I-paste ang link ng balita — i-e-extract ng AI ang mahahalagang detalye at isusulat ang headline sa natural na Taglish.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fil">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=DM+Serif+Display&family=Anton&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
