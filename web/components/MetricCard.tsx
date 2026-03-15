interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: number;
  icon?: string;
}

export default function MetricCard({ title, value, subtitle, trend, icon }: MetricCardProps) {
  return (
    <div className="card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
          {trend !== undefined && (
            <p
              className={`text-sm mt-1 font-medium ${
                trend > 0 ? "text-green-600" : trend < 0 ? "text-red-600" : "text-gray-500"
              }`}
            >
              {trend > 0 ? "+" : ""}
              {trend.toFixed(1)}%
            </p>
          )}
        </div>
        {icon && <span className="text-2xl">{icon}</span>}
      </div>
    </div>
  );
}
