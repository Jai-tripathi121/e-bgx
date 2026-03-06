import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { BGStatus, OfferStatus, TxnStatus, KYCStatus } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── Currency ─────────────────────────────────────────────────────────────────

export function formatINR(amount: number, compact = false): string {
  if (compact) {
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
    if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
    return `₹${amount}`;
  }
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

// ─── Date ─────────────────────────────────────────────────────────────────────

export function formatDate(date: Date | string, format: "short" | "long" | "relative" = "short"): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (format === "relative") {
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (hours < 1) return "Just now";
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
  }
  if (format === "long") {
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
  }
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

// ─── Status ───────────────────────────────────────────────────────────────────

export function getBGStatusConfig(status: BGStatus): { label: string; color: string; bg: string; dot: string } {
  const map: Record<BGStatus, { label: string; color: string; bg: string; dot: string }> = {
    DRAFT:             { label: "Draft",             color: "text-gray-500",        bg: "bg-gray-100 dark:bg-gray-800",           dot: "bg-gray-400" },
    PAYMENT_REQUESTED: { label: "Payment Requested", color: "text-amber-600",       bg: "bg-amber-50 dark:bg-amber-950",          dot: "bg-amber-500" },
    PROCESSING:        { label: "Processing",        color: "text-blue-600",        bg: "bg-blue-50 dark:bg-blue-950",            dot: "bg-blue-500" },
    IN_PROGRESS:       { label: "In Progress",       color: "text-blue-600",        bg: "bg-blue-50 dark:bg-blue-950",            dot: "bg-blue-500" },
    OFFER_ACCEPTED:    { label: "Offer Accepted",    color: "text-teal-600",        bg: "bg-teal-50 dark:bg-teal-950",            dot: "bg-teal-500" },
    PAYMENT_CONFIRMED: { label: "Payment Confirmed", color: "text-green-600",       bg: "bg-green-50 dark:bg-green-950",          dot: "bg-green-500" },
    ISSUED:            { label: "Issued",            color: "text-green-700",       bg: "bg-green-100 dark:bg-green-950",         dot: "bg-green-600" },
    PAY_FEES:          { label: "Pay Fees",          color: "text-red-600",         bg: "bg-red-50 dark:bg-red-950",              dot: "bg-red-500" },
    EXPIRED:           { label: "Expired",           color: "text-gray-500",        bg: "bg-gray-100 dark:bg-gray-800",           dot: "bg-gray-400" },
    AMENDED:           { label: "Amended",           color: "text-purple-600",      bg: "bg-purple-50 dark:bg-purple-950",        dot: "bg-purple-500" },
  };
  return map[status] ?? map.DRAFT;
}

export function getOfferStatusConfig(status: OfferStatus): { label: string; color: string; bg: string } {
  const map: Record<OfferStatus, { label: string; color: string; bg: string }> = {
    PENDING:  { label: "Pending",  color: "text-gray-500",  bg: "bg-gray-100 dark:bg-gray-800" },
    ACCEPTED: { label: "Accepted", color: "text-green-600", bg: "bg-green-50 dark:bg-green-950" },
    REJECTED: { label: "Rejected", color: "text-red-600",   bg: "bg-red-50 dark:bg-red-950" },
    EXPIRED:  { label: "Expired",  color: "text-gray-400",  bg: "bg-gray-50 dark:bg-gray-900" },
  };
  return map[status] ?? map.PENDING;
}

export function getTxnStatusConfig(status: TxnStatus): { label: string; color: string; bg: string } {
  const map: Record<TxnStatus, { label: string; color: string; bg: string }> = {
    SUCCESS:       { label: "Success",        color: "text-green-600", bg: "bg-green-50 dark:bg-green-950" },
    VERIFIED:      { label: "Verified",       color: "text-blue-600",  bg: "bg-blue-50 dark:bg-blue-950" },
    PROOF_UPLOADED:{ label: "Proof Uploaded", color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950" },
    PENDING:       { label: "Pending",        color: "text-gray-500",  bg: "bg-gray-100 dark:bg-gray-800" },
  };
  return map[status] ?? map.PENDING;
}

export function getKYCStatusConfig(status: KYCStatus): { label: string; color: string; bg: string } {
  const map: Record<KYCStatus, { label: string; color: string; bg: string }> = {
    PENDING:      { label: "Pending",      color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950" },
    UNDER_REVIEW: { label: "Under Review", color: "text-blue-600",  bg: "bg-blue-50 dark:bg-blue-950" },
    APPROVED:     { label: "Approved",     color: "text-green-600", bg: "bg-green-50 dark:bg-green-950" },
    REJECTED:     { label: "Rejected",     color: "text-red-600",   bg: "bg-red-50 dark:bg-red-950" },
  };
  return map[status] ?? map.PENDING;
}

// ─── BG Reference ─────────────────────────────────────────────────────────────

export function generateBGRef(): string {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `BG-${num}`;
}

// ─── Platform Fee ─────────────────────────────────────────────────────────────

export function calcPlatformFee(amountINR: number): number {
  return Math.round(amountINR * 0.01);
}

export function calcCommission(amountINR: number, rate: number, months: number): number {
  return Math.round(amountINR * (rate / 100) * (months / 12));
}
