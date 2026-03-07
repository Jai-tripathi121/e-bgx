"use client";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "success";
  size?: "xs" | "sm" | "md" | "lg";
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
  children, variant = "primary", size = "md", loading, icon, iconPosition = "left",
  className, disabled, ...props
}, ref) => {
  const variants = {
    primary:   "bg-black hover:bg-gray-900 text-white border border-black shadow-sm",
    secondary: "bg-gray-900 hover:bg-gray-800 text-white border border-gray-800",
    outline:   "bg-transparent hover:bg-gray-50 dark:hover:bg-white/5 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-white/15",
    ghost:     "bg-transparent hover:bg-gray-100 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 border border-transparent",
    danger:    "bg-red-600 hover:bg-red-700 text-white border border-red-600",
    success:   "bg-green-600 hover:bg-green-700 text-white border border-green-600",
  };
  const sizes = {
    xs: "text-xs px-2.5 py-1.5 rounded-md gap-1",
    sm: "text-sm px-3 py-2 rounded-md gap-1.5",
    md: "text-sm px-4 py-2.5 rounded-lg gap-2",
    lg: "text-base px-6 py-3 rounded-lg gap-2",
  };

  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20 focus:ring-offset-2 dark:focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin shrink-0" /> : iconPosition === "left" && icon}
      {children}
      {!loading && iconPosition === "right" && icon}
    </button>
  );
});

Button.displayName = "Button";
