import type { Metadata } from "next";
import "./globals.css";
import SessionProvider from "@/components/session-provider";
import Nav from "@/components/nav";

export const metadata: Metadata = {
  title: "Golf Pick'em",
  description: "Weekly PGA tournament pick-em pool",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:wght@500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col bg-cream-50 text-stone-900 font-sans">
        <SessionProvider>
          <Nav />
          <main className="flex-1">{children}</main>
          <footer className="mt-16 border-t border-stone-200 bg-cream-100/60">
            <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-6 text-xs text-stone-500 sm:flex-row">
              <span className="flex items-center gap-2">
                <span
                  aria-hidden
                  className="inline-block h-2 w-2 rounded-full bg-emerald-600"
                />
                Golf Pick&apos;em
              </span>
              <span>Built for friends &middot; {new Date().getFullYear()}</span>
            </div>
          </footer>
        </SessionProvider>
      </body>
    </html>
  );
}
