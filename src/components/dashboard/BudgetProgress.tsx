
type Budget = {
  id: string;
  name: string;
  spent: number;
  limit: number;
};

type BudgetProgressProps = {
  budgets: Budget[];
  formatMoney: (amount: number) => string;
};

export default function BudgetProgress({
  budgets,
  formatMoney,
}: BudgetProgressProps) {
  return (
    <section className="card">
      <div className="card-header">
        <div>
          <h2 className="card-title">Budget Progress</h2>
          <div className="card-description">
            Monthly category limits
          </div>
        </div>
      </div>

      {budgets.length === 0 ? (
        <p className="card-description">
          No budgets created for this month yet.
        </p>
      ) : (
        budgets.map((budget) => {
          const percentage =
            budget.limit > 0
              ? (budget.spent / budget.limit) * 100
              : 0;

          const status =
            percentage >= 100
              ? "danger"
              : percentage >= 75
                ? "warning"
                : "normal";

          const remaining = budget.limit - budget.spent;

          return (
            <div className="budget-item" key={budget.id}>
              <div className="budget-top">
                <strong>{budget.name}</strong>
                <span className="tabular">
                  {formatMoney(budget.spent)} /{" "}
                  {formatMoney(budget.limit)}
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
            </div>
          );
        })
      )}
    </section>
  );
}
