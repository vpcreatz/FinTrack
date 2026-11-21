"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

type TransactionType = "expense" | "income" | "transfer";

type Account = {
  id: string;
  name: string;
  account_type: string;
};

type Category = {
  id: string;
  name: string;
  type: "income" | "expense";
};

type Props = {
  accounts: Account[];
  categories: Category[];
};

function getLocalDate() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export default function QuickAddForm({
  accounts,
  categories,
}: Props) {
  const router = useRouter();

  const [type, setType] = useState<TransactionType>("expense");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [categoryId, setCategoryId] = useState("");
  const [transferAccountId, setTransferAccountId] = useState("");
  const [date, setDate] = useState(getLocalDate);
  const [notes, setNotes] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const filteredCategories = categories.filter(
    (category) => category.type === type
  );

  const destinationAccounts = accounts.filter(
    (account) => account.id !== accountId
  );

  function changeType(nextType: TransactionType) {
    setType(nextType);
    setCategoryId("");
    setTransferAccountId("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setSuccess(false);

    const numericAmount = Number(amount);

    if (!description.trim()) {
      setError("Please enter a description.");
      return;
    }

    if (
      !Number.isFinite(numericAmount) ||
      numericAmount <= 0
    ) {
      setError("Please enter a valid amount.");
      return;
    }

    if (!accountId) {
      setError("Please select an account.");
      return;
    }

    if (type === "transfer" && !transferAccountId) {
      setError("Please select a destination account.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch("/api/transactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          description: description.trim(),
          amount: numericAmount,
          type,
          account_id: accountId,
          category_id:
            type === "transfer" ? null : categoryId || null,
          transfer_account_id:
            type === "transfer" ? transferAccountId : null,
          transaction_date: new Date(
            `${date}T12:00:00`
          ).toISOString(),
          notes: notes.trim() || null,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "Could not save transaction."
        );
      }

      setSuccess(true);

      setAmount("");
      setDescription("");
      setCategoryId("");
      setTransferAccountId("");
      setNotes("");
      setDate(getLocalDate());

      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong."
      );
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "w-full rounded-xl border border-slate-200 bg-white p-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

  const labelClass =
    "mb-2 block text-sm font-semibold text-slate-700";

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-lg">

        <header className="mb-7">
          <p className="text-sm font-semibold text-blue-600">
            FINTRACK
          </p>

          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            Quick Add
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Record your financial activity.
          </p>
        </header>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">

          <form onSubmit={handleSubmit} className="space-y-5">

            <div>
              <label className={labelClass}>
                Transaction type
              </label>

              <div className="grid grid-cols-3 gap-2">
                {(["expense", "income", "transfer"] as const).map(
                  (item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => changeType(item)}
                      className={`rounded-xl border px-2 py-3 text-sm font-semibold capitalize ${
                        type === item
                          ? "border-blue-600 bg-blue-600 text-white"
                          : "border-slate-200 bg-white text-slate-600"
                      }`}
                    >
                      {item}
                    </button>
                  )
                )}
              </div>
            </div>

            <div>
              <label className={labelClass} htmlFor="amount">
                Amount (₹)
              </label>

              <input
                id="amount"
                className={inputClass}
                type="number"
                min="0.01"
                step="0.01"
                max="999999999999"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>

            <div>
              <label className={labelClass} htmlFor="description">
                Description
              </label>

              <input
                id="description"
                className={inputClass}
                type="text"
                maxLength={200}
                placeholder="e.g. Lunch, Salary..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>

            <div>
              <label className={labelClass} htmlFor="account">
                {type === "transfer" ? "From account" : "Account"}
              </label>

              <select
                id="account"
                className={inputClass}
                value={accountId}
                onChange={(e) => {
                  setAccountId(e.target.value);
                  setTransferAccountId("");
                }}
                required
              >
                <option value="">Select account</option>

                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
            </div>

            {type === "transfer" ? (
              <div>
                <label
                  className={labelClass}
                  htmlFor="destination"
                >
                  To account
                </label>

                <select
                  id="destination"
                  className={inputClass}
                  value={transferAccountId}
                  onChange={(e) =>
                    setTransferAccountId(e.target.value)
                  }
                  required
                >
                  <option value="">
                    Select destination account
                  </option>

                  {destinationAccounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label
                  className={labelClass}
                  htmlFor="category"
                >
                  Category
                </label>

                <select
                  id="category"
                  className={inputClass}
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                >
                  <option value="">Uncategorised</option>

                  {filteredCategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className={labelClass} htmlFor="date">
                Transaction date
              </label>

              <input
                id="date"
                className={inputClass}
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>

            <div>
              <label className={labelClass} htmlFor="notes">
                Notes (optional)
              </label>

              <textarea
                id="notes"
                className={inputClass}
                rows={3}
                maxLength={1000}
                placeholder="Additional details..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            {accounts.length === 0 && (
              <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-700">
                Create an account in FinTrack before adding a transaction.
              </p>
            )}

            {error && (
              <p
                role="alert"
                className="rounded-xl bg-red-50 p-3 text-sm text-red-600"
              >
                {error}
              </p>
            )}

            {success && (
              <p
                role="status"
                className="rounded-xl bg-green-50 p-3 text-sm text-green-700"
              >
                Transaction saved successfully!
              </p>
            )}

            <button
              type="submit"
              disabled={saving || accounts.length === 0}
              className="w-full rounded-xl bg-blue-600 px-4 py-4 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Transaction"}
            </button>

          </form>
        </section>

        <p className="mt-5 text-center text-xs text-slate-400">
          FinTrack · Your finances, simplified.
        </p>

      </div>
    </main>
  );
}