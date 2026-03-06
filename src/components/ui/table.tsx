import { cn } from "@/lib/utils";

interface TableProps {
  children: React.ReactNode;
  className?: string;
}

export function Table({ children, className }: TableProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-navy-700">
      <table className={cn("w-full text-sm", className)}>
        {children}
      </table>
    </div>
  );
}

export function TableHead({ children }: { children: React.ReactNode }) {
  return (
    <thead className="bg-gray-50 dark:bg-navy-800/60">
      {children}
    </thead>
  );
}

export function TableBody({ children }: { children: React.ReactNode }) {
  return (
    <tbody className="divide-y divide-gray-100 dark:divide-navy-800 bg-white dark:bg-navy-900">
      {children}
    </tbody>
  );
}

export function TableRow({ children, onClick, className }: { children: React.ReactNode; onClick?: () => void; className?: string }) {
  return (
    <tr
      onClick={onClick}
      className={cn(
        "transition-colors duration-100",
        onClick ? "cursor-pointer hover:bg-gray-50 dark:hover:bg-navy-800/50" : "hover:bg-gray-50/50 dark:hover:bg-navy-800/30",
        className,
      )}
    >
      {children}
    </tr>
  );
}

export function TableHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={cn("px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap", className)}>
      {children}
    </th>
  );
}

export function TableCell({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <td className={cn("px-4 py-3.5 text-gray-700 dark:text-gray-300 whitespace-nowrap", className)}>
      {children}
    </td>
  );
}

export function TableEmpty({ message = "No data available", icon }: { message?: string; icon?: React.ReactNode }) {
  return (
    <tr>
      <td colSpan={100} className="py-16 text-center">
        <div className="flex flex-col items-center gap-3 text-gray-400">
          {icon && <div className="w-12 h-12 text-gray-300">{icon}</div>}
          <p className="text-sm">{message}</p>
        </div>
      </td>
    </tr>
  );
}
