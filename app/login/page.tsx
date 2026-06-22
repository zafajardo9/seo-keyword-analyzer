"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CircleNotch, Sparkle } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!username.trim() || !password.trim()) {
      setError("Please enter your username and password.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          password: password.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error ?? "Login failed.");
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden">
      {/* Background */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-40"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 20% 40%, oklch(0.553 0.195 38.402 / 12%) 0%, transparent 70%), radial-gradient(ellipse 60% 80% at 80% 70%, oklch(0.553 0.195 38.402 / 8%) 0%, transparent 70%)",
          backgroundSize: "200% 200%",
          backgroundPosition: "0% 0%",
        }}
      />

      <div className="flex flex-col items-center gap-8">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <Sparkle size={18} weight="fill" className="text-primary" />
          <span className="font-mono text-lg font-semibold tracking-tight">
            SEO Analyzer
          </span>
        </div>

        {/* Login form */}
        <div className="w-full max-w-sm border border-border bg-background p-6">
          <div className="mb-5 space-y-1">
            <h1 className="font-mono text-sm font-bold tracking-tight">
              Sign in
            </h1>
            <p className="font-mono text-xs text-muted-foreground">
              Enter your credentials to access the dashboard.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label
                htmlFor="username"
                className="font-mono text-xs uppercase tracking-widest text-muted-foreground"
              >
                Username
              </Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                className="font-mono text-xs"
                disabled={loading}
                autoFocus
              />
            </div>

            <div className="space-y-1">
              <Label
                htmlFor="password"
                className="font-mono text-xs uppercase tracking-widest text-muted-foreground"
              >
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="font-mono text-xs"
                disabled={loading}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit(e as any)}
              />
            </div>

            {error && (
              <div className="border border-destructive/40 bg-destructive/5 p-3">
                <p className="font-mono text-xs text-destructive">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full font-mono text-xs uppercase tracking-widest"
              disabled={loading}
            >
              {loading ? (
                <>
                  <CircleNotch size={13} className="animate-spin" />
                  Signing in…
                </>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
