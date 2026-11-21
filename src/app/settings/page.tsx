"use client";

import { useEffect, useState } from "react";
import { Copy, KeyRound, LogOut, Save, ShieldCheck, UserRound } from "lucide-react";
import Sidebar from "@/components/layout/Sidebar";
import { createClient } from "@/lib/supabase/client";

type Profile = { display_name: string; currency: string };
const currencies = [
  { code: "INR", label: "Indian Rupee (INR)" },
  { code: "USD", label: "US Dollar (USD)" },
  { code: "EUR", label: "Euro (EUR)" },
  { code: "GBP", label: "British Pound (GBP)" },
  { code: "AED", label: "UAE Dirham (AED)" },
  { code: "CAD", label: "Canadian Dollar (CAD)" },
  { code: "AUD", label: "Australian Dollar (AUD)" },
];

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile>({ display_name: "", currency: "INR" });
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [shortcutToken, setShortcutToken] = useState<{ token_prefix: string; created_at: string; last_used_at: string | null } | null>(null);
  const [newShortcutSecret, setNewShortcutSecret] = useState("");
  const [shortcutBusy, setShortcutBusy] = useState(false);
  const [shortcutMessage, setShortcutMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function loadProfile() {
      try {
        const response = await fetch("/api/profile");
        const result = await response.json();
        if (!response.ok) throw new Error([result.error, result.detail].filter(Boolean).join(" — ") || "Could not load profile.");
        if (!cancelled) {
          setProfile({ display_name: result.profile?.display_name ?? "", currency: result.profile?.currency ?? "INR" });
          setEmail(result.email ?? "");
        }
        const tokenResponse = await fetch("/api/shortcut-token");
        const tokenResult = await tokenResponse.json();
        if (tokenResponse.ok && !cancelled) setShortcutToken(tokenResult.token ?? null);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load profile.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadProfile();
    return () => { cancelled = true; };
  }, []);

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      const result = await response.json();
      if (!response.ok) throw new Error([result.error, result.detail].filter(Boolean).join(" — ") || "Could not save settings.");
      setProfile({ display_name: result.profile.display_name, currency: result.profile.currency });
      setSuccess("Your profile settings have been saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save settings.");
    } finally {
      setSaving(false);
    }
  }


  async function createShortcutToken() {
    setShortcutBusy(true);
    setShortcutMessage("");
    setNewShortcutSecret("");
    try {
      const response = await fetch("/api/shortcut-token", { method: "POST" });
      const result = await response.json();
      if (!response.ok) throw new Error([result.error, result.detail].filter(Boolean).join(" — "));
      setShortcutToken(result.token);
      setNewShortcutSecret(result.secret);
      setShortcutMessage("New token created. Copy it now; it will not be shown again.");
    } catch (err) {
      setShortcutMessage(err instanceof Error ? err.message : "Could not create token.");
    } finally {
      setShortcutBusy(false);
    }
  }

  async function revokeShortcutToken() {
    if (!window.confirm("Revoke the active iOS Shortcut token? Your Shortcut will stop working.")) return;
    setShortcutBusy(true);
    setShortcutMessage("");
    try {
      const response = await fetch("/api/shortcut-token", { method: "DELETE" });
      const result = await response.json();
      if (!response.ok) throw new Error([result.error, result.detail].filter(Boolean).join(" — "));
      setShortcutToken(null);
      setNewShortcutSecret("");
      setShortcutMessage("Shortcut token revoked.");
    } catch (err) {
      setShortcutMessage(err instanceof Error ? err.message : "Could not revoke token.");
    } finally {
      setShortcutBusy(false);
    }
  }

  async function copyShortcutToken() {
    if (!newShortcutSecret) return;
    try {
      await navigator.clipboard.writeText(newShortcutSecret);
      setShortcutMessage("Token copied. Paste it into your iOS Shortcut's Authorization header.");
    } catch {
      setShortcutMessage("Clipboard access failed. Select and copy the token manually.");
    }
  }

  async function signOut() {
    setSigningOut(true);
    setError("");
    try {
      const supabase = createClient();
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) throw signOutError;
      window.location.href = "/login";
    } catch {
      setError("Could not sign out. Please try again.");
      setSigningOut(false);
    }
  }

  return <div className="app-shell"><Sidebar /><div className="main-area">
    <header className="topbar"><div><h1 className="page-title">Settings</h1><p className="page-subtitle">Manage your profile and account preferences.</p></div></header>
    <main className="main-content settings-content">
      {error && <p className="notice-error" role="alert">{error}</p>}{success && <p className="notice-success" role="status">{success}</p>}
      <section className="card settings-card"><div className="settings-section-heading"><div className="settings-icon"><UserRound size={20} /></div><div><h2 className="card-title">Personal profile</h2><p className="card-description">These details are only used inside your FinTrack account.</p></div></div>
        {loading ? <p className="card-description">Loading profile…</p> : <form onSubmit={saveProfile} className="settings-form">
          <label className="form-field"><span className="field-label">Display name</span><input className="form-input" value={profile.display_name} onChange={(e) => setProfile({ ...profile, display_name: e.target.value })} maxLength={60} placeholder="Your name" required /></label>
          <label className="form-field"><span className="field-label">Email address</span><input className="form-input input-readonly" type="email" value={email} readOnly disabled /><small className="helper-text">Email is managed by your sign-in provider.</small></label>
          <label className="form-field"><span className="field-label">Preferred currency</span><select className="form-input" value={profile.currency} onChange={(e) => setProfile({ ...profile, currency: e.target.value })}>{currencies.map((currency) => <option key={currency.code} value={currency.code}>{currency.label}</option>)}</select><small className="helper-text">This preference is saved to your profile. Existing transaction amounts are not converted.</small></label>
          <div className="settings-actions"><button className="primary-button" type="submit" disabled={saving}><Save size={16} />{saving ? "Saving…" : "Save changes"}</button></div>
        </form>}
      </section>

      <section className="card settings-card">
        <div className="settings-section-heading">
          <div className="settings-icon"><KeyRound size={20} /></div>
          <div><h2 className="card-title">iOS Shortcuts</h2><p className="card-description">Connect an Apple Shortcut to add transactions securely to this FinTrack account.</p></div>
        </div>
        <div className="shortcut-connection">
          {shortcutToken ? <>
            <div className="settings-security-row"><div><strong>Connection active</strong><p>Token {shortcutToken.token_prefix}••••••••</p><p>Created {new Date(shortcutToken.created_at).toLocaleDateString()}</p><p>{shortcutToken.last_used_at ? `Last used ${new Date(shortcutToken.last_used_at).toLocaleString()}` : "Not used yet"}</p></div><span className="security-status">Active</span></div>
          </> : <p className="card-description">No active Shortcut connection.</p>}
          {newShortcutSecret && <div className="shortcut-secret-box"><strong>Your new API token</strong><p>Copy this now. For security, FinTrack stores only its hash and cannot show it again.</p><textarea className="form-input shortcut-token-value" value={newShortcutSecret} readOnly rows={3} /><button type="button" className="secondary-button" onClick={() => void copyShortcutToken()}><Copy size={16} />Copy token</button></div>}
          <div className="settings-actions">
            <button type="button" className="primary-button" onClick={() => void createShortcutToken()} disabled={shortcutBusy}><KeyRound size={16} />{shortcutBusy ? "Working…" : shortcutToken ? "Regenerate token" : "Generate API token"}</button>
            {shortcutToken && <button type="button" className="secondary-button" onClick={() => void revokeShortcutToken()} disabled={shortcutBusy}>Revoke token</button>}
          </div>
          {shortcutMessage && <p className="helper-text" role="status">{shortcutMessage}</p>}
          <div className="shortcut-instructions">
            <strong>Shortcut request details</strong>
            <p>Method: POST</p>
            <p>URL: <code>{typeof window !== "undefined" ? window.location.origin : ""}/api/shortcuts/transactions</code></p>
            <p>Header: <code>Authorization: Bearer YOUR_TOKEN</code></p>
            <p>Body: JSON with amount, type, description, account, category and date. Payment method is optional.</p>
          </div>
        </div>
      </section>

      <section className="card settings-card"><div className="settings-section-heading"><div className="settings-icon green-icon"><ShieldCheck size={20} /></div><div><h2 className="card-title">Account & security</h2><p className="card-description">Your account is protected by Supabase authentication and database access rules.</p></div></div><div className="settings-security-row"><div><strong>Signed-in account</strong><p>{email || "Your authenticated account"}</p></div><span className="security-status">Authenticated</span></div><div className="settings-actions"><button type="button" className="secondary-button signout-button" onClick={() => void signOut()} disabled={signingOut}><LogOut size={16} />{signingOut ? "Signing out…" : "Sign out"}</button></div></section>
    </main>
  </div></div>;
}
