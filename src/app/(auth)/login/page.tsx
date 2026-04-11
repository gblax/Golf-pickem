"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import Link from "next/link";
import { Button, Input, Label, Alert, Card, CardContent } from "@/components/ui";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Invalid email or password");
    } else {
      window.location.href = "/";
    }
  }

  return (
    <div className="relative flex min-h-[calc(100vh-4rem-88px)] items-center justify-center overflow-hidden px-4 py-16">
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-b from-cream-50 to-emerald-50"
      />
      <div
        aria-hidden
        className="absolute left-[-120px] top-[-120px] h-72 w-72 rounded-full bg-emerald-200/40 blur-3xl"
      />
      <Card className="relative w-full max-w-md">
        <CardContent className="p-8">
          <div className="mb-6 text-center">
            <div
              aria-hidden
              className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-700"
            >
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none">
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
            </div>
            <h1 className="font-display text-2xl font-semibold text-stone-900">
              Welcome back
            </h1>
            <p className="mt-1 text-sm text-stone-500">
              Sign in to your Golf Pick&apos;em account
            </p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <Alert variant="error">{error}</Alert>}
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            <Button type="submit" loading={loading} fullWidth size="lg">
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-stone-500">
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="font-medium text-emerald-700 hover:text-emerald-800"
            >
              Register
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
