
"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import { useCurrency } from "@/lib/useCurrency";

type Account = {
  id: string;
  name: string;
  account_type: string;
  opening_balance: number;
  current_balance: number;
};

export default function AccountsPage() {
  const { currency, formatMoney } = useCurrency();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [name, setName] = useState("");
  const [type, setType] = useState("cash");
  const [balance, setBalance] = useState("0");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  
useEffect(() => {
  let cancelled = false;

  async function fetchAccounts() {
    try {
      const response = await fetch("/api/accounts");
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Could not load accounts.");
      }

      if (!cancelled) {
        setAccounts(result.accounts ?? []);
      }
    } catch (err) {
      if (!cancelled) {
        setError(
          err instanceof Error ? err.message : "Could not load accounts."
        );
      }
    } finally {
      if (!cancelled) setLoading(false);
    }
  }

  fetchAccounts();

  return () => {
    cancelled = true;
  };
}, []);


  async function addAccount(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSaving(true);

    try {
      const response = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          account_type: type,
          opening_balance: Number(balance),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Could not create account.");
      }

      setName("");
      setBalance("0");
      
      const refreshResponse = await fetch("/api/accounts");
const refreshResult = await refreshResponse.json();

if (!refreshResponse.ok) {
  setError("Account created, but could not refresh the list.");
} else {
  setAccounts(refreshResult.accounts ?? []);
};
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="app-shell">
      <Sidebar />

      <main
        className="main-area main-content wide-page"
        style={{ padding: 28 }}
      >
        <h1 className="page-title">Accounts & Wallets</h1>
        <p className="page-subtitle">
          Manage your cash, bank accounts and wallets.
        </p>

        <section className="card" style={{ marginTop: 24 }}>
          <h2 className="card-title">Add an account</h2>

          <form onSubmit={addAccount}>
            <label className="field-label" htmlFor="account-name">
              Account name
            </label>
            <input
              id="account-name"
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Cash, Savings Account"
              required
            />

            <label className="field-label" htmlFor="account-type">
              Account type
            </label>
            <select
              id="account-type"
              className="form-input"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="cash">Cash</option>
              <option value="bank">Bank</option>
              <option value="wallet">UPI / Wallet</option>
              <option value="other">Other</option>
            </select>

            <label className="field-label" htmlFor="opening-balance">
              Opening balance ({currency})
            </label>
            <input
              id="opening-balance"
              className="form-input"
              type="number"
              step="0.01"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
            />

            {error && (
              <p style={{ color: "#DC2626", marginTop: 12 }}>
                {error}
              </p>
            )}

            <button
              className="primary-button"
              type="submit"
              disabled={saving}
              style={{ marginTop: 20 }}
            >
              {saving ? "Saving..." : "Create Account"}
            </button>
          </form>
        </section>

        <section className="card" style={{ marginTop: 24 }}>
          <h2 className="card-title">Your accounts</h2>

          {loading ? (
            <p>Loading accounts...</p>
          ) : accounts.length === 0 ? (
            <p className="card-description">
              No accounts yet. Create your first account above.
            </p>
          ) : (
            <div style={{ marginTop: 16 }}>
              {accounts.map((account) => (
                <div
                  key={account.id}
                  style={{
                    padding: "16px 0",
                    borderBottom: "1px solid #E2E8F0",
                  }}
                >
                  <strong>{account.name}</strong>
                  <p className="card-description">
                    {account.account_type} ·{" "}
                    {formatMoney(Number(account.current_balance))}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
