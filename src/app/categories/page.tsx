
"use client";

import { useEffect, useState, type FormEvent } from "react";
import Sidebar from "@/components/layout/Sidebar";

type Category = {
  id: string;
  name: string;
  type: "income" | "expense";
  created_at?: string;
};

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [type, setType] = useState<"income" | "expense">("expense");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadCategories() {
      try {
        const response = await fetch("/api/categories");
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Could not load categories.");
        }

        if (!cancelled) {
          setCategories(result.categories ?? []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Something went wrong."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadCategories();

    return () => {
      cancelled = true;
    };
  }, []);

  async function addCategory(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSuccess("");

    const cleanName = name.trim();

    if (!cleanName) {
      setError("Please enter a category name.");
      return;
    }

    if (
      categories.some(
        (category) =>
          category.name.toLowerCase() === cleanName.toLowerCase() &&
          category.type === type
      )
    ) {
      setError("This category already exists.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: cleanName, type }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Could not create category.");
      }

      setCategories((current) => [...current, result.category]);
      setName("");
      setSuccess("Category added successfully.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setSaving(false);
    }
  }

  const incomeCategories = categories.filter(
    (category) => category.type === "income"
  );

  const expenseCategories = categories.filter(
    (category) => category.type === "expense"
  );

  return (
    <div className="min-h-screen bg-slate-50 md:flex">
      <Sidebar />

      <main className="main-area min-w-0 flex-1">
        <header className="flex min-h-16 items-center justify-between border-b border-slate-200 bg-white px-6">
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              Categories
            </h1>
            <p className="text-xs text-slate-500">
              Manage how you organise your finances
            </p>
          </div>

          <span className="hidden rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 sm:inline-flex">
            {categories.length} categories
          </span>
        </header>

        <div className="mx-auto max-w-7xl space-y-6 p-5 md:p-6">
          <section className="grid gap-5 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">
                  Expense categories
                </p>
                <span className="rounded-lg bg-red-50 p-2 text-red-600">
                  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.8">
                    <path d="M12 5v14m-7-7h14" strokeLinecap="round" />
                  </svg>
                </span>
              </div>
              <p className="mt-3 text-3xl font-bold tabular-nums text-slate-900">
                {expenseCategories.length}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Categories used to track spending
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">
                  Income categories
                </p>
                <span className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
                  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.8">
                    <path d="M12 19V5m-7 7 7-7 7 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </div>
              <p className="mt-3 text-3xl font-bold tabular-nums text-slate-900">
                {incomeCategories.length}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Categories used to track earnings
              </p>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5">
              <h2 className="text-base font-semibold text-slate-900">
                Add new category
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Create a category to organise your transactions.
              </p>
            </div>

            <form
              onSubmit={addCategory}
              className="grid gap-4 md:grid-cols-[1fr_220px_auto] md:items-end"
            >
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Category name
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Food & Dining"
                  maxLength={40}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Category type
                </label>
                <select
                  value={type}
                  onChange={(e) =>
                    setType(e.target.value as "income" | "expense")
                  }
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="text-lg leading-none">+</span>
                {saving ? "Adding..." : "Add category"}
              </button>
            </form>

            {error && (
              <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                {error}
              </p>
            )}

            {success && (
              <p role="status" className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                {success}
              </p>
            )}
          </section>

          <section className="grid gap-5 lg:grid-cols-2">
            <CategoryList
              title="Expense categories"
              subtitle="Your spending categories"
              categories={expenseCategories}
              color="red"
              loading={loading}
            />

            <CategoryList
              title="Income categories"
              subtitle="Your earning categories"
              categories={incomeCategories}
              color="emerald"
              loading={loading}
            />
          </section>
        </div>
      </main>
    </div>
  );
}

function CategoryList({
  title,
  subtitle,
  categories,
  color,
  loading,
}: {
  title: string;
  subtitle: string;
  categories: Category[];
  color: "red" | "emerald";
  loading: boolean;
}) {
  const isExpense = color === "red";

  return (
    <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            {title}
          </h2>
          <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
        </div>

        <span
          className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
            isExpense
              ? "bg-red-50 text-red-600"
              : "bg-emerald-50 text-emerald-600"
          }`}
        >
          {categories.length}
        </span>
      </div>

      {loading ? (
        <p className="py-8 text-center text-sm text-slate-400">
          Loading categories...
        </p>
      ) : categories.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-200 py-10 text-center">
          <p className="text-sm font-medium text-slate-600">
            No categories yet
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Add your first category using the form above.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {categories.map((category) => (
            <div
              key={category.id}
              className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span
                  className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                    isExpense ? "bg-red-500" : "bg-emerald-500"
                  }`}
                />
                <span className="truncate text-sm font-medium text-slate-700">
                  {category.name}
                </span>
              </div>

              <span className="shrink-0 text-xs text-slate-400">
                {isExpense ? "Expense" : "Income"}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
