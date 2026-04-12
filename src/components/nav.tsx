"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

function Flag({ className }: { className?: string }) {
  // Small golf-flag SVG for the brand mark
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <path
        d="M6 3v18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M6 4l10 3-10 3"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="6" cy="21" r="1.5" fill="currentColor" />
    </svg>
  );
}

export default function Nav() {
  const { data: session } = useSession();
  const pathname = usePathname() ?? "/";
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    if (!userMenuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(e.target as Node)
      ) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [userMenuOpen]);

  // Close menus on Escape key
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setUserMenuOpen(false);
        setMenuOpen(false);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMenuOpen(false);
    setUserMenuOpen(false);
  }, [pathname]);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const navLinks = session
    ? [
        { href: "/tournaments", label: "Tournaments" },
        { href: "/standings", label: "Standings" },
        { href: "/rules", label: "Rules" },
      ]
    : [{ href: "/rules", label: "Rules" }];

  const isAdmin = (session?.user as { isAdmin?: boolean })?.isAdmin;

  return (
    <nav
      className="sticky top-0 z-40 border-b border-gold-400/60 bg-emerald-700 text-white shadow-sm"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex h-16 items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight hover:text-gold-200"
          >
            <Flag className="h-5 w-5 text-gold-300" />
            Golf Pick&apos;em
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex md:items-center md:gap-1">
            {navLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "relative rounded-md px-3 py-2 text-sm font-medium transition-colors hover:text-white",
                  isActive(l.href)
                    ? "text-white after:absolute after:inset-x-3 after:-bottom-0.5 after:h-0.5 after:rounded-full after:bg-gold-300"
                    : "text-emerald-100"
                )}
              >
                {l.label}
              </Link>
            ))}
            {isAdmin && (
              <Link
                href="/admin"
                className={cn(
                  "relative rounded-md px-3 py-2 text-sm font-medium transition-colors hover:text-white",
                  isActive("/admin")
                    ? "text-white after:absolute after:inset-x-3 after:-bottom-0.5 after:h-0.5 after:rounded-full after:bg-gold-300"
                    : "text-emerald-100"
                )}
              >
                Admin
              </Link>
            )}

            <div className="ml-3 flex items-center gap-2">
              {session ? (
                <div className="relative" ref={userMenuRef}>
                  <button
                    onClick={() => setUserMenuOpen((o) => !o)}
                    className="flex items-center gap-2 rounded-md border border-emerald-500/50 bg-emerald-800/40 px-3 py-1.5 text-sm font-medium hover:bg-emerald-800"
                    aria-haspopup="menu"
                    aria-expanded={userMenuOpen}
                  >
                    <span className="max-w-[140px] truncate">
                      {session.user?.name}
                    </span>
                    <ChevronDown className={cn("h-4 w-4 opacity-80 transition-transform duration-200", userMenuOpen && "rotate-180")} />
                  </button>
                  {userMenuOpen && (
                    <div
                      role="menu"
                      className="animate-dropdown-enter absolute right-0 mt-2 w-48 overflow-hidden rounded-lg border border-stone-200 bg-white py-1 text-sm text-stone-800 shadow-lg"
                    >
                      <Link
                        href="/profile"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-2.5 transition-colors hover:bg-cream-100"
                        role="menuitem"
                      >
                        Profile
                      </Link>
                      <div className="mx-3 border-t border-stone-100" />
                      <button
                        onClick={() => {
                          setUserMenuOpen(false);
                          signOut();
                        }}
                        className="flex w-full cursor-pointer items-center gap-2 px-4 py-2.5 text-left transition-colors hover:bg-cream-100"
                        role="menuitem"
                      >
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="rounded-md px-3 py-2 text-sm font-medium text-emerald-100 hover:text-white"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/register"
                    className="rounded-md bg-gold-400 px-3 py-1.5 text-sm font-semibold text-stone-900 shadow-sm hover:bg-gold-500"
                  >
                    Register
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Mobile toggle */}
          <button
            className="rounded-md p-2 hover:bg-emerald-800 md:hidden"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Toggle menu"
          >
            {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile menu */}
        <div
          className={cn(
            "md:hidden overflow-hidden transition-[max-height,opacity] duration-200 ease-out",
            menuOpen ? "max-h-96 opacity-100 pb-3" : "max-h-0 opacity-0"
          )}
        >
          <div className="flex flex-col gap-1 pt-2">
            {session ? (
              <>
                {navLinks.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    className={cn(
                      "rounded-md px-3 py-2 text-sm",
                      isActive(l.href)
                        ? "bg-emerald-800 text-white"
                        : "text-emerald-100 hover:bg-emerald-800/60"
                    )}
                    onClick={() => setMenuOpen(false)}
                  >
                    {l.label}
                  </Link>
                ))}
                <Link
                  href="/profile"
                  className={cn(
                    "rounded-md px-3 py-2 text-sm",
                    isActive("/profile")
                      ? "bg-emerald-800 text-white"
                      : "text-emerald-100 hover:bg-emerald-800/60"
                  )}
                  onClick={() => setMenuOpen(false)}
                >
                  Profile
                </Link>
                {isAdmin && (
                  <Link
                    href="/admin"
                    className={cn(
                      "rounded-md px-3 py-2 text-sm",
                      isActive("/admin")
                        ? "bg-emerald-800 text-white"
                        : "text-emerald-100 hover:bg-emerald-800/60"
                    )}
                    onClick={() => setMenuOpen(false)}
                  >
                    Admin
                  </Link>
                )}
                <div className="mt-1 border-t border-emerald-600/60 pt-2">
                  <p className="px-3 text-xs uppercase tracking-wider text-emerald-200">
                    Signed in as {session.user?.name}
                  </p>
                  <button
                    onClick={() => {
                      signOut();
                      setMenuOpen(false);
                    }}
                    className="mt-1 block w-full rounded-md px-3 py-2 text-left text-sm text-emerald-100 hover:bg-emerald-800/60"
                  >
                    Sign Out
                  </button>
                </div>
              </>
            ) : (
              <>
                {navLinks.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    className={cn(
                      "rounded-md px-3 py-2 text-sm",
                      isActive(l.href)
                        ? "bg-emerald-800 text-white"
                        : "text-emerald-100 hover:bg-emerald-800/60"
                    )}
                    onClick={() => setMenuOpen(false)}
                  >
                    {l.label}
                  </Link>
                ))}
                <Link
                  href="/login"
                  className="rounded-md px-3 py-2 text-sm text-emerald-100 hover:bg-emerald-800/60"
                  onClick={() => setMenuOpen(false)}
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="mt-1 block rounded-md bg-gold-400 px-3 py-2 text-sm font-semibold text-stone-900 hover:bg-gold-500"
                  onClick={() => setMenuOpen(false)}
                >
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
