import { cn } from "@/lib/utils";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  glass?: boolean;
}

export function Card({ children, className, hover, glass }: CardProps) {
  return (
    <div className={cn(
      "rounded-xl border border-gray-200 dark:border-navy-700 bg-white dark:bg-navy-900 shadow-card dark:shadow-card-dark",
      hover && "transition-shadow hover:shadow-lg cursor-pointer",
      glass && "bg-white/80 dark:bg-navy-900/80 backdrop-blur-md",
      className,
    )}>
      {children}
    </div>
  );
}

export function CardHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("px-6 py-4 border-b border-gray-100 dark:border-navy-800", className)}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <h3 className={cn("text-base font-semibold text-gray-900 dark:text-white", className)}>
      {children}
    </h3>
  );
}

export function CardContent({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("p-6", className)}>
      {children}
    </div>
  );
}

export function CardFooter({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("px-6 py-4 border-t border-gray-100 dark:border-navy-800 bg-gray-50/50 dark:bg-navy-950/50 rounded-b-xl", className)}>
      {children}
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

interface KPICardProps {
  label: string;
  value: string;
  subtext?: string;
  icon?: React.ReactNode;
  trend?: { value: number; label: string };
  variant?: "default" | "navy" | "success" | "warning" | "danger";
  className?: string;
}

export function KPICard({ label, value, subtext, icon, trend, variant = "default", className }: KPICardProps) {
  const variantStyles = {
    default: "bg-white dark:bg-navy-900 border-gray-200 dark:border-navy-700",
    navy:    "bg-gradient-navy text-white border-navy-700",
    success: "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-900",
    warning: "bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-900",
    danger:  "bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-900",
  };

  return (
    <div className={cn("rounded-xl border p-5 shadow-card dark:shadow-card-dark", variantStyles[variant], className)}>
      <div className="flex items-start justify-between">
        <div className="space-y-1.5">
          <p className={cn("text-xs font-medium uppercase tracking-wider", variant === "navy" ? "text-silver-300" : "text-gray-500 dark:text-gray-400")}>
            {label}
          </p>
          <p className={cn("text-2xl font-bold tabular-nums", variant === "navy" ? "text-white" : "text-gray-900 dark:text-white")}>
            {value}
          </p>
          {subtext && (
            <p className={cn("text-xs", variant === "navy" ? "text-silver-400" : "text-gray-500 dark:text-gray-400")}>
              {subtext}
            </p>
          )}
          {trend && (
            <p className={cn("text-xs font-medium", trend.value >= 0 ? "text-green-600" : "text-red-600")}>
              {trend.value >= 0 ? "↑" : "↓"} {Math.abs(trend.value)}% {trend.label}
            </p>
          )}
        </div>
        {icon && (
          <div className={cn("p-2.5 rounded-lg", variant === "navy" ? "bg-navy-700/50" : "bg-navy-50 dark:bg-navy-800")}>
            <span className={variant === "navy" ? "text-silver-300" : "text-navy-600 dark:text-navy-300"}>
              {icon}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
