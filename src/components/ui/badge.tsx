"use client";
import { cn } from "@/lib/utils";
import { getBGStatusConfig, getOfferStatusConfig, getTxnStatusConfig, getKYCStatusConfig } from "@/lib/utils";
import { BGStatus, OfferStatus, TxnStatus, KYCStatus } from "@/types";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "error" | "info" | "teal" | "purple" | "ghost";
  size?: "sm" | "md";
  dot?: boolean;
  className?: string;
}

export function Badge({ children, variant = "default", size = "sm", dot = false, className }: BadgeProps) {
  const variants = {
    default:  "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    success:  "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400",
    warning:  "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
    error:    "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400",
    info:     "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
    teal:     "bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-400",
    purple:   "bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-400",
    ghost:    "bg-transparent border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400",
  };
  const sizes = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-3 py-1",
  };
  const dotColors = {
    default: "bg-gray-400",
    success: "bg-green-500",
    warning: "bg-amber-500",
    error:   "bg-red-500",
    info:    "bg-blue-500",
    teal:    "bg-teal-500",
    purple:  "bg-purple-500",
    ghost:   "bg-gray-400",
  };

  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full font-medium", variants[variant], sizes[size], className)}>
      {dot && <span className={cn("w-1.5 h-1.5 rounded-full", dotColors[variant])} />}
      {children}
    </span>
  );
}

export function BGStatusBadge({ status }: { status: BGStatus }) {
  const config = getBGStatusConfig(status);
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full text-xs font-medium px-2 py-0.5", config.color, config.bg)}>
      <span className={cn("w-1.5 h-1.5 rounded-full", config.dot)} />
      {config.label}
    </span>
  );
}

export function OfferStatusBadge({ status }: { status: OfferStatus }) {
  const config = getOfferStatusConfig(status);
  return (
    <span className={cn("inline-flex items-center rounded-full text-xs font-medium px-2 py-0.5", config.color, config.bg)}>
      {config.label}
    </span>
  );
}

export function TxnStatusBadge({ status }: { status: TxnStatus }) {
  const config = getTxnStatusConfig(status);
  return (
    <span className={cn("inline-flex items-center rounded-full text-xs font-medium px-2 py-0.5", config.color, config.bg)}>
      {config.label}
    </span>
  );
}

export function KYCStatusBadge({ status }: { status: KYCStatus }) {
  const config = getKYCStatusConfig(status);
  return (
    <span className={cn("inline-flex items-center rounded-full text-xs font-medium px-2 py-0.5", config.color, config.bg)}>
      {config.label}
    </span>
  );
}
