"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useState } from "react";

export default function Nav() {
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="bg-green-700 text-white shadow-md">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex h-14 items-center justify-between">
          <Link href="/" className="text-lg font-bold tracking-tight">
            Golf Pick&apos;em
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6">
            {session ? (
              <>
                <Link href="/tournaments" className="hover:text-green-200 text-sm font-medium">
                  Tournaments
                </Link>
                <Link href="/standings" className="hover:text-green-200 text-sm font-medium">
                  Standings
                </Link>
                <Link href="/profile" className="hover:text-green-200 text-sm font-medium">
                  Profile
                </Link>
                {(session.user as { isAdmin?: boolean })?.isAdmin && (
                  <Link href="/admin" className="hover:text-green-200 text-sm font-medium">
                    Admin
                  </Link>
                )}
                <span className="text-green-200 text-sm">{session.user?.name}</span>
                <button
                  onClick={() => signOut()}
                  className="rounded bg-green-800 px-3 py-1 text-sm hover:bg-green-900"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="hover:text-green-200 text-sm font-medium">
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="rounded bg-white px-3 py-1 text-sm font-medium text-green-700 hover:bg-green-50"
                >
                  Register
                </Link>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden pb-3 space-y-2">
            {session ? (
              <>
                <Link href="/tournaments" className="block py-1 text-sm hover:text-green-200" onClick={() => setMenuOpen(false)}>
                  Tournaments
                </Link>
                <Link href="/standings" className="block py-1 text-sm hover:text-green-200" onClick={() => setMenuOpen(false)}>
                  Standings
                </Link>
                <Link href="/profile" className="block py-1 text-sm hover:text-green-200" onClick={() => setMenuOpen(false)}>
                  Profile
                </Link>
                {(session.user as { isAdmin?: boolean })?.isAdmin && (
                  <Link href="/admin" className="block py-1 text-sm hover:text-green-200" onClick={() => setMenuOpen(false)}>
                    Admin
                  </Link>
                )}
                <button
                  onClick={() => { signOut(); setMenuOpen(false); }}
                  className="block py-1 text-sm hover:text-green-200"
                >
                  Sign Out ({session.user?.name})
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="block py-1 text-sm" onClick={() => setMenuOpen(false)}>
                  Sign In
                </Link>
                <Link href="/register" className="block py-1 text-sm" onClick={() => setMenuOpen(false)}>
                  Register
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
