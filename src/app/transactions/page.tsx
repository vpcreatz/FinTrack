
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowLeftRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  Edit2,
  Filter,
  Plus,
  Search,
  Trash2,
  Wallet,
  X,
} from "lucide-react";

import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import AddTransactionModal from "@/components/transactions/AddTransactionModal";
import { useCurrency } from "@/lib/useCurrency";

type TransactionType = "income" | "expense" | "transfer";

type Transaction = {
  id: string;
  description: string;
  amount: number | string;
  type: TransactionType;
  account_id: string;
  category_id: string | null;
  transfer_account_id: string | null;
  transaction_date: string;
  notes: string | null;
  account_name: string;
  category_name: string;
  transfer_account_name: string | null;
};

type Account = {
  id: string;
  name: string;
};

type Category = {
  id: string;
  name: string;
  type: "income" | "expense";
};

type EditForm = {
  description: string;
  amount: string;
  type: TransactionType;
  account_id: string;
  category_id: string;
  transfer_account_id: string;
  transaction_date: string;
  notes: string;
};

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function getLocalDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getTypeLabel(type: TransactionType) {
  if (type === "income") return "Income";
  if (type === "expense") return "Expense";
  return "Transfer";
}

export default function TransactionsPage() {
  const { currency, formatMoney } = useCurrency();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadTransactions = useCallback(async () => {
    try {
      const [transactionResponse, accountResponse, categoryResponse] =
        await Promise.all([
          fetch("/api/transactions"),
          fetch("/api/accounts"),
          fetch("/api/categories"),
        ]);

      const [transactionResult, accountResult, categoryResult] =
        await Promise.all([
          transactionResponse.json(),
          accountResponse.json(),
          categoryResponse.json(),
        ]);

      if (!transactionResponse.ok) {
        throw new Error(
          transactionResult.error || "Could not load transactions."
        );
      }

      if (!accountResponse.ok) {
        throw new Error(accountResult.error || "Could not load accounts.");
      }

      if (!categoryResponse.ok) {
        throw new Error(categoryResult.error || "Could not load categories.");
      }

      setTransactions(transactionResult.transactions ?? []);
      setAccounts(
        (accountResult.accounts ?? []).map(
          (account: { id: string; name: string }) => ({
            id: account.id,
            name: account.name,
          })
        )
      );
      setCategories(categoryResult.categories ?? []);
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : "Something went wrong while loading your data."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  
useEffect(() => {
  let cancelled = false;

  async function loadInitialData() {
    try {
      const [transactionResponse, accountResponse, categoryResponse] =
        await Promise.all([
          fetch("/api/transactions"),
          fetch("/api/accounts"),
          fetch("/api/categories"),
        ]);

      const [transactionResult, accountResult, categoryResult] =
        await Promise.all([
          transactionResponse.json(),
          accountResponse.json(),
          categoryResponse.json(),
        ]);

      if (!transactionResponse.ok) {
        throw new Error(
          transactionResult.error || "Could not load transactions."
        );
      }

      if (!accountResponse.ok) {
        throw new Error(accountResult.error || "Could not load accounts.");
      }

      if (!categoryResponse.ok) {
        throw new Error(categoryResult.error || "Could not load categories.");
      }

      if (cancelled) return;

      setTransactions(transactionResult.transactions ?? []);

      setAccounts(
        (accountResult.accounts ?? []).map(
          (account: { id: string; name: string }) => ({
            id: account.id,
            name: account.name,
          })
        )
      );

      setCategories(categoryResult.categories ?? []);
    } catch (error) {
      if (!cancelled) {
        setLoadError(
          error instanceof Error
            ? error.message
            : "Could not load your data."
        );
      }
    } finally {
      if (!cancelled) {
        setLoading(false);
      }
    }
  }

  void loadInitialData();

  return () => {
    cancelled = true;
  };
}, []);


const filteredTransactions = useMemo(() => {
  const query = search.trim().toLowerCase();

  return transactions.filter((transaction) => {
    const matchesSearch =
      !query ||
      [
        transaction.description,
        transaction.category_name,
        transaction.account_name,
        transaction.transfer_account_name ?? "",
        transaction.notes ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(query);

    const matchesType =
      typeFilter === "all" || transaction.type === typeFilter;

    const matchesCategory =
      categoryFilter === "all" ||
      transaction.category_id === categoryFilter;

    const date = getLocalDate(transaction.transaction_date);
    const matchesFrom = !fromDate || date >= fromDate;
    const matchesTo = !toDate || date <= toDate;

    return (
      matchesSearch &&
      matchesType &&
      matchesCategory &&
      matchesFrom &&
      matchesTo
    );
  });
}, [transactions, search, typeFilter, categoryFilter, fromDate, toDate]);

  const totals = useMemo(() => {
    return transactions.reduce(
      (result, transaction) => {
        const amount = Number(transaction.amount) || 0;

        if (transaction.type === "income") result.income += amount;
        if (transaction.type === "expense") result.expense += amount;
        if (transaction.type === "transfer") result.transfers += amount;

        return result;
      },
      { income: 0, expense: 0, transfers: 0 }
    );
  }, [transactions]);

  function openEdit(transaction: Transaction) {
    setEditing(transaction);
    setEditForm({
      description: transaction.description,
      amount: String(transaction.amount),
      type: transaction.type,
      account_id: transaction.account_id,
      category_id: transaction.category_id ?? "",
      transfer_account_id: transaction.transfer_account_id ?? "",
      transaction_date: getLocalDate(transaction.transaction_date),
      notes: transaction.notes ?? "",
    });
    setActionError("");
  }

  function closeEdit() {
    if (saving) return;
    setEditing(null);
    setEditForm(null);
  }

  async function handleEditSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editing || !editForm) return;

    const amount = Number(editForm.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      setActionError("Enter a valid positive amount.");
      return;
    }

    if (!editForm.account_id) {
      setActionError("Please select an account.");
      return;
    }

    if (
      editForm.type === "transfer" &&
      (!editForm.transfer_account_id ||
        editForm.transfer_account_id === editForm.account_id)
    ) {
      setActionError("Choose a different destination account.");
      return;
    }

    setSaving(true);
    setActionError("");

    try {
      const response = await fetch("/api/transactions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editing.id,
          description: editForm.description.trim(),
          amount,
          type: editForm.type,
          account_id: editForm.account_id,
          category_id:
            editForm.type === "transfer" ? null : editForm.category_id || null,
          transfer_account_id:
            editForm.type === "transfer"
              ? editForm.transfer_account_id
              : null,
          transaction_date: new Date(
            `${editForm.transaction_date}T12:00:00`
          ).toISOString(),
          notes: editForm.notes.trim() || null,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Could not update transaction.");
      }

      setEditing(null);
      setEditForm(null);
      await loadTransactions();
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Could not update transaction."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(transaction: Transaction) {
    const confirmed = window.confirm(
      `Delete "${transaction.description}"? This cannot be undone.`
    );

    if (!confirmed) return;

    setDeletingId(transaction.id);
    setActionError("");

    try {
      const response = await fetch("/api/transactions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: transaction.id }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Could not delete transaction.");
      }

      setTransactions((current) =>
        current.filter((item) => item.id !== transaction.id)
      );
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Could not delete transaction."
      );
    } finally {
      setDeletingId(null);
    }
  }

  const visibleCategories =
    editForm?.type === "income" || editForm?.type === "expense"
      ? categories.filter((category) => category.type === editForm.type)
      : [];

  const clearFilters = () => {
    setSearch("");
    setTypeFilter("all");
    setCategoryFilter("all");
    setFromDate("");
    setToDate("");
  };

  return (
    <div className="app-shell">
      <Sidebar />

      <div className="main-area">
        <Header
          search={search}
          setSearch={setSearch}
          onAddTransaction={() => setShowAddModal(true)}
          hideHeading
        />

        <main className="main-content">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="page-title">Transactions</h1>
              <p className="page-subtitle">
                View and manage all your financial activity.
              </p>
            </div>

            <button
              type="button"
              className="primary-button"
              onClick={() => setShowAddModal(true)}
            >
              <Plus size={17} />
              Add Transaction
            </button>
          </div>

          {loadError && (
            <div
              role="alert"
              className="mb-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
            >
              {loadError}
              <button
                type="button"
                onClick={() => void loadTransactions()}
                className="ml-3 font-semibold underline"
              >
                Retry
              </button>
            </div>
          )}

          {actionError && !editing && (
            <div
              role="alert"
              className="mb-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
            >
              {actionError}
              <button
                type="button"
                onClick={() => setActionError("")}
                className="ml-3 underline"
              >
                Dismiss
              </button>
            </div>
          )}

          <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <section className="card">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="card-description">Total income</p>
                  <p className="mt-2 text-xl font-bold text-emerald-600 tabular">
                    {formatMoney(totals.income)}
                  </p>
                </div>
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-50 text-emerald-600">
                  <ArrowDownRight size={20} />
                </div>
              </div>
            </section>

            <section className="card">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="card-description">Total expenses</p>
                  <p className="mt-2 text-xl font-bold text-red-500 tabular">
                    {formatMoney(totals.expense)}
                  </p>
                </div>
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-red-50 text-red-500">
                  <ArrowUpRight size={20} />
                </div>
              </div>
            </section>

            <section className="card">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="card-description">Total transfers</p>
                  <p className="mt-2 text-xl font-bold text-blue-600 tabular">
                    {formatMoney(totals.transfers)}
                  </p>
                </div>
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-blue-50 text-blue-600">
                  <ArrowLeftRight size={20} />
                </div>
              </div>
            </section>
          </div>

          <section className="card mb-5">
            <div className="mb-4 flex items-center gap-2">
              <Filter size={17} className="text-slate-500" />
              <h2 className="card-title">Filter transactions</h2>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <label className="min-w-0">
                <span className="field-label mt-0">Type</span>
                <select
                  className="form-input"
                  value={typeFilter}
                  onChange={(event) => setTypeFilter(event.target.value)}
                >
                  <option value="all">All types</option>
                  <option value="income">Income</option>
                  <option value="expense">Expense</option>
                  <option value="transfer">Transfer</option>
                </select>
              </label>

              <label className="min-w-0">
                <span className="field-label mt-0">Category</span>
                <select
                  className="form-input"
                  value={categoryFilter}
                  onChange={(event) => setCategoryFilter(event.target.value)}
                >
                  <option value="all">All categories</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="min-w-0">
                <span className="field-label mt-0">From date</span>
                <span className="relative block">
                  <CalendarDays
                    size={15}
                    className="pointer-events-none absolute right-3 top-3 text-slate-400"
                  />
                  <input
                    className="form-input"
                    type="date"
                    value={fromDate}
                    onChange={(event) => setFromDate(event.target.value)}
                  />
                </span>
              </label>

              <label className="min-w-0">
                <span className="field-label mt-0">To date</span>
                <input
                  className="form-input"
                  type="date"
                  value={toDate}
                  min={fromDate || undefined}
                  onChange={(event) => setToDate(event.target.value)}
                />
              </label>

              <div className="flex items-end">
                <button
                  type="button"
                  className="secondary-button w-full"
                  onClick={clearFilters}
                >
                  <X size={15} />
                  Clear filters
                </button>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
              <p className="text-xs text-slate-500">
                Showing {filteredTransactions.length} of {transactions.length}{" "}
                transactions
              </p>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Search size={14} />
                Search using the top search bar
              </div>
            </div>
          </section>

          <section className="card transactions-card">
            <div className="card-header">
              <div>
                <h2 className="card-title">All transactions</h2>
                <p className="card-description">
                  Your latest financial activity
                </p>
              </div>
            </div>

            {loading ? (
              <div className="py-12 text-center text-sm text-slate-500">
                Loading your transactions...
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="py-12 text-center">
                <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-slate-100 text-slate-500">
                  <Wallet size={21} />
                </div>
                <p className="font-semibold text-slate-800">
                  {transactions.length === 0
                    ? "No transactions yet"
                    : "No matching transactions"}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {transactions.length === 0
                    ? "Add your first transaction to get started."
                    : "Try changing your search or filters."}
                </p>
                {transactions.length === 0 && (
                  <button
                    type="button"
                    className="primary-button mt-4"
                    onClick={() => setShowAddModal(true)}
                  >
                    <Plus size={16} />
                    Add Transaction
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="transaction-table w-full">
                  <thead>
                    <tr>
                      <th>TRANSACTION</th>
                      <th>CATEGORY</th>
                      <th>ACCOUNT</th>
                      <th>DATE</th>
                      <th>TYPE</th>
                      <th style={{ textAlign: "right" }}>AMOUNT</th>
                      <th style={{ textAlign: "right" }}>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTransactions.map((transaction) => {
                      const isIncome = transaction.type === "income";
                      const isTransfer = transaction.type === "transfer";

                      return (
                        <tr key={transaction.id}>
                          <td>
                            <div className="merchant-cell">
                              <div
                                className="merchant-icon"
                                style={{
                                  background: isIncome
                                    ? "#ECFDF5"
                                    : isTransfer
                                      ? "#EFF6FF"
                                      : "#FEF2F2",
                                  color: isIncome
                                    ? "#059669"
                                    : isTransfer
                                      ? "#2563EB"
                                      : "#DC2626",
                                }}
                              >
                                {isIncome ? (
                                  <ArrowDownRight size={17} />
                                ) : isTransfer ? (
                                  <ArrowLeftRight size={17} />
                                ) : (
                                  <ArrowUpRight size={17} />
                                )}
                              </div>
                              <div className="min-w-0">
                                <strong className="block max-w-48 truncate">
                                  {transaction.description}
                                </strong>
                                {isTransfer && (
                                  <span className="block text-xs text-slate-500">
                                    To: {transaction.transfer_account_name ?? "Unknown account"}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          <td>
                            <span className="category-badge">
                              {isTransfer
                                ? "Transfer"
                                : transaction.category_name || "Uncategorised"}
                            </span>
                          </td>

                          <td>{transaction.account_name}</td>
                          <td className="whitespace-nowrap">
                            {formatDate(transaction.transaction_date)}
                          </td>
                          <td>
                            <span
                              className={`text-xs font-medium ${
                                isIncome
                                  ? "text-emerald-600"
                                  : isTransfer
                                    ? "text-blue-600"
                                    : "text-red-500"
                              }`}
                            >
                              {getTypeLabel(transaction.type)}
                            </span>
                          </td>

                          <td
                            className={`amount-cell ${
                              isIncome ? "income" : ""
                            }`}
                          >
                            <span
                              className={
                                isTransfer ? "text-blue-600" : undefined
                              }
                            >
                              {isIncome ? "+" : isTransfer ? "" : "−"}
                              {formatMoney(Number(transaction.amount))}
                            </span>
                          </td>

                          <td>
                            <div className="flex justify-end gap-1">
                              <button
                                type="button"
                                className="secondary-button !h-9 !w-9 !p-0"
                                title="Edit transaction"
                                aria-label={`Edit ${transaction.description}`}
                                onClick={() => openEdit(transaction)}
                              >
                                <Edit2 size={15} />
                              </button>
                              <button
                                type="button"
                                className="secondary-button !h-9 !w-9 !p-0 !text-red-600"
                                title="Delete transaction"
                                aria-label={`Delete ${transaction.description}`}
                                disabled={deletingId === transaction.id}
                                onClick={() => void handleDelete(transaction)}
                              >
                                {deletingId === transaction.id ? (
                                  <span className="text-xs">...</span>
                                ) : (
                                  <Trash2 size={15} />
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </main>
      </div>

      {showAddModal && (
        <AddTransactionModal
          currency={currency}
          onClose={() => setShowAddModal(false)}
          onSave={() => {
            void loadTransactions();
          }}
        />
      )}

      {editing && editForm && (
        <div className="modal-overlay">
          <section
            className="card transaction-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-transaction-title"
          >
            <div className="card-header">
              <div>
                <h2 className="card-title" id="edit-transaction-title">
                  Edit transaction
                </h2>
                <p className="card-description">
                  Update the details of this transaction.
                </p>
              </div>
              <button
                type="button"
                className="secondary-button"
                onClick={closeEdit}
                disabled={saving}
                aria-label="Close edit form"
              >
                <X size={17} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit}>
              <label className="field-label" htmlFor="edit-type">
                Transaction type
              </label>
              <select
                id="edit-type"
                className="form-input"
                value={editForm.type}
                onChange={(event) =>
                  setEditForm({
                    ...editForm,
                    type: event.target.value as TransactionType,
                    category_id: "",
                    transfer_account_id: "",
                  })
                }
              >
                <option value="expense">Expense</option>
                <option value="income">Income</option>
                <option value="transfer">Transfer</option>
              </select>

              <label className="field-label" htmlFor="edit-description">
                Description
              </label>
              <input
                id="edit-description"
                className="form-input"
                value={editForm.description}
                onChange={(event) =>
                  setEditForm({ ...editForm, description: event.target.value })
                }
                maxLength={200}
                required
              />

              <label className="field-label" htmlFor="edit-amount">
                Amount ({currency})
              </label>
              <input
                id="edit-amount"
                className="form-input"
                type="number"
                min="0.01"
                max="999999999999"
                step="0.01"
                value={editForm.amount}
                onChange={(event) =>
                  setEditForm({ ...editForm, amount: event.target.value })
                }
                required
              />

              <label className="field-label" htmlFor="edit-account">
                {editForm.type === "transfer" ? "From account" : "Account"}
              </label>
              <select
                id="edit-account"
                className="form-input"
                value={editForm.account_id}
                onChange={(event) =>
                  setEditForm({
                    ...editForm,
                    account_id: event.target.value,
                    transfer_account_id: "",
                  })
                }
                required
              >
                <option value="">Select account</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>

              {editForm.type === "transfer" ? (
                <>
                  <label className="field-label" htmlFor="edit-destination">
                    To account
                  </label>
                  <select
                    id="edit-destination"
                    className="form-input"
                    value={editForm.transfer_account_id}
                    onChange={(event) =>
                      setEditForm({
                        ...editForm,
                        transfer_account_id: event.target.value,
                      })
                    }
                    required
                  >
                    <option value="">Select destination account</option>
                    {accounts
                      .filter((account) => account.id !== editForm.account_id)
                      .map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.name}
                        </option>
                      ))}
                  </select>
                </>
              ) : (
                <>
                  <label className="field-label" htmlFor="edit-category">
                    Category
                  </label>
                  <select
                    id="edit-category"
                    className="form-input"
                    value={editForm.category_id}
                    onChange={(event) =>
                      setEditForm({
                        ...editForm,
                        category_id: event.target.value,
                      })
                    }
                  >
                    <option value="">Uncategorised</option>
                    {visibleCategories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </>
              )}

              <label className="field-label" htmlFor="edit-date">
                Transaction date
              </label>
              <input
                id="edit-date"
                className="form-input"
                type="date"
                value={editForm.transaction_date}
                onChange={(event) =>
                  setEditForm({
                    ...editForm,
                    transaction_date: event.target.value,
                  })
                }
                required
              />

              <label className="field-label" htmlFor="edit-notes">
                Notes (optional)
              </label>
              <textarea
                id="edit-notes"
                className="form-input"
                rows={3}
                maxLength={1000}
                value={editForm.notes}
                onChange={(event) =>
                  setEditForm({ ...editForm, notes: event.target.value })
                }
              />

              {actionError && (
                <p
                  role="alert"
                  className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600"
                >
                  {actionError}
                </p>
              )}

              <div className="mt-5 flex gap-2">
                <button
                  type="button"
                  className="secondary-button flex-1"
                  onClick={closeEdit}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary-button flex-1"
                  disabled={saving}
                >
                  <Check size={16} />
                  {saving ? "Saving..." : "Save changes"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
