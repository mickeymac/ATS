import { Card, CardBody } from '@nextui-org/react';

export function StatsCard({ title, value, trend, trendUp, icon: Icon, color = "primary" }) {
  const colorMap = {
    primary: "bg-primary/10 text-primary",
    secondary: "bg-secondary/10 text-secondary",
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
    danger: "bg-danger/10 text-danger",
  };

  return (
    <Card className="border border-divider shadow-sm bg-content1">
      <CardBody className="gap-4 p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-default-500">{title}</p>
            <h3 className="mt-2 text-3xl font-bold text-default-900">{value}</h3>
          </div>
          <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${colorMap[color]}`}>
            <Icon size={24} />
          </div>
        </div>
        {trend && (
          <div className="flex items-center gap-2 text-xs">
            <span className={trendUp ? "text-success" : "text-danger"}>
              {trendUp ? "↑" : "↓"} {trend}
            </span>
            <span className="text-default-400">vs last month</span>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

export default StatsCard;
