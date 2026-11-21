
"use client";

import { useEffect, useState, type FormEvent } from "react";
import { X } from "lucide-react";

type TransactionType = "expense" | "income" | "transfer";

type Account = {
  id: string;
  name: string;
  account_type: string;
  opening_balance: number;
};

type Category = {
  id: string;
  name: string;
  type: "income" | "expense";
};

type SavedTransaction = {
  id: string;
  description: string;
  amount: number;
  type: "income" | "expense" | "transfer";
  account_id: string;
  category_id: string | null;
  transfer_account_id: string | null;
  transaction_date: string;
  notes: string | null;
};

type AddTransactionModalProps = {
  onClose: () => void;
  onSave: (transaction: SavedTransaction) => void;
  currency?: string;
};

function getLocalDate() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function AddTransactionModal({
  onClose,
  onSave,
  currency = "INR",
}: AddTransactionModalProps) {
  const [type, setType] = useState<TransactionType>("expense");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [accountId, setAccountId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [transferAccountId, setTransferAccountId] = useState("");
  const [date, setDate] = useState(getLocalDate);
  const [notes, setNotes] = useState("");

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadOptions() {
      try {
        const [accountResponse, categoryResponse] = await Promise.all([
          fetch("/api/accounts"),
          fetch("/api/categories"),
        ]);

        const accountResult = await accountResponse.json();
        const categoryResult = await categoryResponse.json();

        if (!accountResponse.ok) {
          throw new Error(accountResult.error || "Could not load accounts.");
        }

        if (!categoryResponse.ok) {
          throw new Error(categoryResult.error || "Could not load categories.");
        }

        if (!cancelled) {
          const loadedAccounts = accountResult.accounts ?? [];
          setAccounts(loadedAccounts);
          setCategories(categoryResult.categories ?? []);

          if (loadedAccounts.length > 0) {
            setAccountId(loadedAccounts[0].id);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Could not load form data."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadOptions();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredCategories = categories.filter(
    (category) => category.type === type
  );

  const destinationAccounts = accounts.filter(
    (account) => account.id !== accountId
  );

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    const numericAmount = Number(amount);

    if (!description.trim() || description.trim().length > 200) {
      setError("Enter a description (maximum 200 characters).");
      return;
    }

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError("Enter a valid positive amount.");
      return;
    }

    if (!accountId) {
      setError("Please create or select an account first.");
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
          category_id: type === "transfer" ? null : categoryId || null,
          transfer_account_id:
            type === "transfer" ? transferAccountId : null,
          transaction_date: new Date(`${date}T12:00:00`).toISOString(),
          notes: notes.trim() || null,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Could not save transaction.");
      }

      onSave(result.transaction);
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "form-input w-full";

  const labelClass = "field-label";

  return (
    <div
      className="modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
    >
      <section
        className="card transaction-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="transaction-modal-title"
      >
        <div className="card-header">
          <div>
            <h2 className="card-title" id="transaction-modal-title">
              Add Transaction
            </h2>
            <p className="card-description">
              Record your financial activity
            </p>
          </div>

          <button
            type="button"
            className="secondary-button"
            onClick={onClose}
            disabled={saving}
            aria-label="Close modal"
          >
            <X size={17} />
          </button>
        </div>

        {loading ? (
          <p className="py-8 text-center text-sm text-slate-500">
            Loading accounts and categories...
          </p>
        ) : (
          <form onSubmit={handleSubmit}>
            <label className={labelClass} htmlFor="transaction-type">
              Transaction Type
            </label>

            <select
              id="transaction-type"
              className={inputClass}
              value={type}
              onChange={(e) => {
                setType(e.target.value as TransactionType);
                setCategoryId("");
                setTransferAccountId("");
              }}
            >
              <option value="expense">Expense</option>
              <option value="income">Income</option>
              <option value="transfer">Transfer</option>
            </select>

            <label className={labelClass} htmlFor="transaction-description">
              Description
            </label>

            <input
              id="transaction-description"
              className={inputClass}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Lunch, Salary, Bank transfer"
              maxLength={200}
              required
            />

            <label className={labelClass} htmlFor="transaction-amount">
              Amount ({currency})
            </label>

            <input
              id="transaction-amount"
              className={inputClass}
              type="number"
              min="0.01"
              max="999999999999"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              required
            />

            <label className={labelClass} htmlFor="transaction-account">
              {type === "transfer" ? "From Account" : "Account"}
            </label>

            <select
              id="transaction-account"
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

            {type === "transfer" ? (
              <>
                <label className={labelClass} htmlFor="transfer-account">
                  To Account
                </label>

                <select
                  id="transfer-account"
                  className={inputClass}
                  value={transferAccountId}
                  onChange={(e) => setTransferAccountId(e.target.value)}
                  required
                >
                  <option value="">Select destination account</option>
                  {destinationAccounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name}
                    </option>
                  ))}
                </select>

                <p className="mt-2 text-xs text-slate-500">
                  Transfers won&apos;t be counted as income or expenses.
                </p>
              </>
            ) : (
              <>
                <label className={labelClass} htmlFor="transaction-category">
                  Category
                </label>

                <select
                  id="transaction-category"
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
              </>
            )}

            <label className={labelClass} htmlFor="transaction-date">
              Transaction Date
            </label>

            <input
              id="transaction-date"
              className={inputClass}
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />

            <label className={labelClass} htmlFor="transaction-notes">
              Notes (Optional)
            </label>

            <textarea
              id="transaction-notes"
              className={inputClass}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any additional details..."
              rows={2}
              maxLength={1000}
            />

            {accounts.length === 0 && (
              <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-700">
                You need to create an account before adding a transaction.
              </p>
            )}

            {error && (
              <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
                {error}
              </p>
            )}

            <button
              type="submit"
              className="primary-button"
              style={{ width: "100%", marginTop: 20 }}
              disabled={saving || accounts.length === 0}
            >
              {saving ? "Saving..." : "Save Transaction"}
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
