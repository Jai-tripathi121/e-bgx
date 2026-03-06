import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "@/lib/auth-context";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    template: "%s | e-BGX",
    default: "e-BGX – A Bank Guarantee Marketplace",
  },
  description: "India's first digital Bank Guarantee Exchange. Apply for BGs, compare competitive bank offers, and get guaranteed in days — not weeks.",
  keywords: ["bank guarantee", "BG marketplace", "India", "digital BG", "e-BGX", "bank guarantee exchange"],
  authors: [{ name: "e-BGX Platform" }],
  openGraph: {
    title: "e-BGX – A Bank Guarantee Marketplace",
    description: "Apply for Bank Guarantees, compare competitive offers from partner banks, and get issued in days.",
    type: "website",
    url: "https://e-bgx.com",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="antialiased">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <AuthProvider>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              className: "!bg-white dark:!bg-navy-800 !text-gray-900 dark:!text-white !shadow-xl !rounded-xl !border !border-gray-200 dark:!border-navy-700",
              duration: 4000,
            }}
          />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
