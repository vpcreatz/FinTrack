
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setError("");
    setMessage("");
    setLoading(true);

    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              display_name: name.trim(),
            },
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });

        if (error) throw error;

        if (data.session) {
          router.replace("/");
          router.refresh();
        } else {
          setMessage(
            "Account created! Check your email for the confirmation link before logging in."
          );
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        router.replace("/");
        router.refresh();
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "#F8FAFC",
        padding: 20,
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: 420,
          background: "#FFFFFF",
          padding: 32,
          borderRadius: 16,
          border: "1px solid #E2E8F0",
        }}
      >
        <h1 style={{ fontSize: 28, fontWeight: 800, color: "#0F172A" }}>
          FinTrack
        </h1>

        <p style={{ color: "#64748B", marginTop: 8, marginBottom: 28 }}>
          {mode === "login"
            ? "Welcome back. Sign in to continue."
            : "Create your personal finance account."}
        </p>

        <form onSubmit={handleSubmit}>
          {mode === "signup" && (
            <>
              <label className="field-label" htmlFor="name">
                Your name
              </label>
              <input
                id="name"
                className="form-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                required
              />
            </>
          )}

          <label className="field-label" htmlFor="email">
            Email address
          </label>
          <input
            id="email"
            className="form-input"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />

          <label className="field-label" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            className="form-input"
            type="password"
            autoComplete={
              mode === "login" ? "current-password" : "new-password"
            }
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            placeholder="At least 8 characters"
            required
          />

          {error && (
            <p style={{ color: "#DC2626", fontSize: 13, marginTop: 14 }}>
              {error}
            </p>
          )}

          {message && (
            <p style={{ color: "#047857", fontSize: 13, marginTop: 14 }}>
              {message}
            </p>
          )}

          <button
            type="submit"
            className="primary-button"
            disabled={loading}
            style={{
              width: "100%",
              marginTop: 24,
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading
              ? "Please wait..."
              : mode === "login"
                ? "Sign in"
                : "Create account"}
          </button>
        </form>

        <p style={{ textAlign: "center", marginTop: 24, fontSize: 14 }}>
          {mode === "login"
            ? "Don't have an account? "
            : "Already have an account? "}

          <button
            type="button"
            onClick={() => {
              setMode(mode === "login" ? "signup" : "login");
              setError("");
              setMessage("");
            }}
            style={{
              border: 0,
              background: "none",
              color: "#2563EB",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {mode === "login" ? "Sign up" : "Sign in"}
          </button>
        </p>
      </section>
    </main>
  );
}
