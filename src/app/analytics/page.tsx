"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, ChartNoAxesCombined, TrendingUp, Wallet } from "lucide-react";
import Sidebar from "@/components/layout/Sidebar";
import { useCurrency } from "@/lib/useCurrency";

type Transaction = { id: string; amount: number | string; type: "income" | "expense" | "transfer"; transaction_date: string; category_name?: string | null; description?: string };
const keyFor = (date: string) => date.slice(0, 7);

export default function AnalyticsPage() {
  const { formatMoney } = useCurrency();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const response = await fetch("/api/transactions");
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Could not load analytics.");
        if (!cancelled) setTransactions(result.transactions ?? []);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load analytics.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  const analytics = useMemo(() => {
    const now = new Date();
    const months = Array.from({ length: 6 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      return { key, label: date.toLocaleDateString("en-IN", { month: "short" }), income: 0, expense: 0 };
    });
    const monthMap = new Map(months.map((month) => [month.key, month]));
    const categoryTotals = new Map<string, number>();
    let totalIncome = 0;
    let totalExpense = 0;
    let allIncome = 0;
    let allExpense = 0;

    for (const transaction of transactions) {
      const amount = Number(transaction.amount) || 0;
      if (transaction.type === "income") allIncome += amount;
      if (transaction.type === "expense") allExpense += amount;
      const month = monthMap.get(keyFor(transaction.transaction_date));
      if (month && transaction.type === "income") { month.income += amount; totalIncome += amount; }
      if (month && transaction.type === "expense") {
        month.expense += amount;
        totalExpense += amount;
        const category = transaction.category_name || "Uncategorised";
        categoryTotals.set(category, (categoryTotals.get(category) ?? 0) + amount);
      }
    }
    const categories = [...categoryTotals.entries()].map(([name, amount]) => ({ name, amount })).sort((a, b) => b.amount - a.amount).slice(0, 6);
    const maxCategory = Math.max(1, ...categories.map((category) => category.amount));
    const maxMonthly = Math.max(1, ...months.flatMap((month) => [month.income, month.expense]));
    return { months, categories, maxCategory, maxMonthly, totalIncome, totalExpense, allIncome, allExpense };
  }, [transactions]);

  const net = analytics.totalIncome - analytics.totalExpense;
  const savingsRate = analytics.totalIncome > 0 ? (net / analytics.totalIncome) * 100 : 0;

  return (
    <div className="app-shell"><Sidebar /><div className="main-area">
      <header className="topbar"><div><h1 className="page-title">Analytics & Reports</h1><p className="page-subtitle">Understand your cash flow and spending patterns.</p></div><span className="report-range">Last 6 months</span></header>
      <main className="main-content">
        {error && <p className="notice-error" role="alert">{error}</p>}
        <section className="metrics-grid">
          <div className="card"><div className="metric-top">Income <span className="metric-icon green"><ArrowDownRight size={19} /></span></div><div className="metric-value">{formatMoney(analytics.totalIncome)}</div><div className="card-description">Last six months</div></div>
          <div className="card"><div className="metric-top">Expenses <span className="metric-icon red"><ArrowUpRight size={19} /></span></div><div className="metric-value">{formatMoney(analytics.totalExpense)}</div><div className="card-description">Last six months</div></div>
          <div className="card"><div className="metric-top">Net cash flow <span className="metric-icon blue"><Wallet size={19} /></span></div><div className="metric-value" style={{ color: net >= 0 ? "#059669" : "#DC2626" }}>{formatMoney(net)}</div><div className="card-description">Savings rate {savingsRate.toFixed(1)}% of income</div></div>
        </section>

        <section className="analytics-grid">
          <div className="card"><div className="card-header"><div><h2 className="card-title">Income vs expenses</h2><p className="card-description">Monthly totals from your recorded transactions.</p></div><ChartNoAxesCombined size={20} color="#64748B" /></div>
            {loading ? <div className="empty-state compact">Preparing your report…</div> : <div className="monthly-chart">
              {analytics.months.map((month) => <div className="month-column" key={month.key}>
                <div className="month-bars"><div className="month-bar income-bar" title={`Income ${formatMoney(month.income)}`} style={{ height: `${Math.max(month.income > 0 ? 3 : 0, (month.income / analytics.maxMonthly) * 100)}%` }} /><div className="month-bar expense-bar" title={`Expenses ${formatMoney(month.expense)}`} style={{ height: `${Math.max(month.expense > 0 ? 3 : 0, (month.expense / analytics.maxMonthly) * 100)}%` }} /></div><span>{month.label}</span>
              </div>)}
            </div>}
            <div className="chart-legend"><span><i className="legend-dot income-dot" /> Income</span><span><i className="legend-dot expense-dot" /> Expenses</span></div>
          </div>
          <div className="card"><div className="card-header"><div><h2 className="card-title">Spending by category</h2><p className="card-description">Where your expenses went in the same period.</p></div><TrendingUp size={20} color="#64748B" /></div>
            {loading ? <div className="empty-state compact">Loading categories…</div> : analytics.categories.length === 0 ? <div className="empty-state compact">No expense data for this period.</div> : <div className="category-breakdown">{analytics.categories.map((category) => <div className="category-row" key={category.name}><div className="category-row-top"><strong>{category.name}</strong><span>{formatMoney(category.amount)}</span></div><div className="progress-track"><div className="progress-fill normal" style={{ width: `${(category.amount / analytics.maxCategory) * 100}%` }} /></div></div>)}</div>}
          </div>
        </section>

        <section className="card report-summary"><div className="card-header"><div><h2 className="card-title">All-time snapshot</h2><p className="card-description">Based on the transaction history in your account.</p></div></div><div className="report-summary-grid"><div><span>Total income</span><strong>{formatMoney(analytics.allIncome)}</strong></div><div><span>Total expenses</span><strong>{formatMoney(analytics.allExpense)}</strong></div><div><span>Net recorded cash flow</span><strong>{formatMoney(analytics.allIncome - analytics.allExpense)}</strong></div><div><span>Transactions recorded</span><strong>{transactions.length.toLocaleString("en-IN")}</strong></div></div></section>
      </main>
    </div></div>
  );
}
