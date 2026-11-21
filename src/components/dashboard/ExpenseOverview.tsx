
"use client";

import { useState } from "react";

type ExpenseTransaction = {
  amount: number | string;
  type: "income" | "expense" | "transfer";
  transaction_date: string;
};

type ExpenseOverviewProps = {
  transactions: ExpenseTransaction[];
  currency?: string;
};

type Period = "Daily" | "Weekly" | "Monthly";

export default function ExpenseOverview({
  transactions,
  currency = "INR",
}: ExpenseOverviewProps) {
  const [period, setPeriod] = useState<Period>("Daily");

  const now = new Date();

  const buckets =
    period === "Daily"
      ? Array.from({ length: 7 }, (_, i) => {
          const date = new Date(now);
          date.setDate(now.getDate() - (6 - i));

          return {
            label: date.toLocaleDateString("en-IN", {
              weekday: "short",
            }),
            value: 0,
          };
        })
      : period === "Weekly"
        ? Array.from({ length: 4 }, (_, i) => ({
            label: `Week ${i + 1}`,
            value: 0,
          }))
        : Array.from({ length: 6 }, (_, i) => {
            const date = new Date(
              now.getFullYear(),
              now.getMonth() - (5 - i),
              1
            );

            return {
              label: date.toLocaleDateString("en-IN", {
                month: "short",
              }),
              value: 0,
            };
          });

  transactions.forEach((transaction) => {
    if (transaction.type !== "expense") return;

    const date = new Date(transaction.transaction_date);
    if (Number.isNaN(date.getTime())) return;

    const amount = Number(transaction.amount);
    if (!Number.isFinite(amount)) return;

    let index = -1;

    if (period === "Daily") {
      const transactionDay = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate()
      );

      const today = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
      );

      const difference = Math.round(
        (today.getTime() - transactionDay.getTime()) /
          (1000 * 60 * 60 * 24)
      );

      if (difference >= 0 && difference < 7) {
        index = 6 - difference;
      }
    } else if (period === "Weekly") {
      const transactionDay = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate()
      );

      const today = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
      );

      const difference = Math.floor(
        (today.getTime() - transactionDay.getTime()) /
          (1000 * 60 * 60 * 24)
      );

      if (difference >= 0 && difference < 28) {
        index = 3 - Math.floor(difference / 7);
      }
    } else {
      const monthDifference =
        (now.getFullYear() - date.getFullYear()) * 12 +
        now.getMonth() -
        date.getMonth();

      if (monthDifference >= 0 && monthDifference < 6) {
        index = 5 - monthDifference;
      }
    }

    if (index >= 0) {
      buckets[index].value += amount;
    }
  });

  const maxValue = Math.max(
    ...buckets.map((bucket) => bucket.value),
    1
  );

  const points = buckets.map((bucket, index) => ({
    x: 45 + (index * 645) / (buckets.length - 1),
    y: 190 - (bucket.value / maxValue) * 140,
  }));

  const linePath = points
    .map(
      (point, index) =>
        `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`
    )
    .join(" ");

  const areaPath =
    `${linePath} L ${points[points.length - 1].x} 215 ` +
    `L ${points[0].x} 215 Z`;

  const totalExpenses = buckets.reduce(
    (total, bucket) => total + bucket.value,
    0
  );

  return (
    <section className="card">
      <div className="card-header">
        <div>
          <h2 className="card-title">Expense Overview</h2>
          <div className="card-description">
            Your spending activity
          </div>
        </div>

        <select
          className="secondary-button"
          value={period}
          onChange={(e) => setPeriod(e.target.value as Period)}
        >
          <option value="Daily">Daily</option>
          <option value="Weekly">Weekly</option>
          <option value="Monthly">Monthly</option>
        </select>
      </div>

      <div className="chart-container">
        <svg viewBox="0 0 700 250" preserveAspectRatio="none">
          <defs>
            <linearGradient
              id="chartFill"
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop offset="0%" stopColor="#2563EB" stopOpacity="0.16" />
              <stop offset="100%" stopColor="#2563EB" stopOpacity="0" />
            </linearGradient>
          </defs>

          {[35, 85, 135, 185].map((y) => (
            <line
              key={y}
              x1="45"
              x2="690"
              y1={y}
              y2={y}
              className="chart-grid"
            />
          ))}

          <path d={areaPath} fill="url(#chartFill)" />

          <path
            d={linePath}
            className="chart-line"
            fill="none"
          />

          {points.map((point, index) => (
            <circle
              key={index}
              cx={point.x}
              cy={point.y}
              r="3"
              fill="#2563EB"
            />
          ))}

          {buckets.map((bucket, index) => (
            <text
              key={index}
              x={points[index].x}
              y="242"
              fontSize="11"
              fill="#64748B"
              textAnchor="middle"
            >
              {bucket.label}
            </text>
          ))}
        </svg>
      </div>

      <div className="card-description">
        Total expenses:{" "}
        {new Intl.NumberFormat("en-IN", {
          style: "currency",
          currency,
          maximumFractionDigits: 2,
        }).format(totalExpenses)}
      </div>
    </section>
  );
}
