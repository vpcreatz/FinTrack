
import { TrendingUp, type LucideIcon } from "lucide-react";

type Metric = {
  label: string;
  amount: number;
  icon: LucideIcon;
  color: string;
  trend: string;
  positive: boolean;
};

type MetricCardsProps = {
  metrics: Metric[];
  formatMoney: (amount: number) => string;
};

export default function MetricCards({
  metrics,
  formatMoney,
}: MetricCardsProps) {
  return (
    <div className="metrics-grid">
      {metrics.map((metric) => {
        const Icon = metric.icon;

        return (
          <section className="card" key={metric.label}>
            <div className="metric-top">
              {metric.label}
              <div className={`metric-icon ${metric.color}`}>
                <Icon size={21} />
              </div>
            </div>

            <div className="metric-value">
              {formatMoney(metric.amount)}
            </div>

            <div
              className={`trend ${
                metric.positive ? "positive" : "negative"
              }`}
            >
              <TrendingUp size={14} />
              {metric.trend}
              <span style={{ color: "#94A3B8", fontWeight: 400 }}>
                &nbsp;vs last month
              </span>
            </div>
          </section>
        );
      })}
    </div>
  );
}
