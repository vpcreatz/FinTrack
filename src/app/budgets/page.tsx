
"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import { useCurrency } from "@/lib/useCurrency";

type Category = {
  id: string;
  name: string;
  type: "income" | "expense";
};

type Budget = {
  id: string;
  category_id: string;
  category_name: string;
  amount: number;
  month: string;
  spent: number;
};

export default function BudgetsPage() {
  const { currency, formatMoney } = useCurrency();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [month, setMonth] = useState(
    new Date().toISOString().slice(0, 7)
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  
useEffect(() => {
  let cancelled = false;

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const [budgetResponse, categoryResponse, transactionResponse] =
        await Promise.all([
          fetch("/api/budgets"),
          fetch("/api/categories"),
          fetch("/api/transactions"),
        ]);

      const [budgetData, categoryData, transactionData] =
        await Promise.all([
          budgetResponse.json(),
          categoryResponse.json(),
          transactionResponse.json(),
        ]);

      if (
        !budgetResponse.ok ||
        !categoryResponse.ok ||
        !transactionResponse.ok
      ) {
        throw new Error("Could not load budget information.");
      }

      if (cancelled) return;

      const expenseCategories: Category[] = (
        categoryData.categories ?? []
      ).filter((category: Category) => category.type === "expense");

      const transactions = transactionData.transactions ?? [];

      const calculatedBudgets: Budget[] = (
        budgetData.budgets ?? []
      ).map((budget: Omit<Budget, "spent">) => {
        const budgetMonth = budget.month.slice(0, 7);

        const spent = transactions
          .filter(
            (transaction: {
              category_id: string | null;
              type: string;
              transaction_date: string;
            }) =>
              transaction.category_id === budget.category_id &&
              transaction.type === "expense" &&
              transaction.transaction_date.slice(0, 7) === budgetMonth
          )
          .reduce(
            (
              total: number,
              transaction: { amount: number | string }
            ) => total + Number(transaction.amount),
            0
          );

        return {
          ...budget,
          amount: Number(budget.amount),
          spent,
        };
      });

      setCategories(expenseCategories);
      setBudgets(calculatedBudgets);

      setCategoryId((current) =>
        current || expenseCategories[0]?.id || ""
      );
    } catch (err) {
      if (!cancelled) {
        setError(
          err instanceof Error
            ? err.message
            : "Something went wrong."
        );
      }
    } finally {
      if (!cancelled) setLoading(false);
    }
  }

  loadData();

  return () => {
    cancelled = true;
  };
}, [refreshKey]);


  async function addBudget(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const response = await fetch("/api/budgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category_id: categoryId,
          amount: Number(amount),
          month,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Could not save budget.");
      }

      setAmount("");
      setRefreshKey((current) => current + 1);
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

      <main className="main-area main-content wide-page" style={{ padding: 28 }}>
        <h1 className="page-title">Budgets</h1>
        <p className="page-subtitle">
          Plan your monthly spending and track your limits.
        </p>

        <section className="card" style={{ marginTop: 24 }}>
          <h2 className="card-title">Create a budget</h2>

          <form onSubmit={addBudget}>
            <label className="field-label" htmlFor="budget-category">
              Expense category
            </label>

            <select
              id="budget-category"
              className="form-input"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              required
            >
              {categories.length === 0 && (
                <option value="">No expense categories available</option>
              )}

              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>

            <label className="field-label" htmlFor="budget-amount">
              Monthly limit ({currency})
            </label>

            <input
              id="budget-amount"
              className="form-input"
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 5000"
              required
            />

            <label className="field-label" htmlFor="budget-month">
              Month
            </label>

            <input
              id="budget-month"
              className="form-input"
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              required
            />

            {error && (
              <p style={{ color: "#DC2626", marginTop: 12 }}>
                {error}
              </p>
            )}

            <button
              className="primary-button"
              type="submit"
              disabled={saving || categories.length === 0}
              style={{ marginTop: 20 }}
            >
              {saving ? "Saving..." : "Save Budget"}
            </button>
          </form>
        </section>

        <section className="card" style={{ marginTop: 24 }}>
          <h2 className="card-title">Your budgets</h2>

          {loading ? (
            <p>Loading budgets...</p>
          ) : budgets.length === 0 ? (
            <p className="card-description">
              No budgets yet. Create your first budget above.
            </p>
          ) : (
            budgets.map((budget) => {
              const percentage =
                (budget.spent / budget.amount) * 100;

              const remaining = budget.amount - budget.spent;

              const status =
                percentage >= 100
                  ? "danger"
                  : percentage >= 75
                    ? "warning"
                    : "normal";

              return (
                <div
                  key={budget.id}
                  className="budget-item"
                  style={{ marginTop: 20 }}
                >
                  <div className="budget-top">
                    <strong>{budget.category_name}</strong>
                    <span className="tabular">
                      {formatMoney(budget.spent)} /{" "}
                      {formatMoney(budget.amount)}
                    </span>
                  </div>

                  <div className="progress-track">
                    <div
                      className={`progress-fill ${status}`}
                      style={{
                        width: `${Math.min(percentage, 100)}%`,
                      }}
                    />
                  </div>

                  <div className="budget-caption">
                    {remaining >= 0
                      ? `${formatMoney(remaining)} remaining`
                      : `Exceeded by ${formatMoney(Math.abs(remaining))}`}
                    {" · "}
                    {Math.round(percentage)}% used
                  </div>

                  <p className="card-description">
                    {new Date(`${budget.month.slice(0, 7)}-01T12:00:00`)
                      .toLocaleDateString("en-IN", {
                        month: "long",
                        year: "numeric",
                      })}
                  </p>
                </div>
              );
            })
          )}
        </section>
      </main>
    </div>
  );
}
