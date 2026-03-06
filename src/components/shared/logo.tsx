import { cn } from "@/lib/utils";

interface LogoProps {
  variant?: "dark" | "light" | "mono";
  size?: "sm" | "md" | "lg";
  showTagline?: boolean;
  className?: string;
}

export function Logo({ variant = "dark", size = "md", showTagline = false, className }: LogoProps) {
  const sizes = {
    sm: { text: "text-lg", tagline: "text-[9px]", gap: "gap-0" },
    md: { text: "text-2xl", tagline: "text-[10px]", gap: "gap-0.5" },
    lg: { text: "text-4xl", tagline: "text-xs", gap: "gap-1" },
  };

  const colors = {
    dark:  { primary: "text-navy-900 dark:text-white", accent: "from-silver-400 to-white" },
    light: { primary: "text-white", accent: "from-silver-300 to-white" },
    mono:  { primary: "text-gray-900", accent: "from-gray-400 to-gray-600" },
  };

  return (
    <div className={cn("flex flex-col", sizes[size].gap, className)}>
      <div className={cn("font-bold tracking-tight flex items-center", sizes[size].text, colors[variant].primary)}>
        <span>e-BG</span>
        <span className={cn("bg-gradient-to-br bg-clip-text text-transparent", colors[variant].accent)}>
          X
        </span>
      </div>
      {showTagline && (
        <p className={cn("font-medium tracking-widest uppercase", sizes[size].tagline, variant === "light" ? "text-silver-400" : "text-gray-400")}>
          A Bank Guarantee Marketplace
        </p>
      )}
    </div>
  );
}
