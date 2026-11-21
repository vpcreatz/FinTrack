
import type { LucideIcon } from "lucide-react";

export type Transaction = {
  id: string;
  name: string;
  category: string;
  date: string;
  method: string;
  amount: number;
  icon: LucideIcon;
  income?: boolean;
};

type RecentTransactionsProps = {
  transactions: Transaction[];
  formatMoney: (amount: number) => string;
};

export default function RecentTransactions({
  transactions,
  formatMoney,
}: RecentTransactionsProps) {
  return (
    <section className="card transactions-card">
      <div className="card-header">
        <div>
          <h2 className="card-title">Recent Transactions</h2>
          <div className="card-description">
            Your latest financial activity
          </div>
        </div>

        <button className="secondary-button">
          View All →
        </button>
      </div>

      <table className="transaction-table">
        <thead>
          <tr>
            <th>MERCHANT / NOTE</th>
            <th>CATEGORY</th>
            <th>DATE &amp; TIME</th>
            <th>PAYMENT</th>
            <th style={{ textAlign: "right" }}>AMOUNT</th>
          </tr>
        </thead>

        <tbody>
          {transactions.map((item) => {
            const Icon = item.icon;

            return (
              <tr key={item.id}>
                <td>
                  <div className="merchant-cell">
                    <div className="merchant-icon">
                      <Icon size={17} />
                    </div>
                    <strong>{item.name}</strong>
                  </div>
                </td>

                <td>
                  <span className="category-badge">
                    {item.category}
                  </span>
                </td>

                <td>{item.date}</td>
                <td>{item.method}</td>

                <td
                  className={`amount-cell ${
                    item.income ? "income" : ""
                  }`}
                >
                  {item.income ? "+" : "−"}
                  {formatMoney(item.amount)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {transactions.length === 0 && (
        <p style={{ color: "#64748B", padding: 20 }}>
          No matching transactions.
        </p>
      )}
    </section>
  );
}
