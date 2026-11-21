
"use client";

import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Utensils,
  ShoppingBag,
  Car,
  GraduationCap,
  ArrowLeftRight,
} from "lucide-react";

import type { Transaction } from "@/components/transactions/RecentTransactions";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import MetricCards from "@/components/dashboard/MetricCards";
import ExpenseOverview from "@/components/dashboard/ExpenseOverview";
import BudgetProgress from "@/components/dashboard/BudgetProgress";
import RecentTransactions from "@/components/transactions/RecentTransactions";
import AddTransactionModal from "@/components/transactions/AddTransactionModal";
import { useCurrency } from "@/lib/useCurrency";

type ApiAccount = {
  id: string;
  name: string;
  account_type: string;
  opening_balance: number | string;
  current_balance: number | string;
};

type ApiTransaction = {
  id: string;
  description: string;
  amount: number | string;
  type: "income" | "expense" | "transfer";
  account_id: string;
  category_id: string | null;
  transfer_account_id?: string | null;
  transaction_date: string;
  account_name?: string;
  category_name?: string | null;
  transfer_account_name?: string | null;
};

type ApiBudget = {
  id: string;
  category_id: string;
  category_name: string;
  amount: number | string;
  month: string;
};

type DashboardBudget = {
  id: string;
  name: string;
  spent: number;
  limit: number;
};

function getCategoryIcon(category?: string | null) {
  const name = category?.toLowerCase() ?? "";

  if (name.includes("food") || name.includes("dining")) return Utensils;
  if (name.includes("transport") || name.includes("travel")) return Car;
  if (name.includes("shopping")) return ShoppingBag;
  if (name.includes("education")) return GraduationCap;

  return Wallet;
}

export default function Home() {
  const { currency, formatMoney } = useCurrency();
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [apiTransactions, setApiTransactions] = useState<ApiTransaction[]>([]);
  const [accounts, setAccounts] = useState<ApiAccount[]>([]);
  const [dashboardBudgets, setDashboardBudgets] = useState<DashboardBudget[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadDashboardData() {
      setLoading(true);
      setLoadError("");

      try {
        const [
          transactionsResponse,
          accountsResponse,
          budgetsResponse,
        ] = await Promise.all([
          fetch("/api/transactions"),
          fetch("/api/accounts"),
          fetch("/api/budgets"),
        ]);

        if (
          !transactionsResponse.ok ||
          !accountsResponse.ok ||
          !budgetsResponse.ok
        ) {
          throw new Error("Could not load your financial data.");
        }

        const [
          transactionsData,
          accountsData,
          budgetsData,
        ] = await Promise.all([
          transactionsResponse.json(),
          accountsResponse.json(),
          budgetsResponse.json(),
        ]);

        if (cancelled) return;

        const rawTransactions: ApiTransaction[] =
          transactionsData.transactions ?? [];

        const rawAccounts: ApiAccount[] =
          accountsData.accounts ?? [];

        const rawBudgets: ApiBudget[] =
          budgetsData.budgets ?? [];

        setApiTransactions(rawTransactions);
        setAccounts(rawAccounts);

        // Calculate current month's budget progress
        const currentMonth = new Date().toISOString().slice(0, 7);

        const currentMonthBudgets: DashboardBudget[] = rawBudgets
          .filter(
            (budget) => budget.month.slice(0, 7) === currentMonth
          )
          .map((budget) => {
            const spent = rawTransactions
              .filter(
                (transaction) =>
                  transaction.category_id === budget.category_id &&
                  transaction.type === "expense" &&
                  transaction.transaction_date.slice(0, 7) === currentMonth
              )
              .reduce(
                (total, transaction) =>
                  total + Number(transaction.amount),
                0
              );

            return {
              id: budget.id,
              name: budget.category_name,
              spent,
              limit: Number(budget.amount),
            };
          });

        setDashboardBudgets(currentMonthBudgets);

        // Prepare transactions for the dashboard table
        const displayTransactions: Transaction[] = rawTransactions.map(
          (item) => ({
            id: item.id,
            name: item.description,
            category:
              item.type === "transfer"
                ? "Transfer"
                : item.category_name || "Uncategorized",
            date: new Date(item.transaction_date).toLocaleString("en-IN", {
              day: "2-digit",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            }),
            method: item.account_name || "Account",
            amount: Number(item.amount),
            icon:
              item.type === "transfer"
                ? ArrowLeftRight
                : getCategoryIcon(item.category_name),
            income: item.type === "income",
          })
        );

        setTransactions(displayTransactions);
      } catch (error) {
        if (!cancelled) {
          setLoadError(
            error instanceof Error
              ? error.message
              : "Something went wrong while loading your data."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadDashboardData();

    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const filteredTransactions = transactions.filter((item) =>
    `${item.name} ${item.category}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const now = new Date();

  const thisMonthTransactions = apiTransactions.filter((item) => {
    const date = new Date(item.transaction_date);

    return (
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear()
    );
  });

  const monthlyIncome = thisMonthTransactions
    .filter((item) => item.type === "income")
    .reduce((total, item) => total + Number(item.amount), 0);

  const monthlyExpenses = thisMonthTransactions
    .filter((item) => item.type === "expense")
    .reduce((total, item) => total + Number(item.amount), 0);

  const totalBalance = accounts.reduce(
    (total, account) =>
      total + Number(account.current_balance || 0),
    0
  );

  const metrics = [
    {
      label: "Total Balance",
      amount: totalBalance,
      icon: Wallet,
      color: "blue",
      trend: "Live",
      positive: true,
    },
    {
      label: "Monthly Income",
      amount: monthlyIncome,
      icon: ArrowDownRight,
      color: "green",
      trend: "This month",
      positive: true,
    },
    {
      label: "Monthly Expenses",
      amount: monthlyExpenses,
      icon: ArrowUpRight,
      color: "red",
      trend: "This month",
      positive: false,
    },
  ];

  return (
    <div className="app-shell">
      <Sidebar />

      <div className="main-area">
        <Header
          search={search}
          setSearch={setSearch}
          onAddTransaction={() => setShowModal(true)}
          pageTitle="Overview"
          pageSubtitle="Your financial activity at a glance."
        />

        <main className="main-content">
          {loadError && (
            <p className="card-description" role="alert">
              {loadError}
            </p>
          )}

          <MetricCards
            metrics={metrics}
            formatMoney={formatMoney}
          />

          <div className="dashboard-grid">
            <ExpenseOverview transactions={apiTransactions} currency={currency} />

            <BudgetProgress
              budgets={dashboardBudgets}
              formatMoney={formatMoney}
            />
          </div>

          <div style={{ marginTop: 24 }}>
            {loading ? (
              <p className="card-description">
                Loading your transactions...
              </p>
            ) : (
              <RecentTransactions
                transactions={filteredTransactions}
                formatMoney={formatMoney}
              />
            )}
          </div>

          <p className="page-subtitle" style={{ marginTop: 20 }}>
            FinTrack · Connected to Supabase
          </p>
        </main>
      </div>

      {showModal && (
        <AddTransactionModal
          currency={currency}
          onClose={() => setShowModal(false)}
          onSave={() => {
            setShowModal(false);
            setRefreshKey((current) => current + 1);
          }}
        />
      )}
    </div>
  );
}
