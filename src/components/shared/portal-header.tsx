"use client";
import { Bell, Search, Moon, Sun, ChevronDown } from "lucide-react";
import { useTheme } from "next-themes";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface PortalHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function PortalHeader({ title, subtitle, actions }: PortalHeaderProps) {
  const { theme, setTheme } = useTheme();
  const [showNotifs, setShowNotifs] = useState(false);

  return (
    <header className="sticky top-0 z-20 bg-white/95 dark:bg-black/95 backdrop-blur-md border-b border-gray-100 dark:border-white/8 px-6 py-3.5 flex items-center justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white truncate">{title}</h1>
        {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {actions}

        {/* Search */}
        <button className="p-2 rounded-lg text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/8 transition-all">
          <Search size={16} />
        </button>

        {/* Theme toggle */}
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="p-2 rounded-lg text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/8 transition-all"
        >
          {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifs(!showNotifs)}
            className="p-2 rounded-lg text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/8 transition-all relative"
          >
            <Bell size={16} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
          </button>

          {showNotifs && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-gray-950 rounded-xl border border-gray-200 dark:border-white/10 shadow-xl z-50">
              <div className="px-4 py-3 border-b border-gray-100 dark:border-white/8">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">Notifications</p>
              </div>
              <div className="py-2">
                {[
                  { text: "Draft BG generated for BG-6935", time: "2h ago", dot: "bg-blue-500" },
                  { text: "FD verified by Canara Bank", time: "5h ago", dot: "bg-green-500" },
                  { text: "New offer received for BG-5512", time: "1d ago", dot: "bg-amber-500" },
                ].map((n, i) => (
                  <div key={i} className="px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-white/8 flex gap-3 cursor-pointer">
                    <div className={cn("w-2 h-2 rounded-full mt-1.5 shrink-0", n.dot)} />
                    <div>
                      <p className="text-sm text-gray-700 dark:text-gray-300">{n.text}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{n.time}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-4 py-2.5 border-t border-gray-100 dark:border-white/8">
                <button className="text-xs text-gray-600 dark:text-gray-300 font-medium hover:underline">View all</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
