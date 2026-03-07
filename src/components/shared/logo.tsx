import Image from "next/image";
import { cn } from "@/lib/utils";

interface LogoProps {
  variant?: "dark" | "light" | "mono";
  size?: "sm" | "md" | "lg";
  showTagline?: boolean;
  className?: string;
}

const SIZES = {
  sm: { w: 88,  h: 30 },
  md: { w: 120, h: 42 },
  lg: { w: 168, h: 58 },
};

export function Logo({ variant = "dark", size = "md", showTagline = false, className }: LogoProps) {
  const s = SIZES[size];

  return (
    <div className={cn("flex flex-col gap-0.5", className)}>
      {/* Use the e-BGX image logo — place file at /public/logo.png */}
      <Image
        src="/logo.png"
        alt="e-BGX – A Bank Guarantee Marketplace"
        width={s.w}
        height={s.h}
        className={cn(
          "object-contain object-left",
          // On dark sidebar (black bg) the white-on-dark logo works perfectly.
          // On light backgrounds apply invert so white logo becomes dark.
          variant === "dark" || variant === "mono" ? "invert" : ""
        )}
        priority
      />
      {showTagline && (
        <p className={cn(
          "font-medium tracking-widest uppercase",
          size === "sm"  ? "text-[9px]"  : size === "md" ? "text-[10px]" : "text-xs",
          variant === "light" ? "text-white/40" : "text-gray-400"
        )}>
          A Bank Guarantee Marketplace
        </p>
      )}
    </div>
  );
}
