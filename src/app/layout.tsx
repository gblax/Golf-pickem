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
      <body className="min-h-full flex flex-col bg-gray-50 text-gray-900 font-sans">
        <SessionProvider>
          <Nav />
          <main className="flex-1">{children}</main>
        </SessionProvider>
      </body>
    </html>
  );
}
