# e-BGX Platform — Project Memory

## Overview
**e-BGX.COM** — India's first Bank Guarantee (BG) marketplace.
Stack: **Next.js 14 App Router · TypeScript · Tailwind CSS · Firebase · Recharts**

## Project Structure
```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx         # Login — all 3 portals (Applicant/Bank/Admin)
│   │   └── register/page.tsx      # Registration — Applicant + Bank, 2-step
│   ├── (marketing)/
│   │   └── page.tsx               # Landing page (/)
│   ├── applicant/
│   │   ├── layout.tsx             # Sidebar layout (portal="applicant")
│   │   ├── page.tsx               # redirect → /applicant/dashboard
│   │   ├── dashboard/page.tsx     # KPI cards + Charts + Activity feed
│   │   ├── apply/page.tsx         # Multi-step BG application wizard
│   │   ├── offers/page.tsx        # Offers inbox from banks
│   │   ├── active-bgs/page.tsx    # Live BG table
│   │   ├── track/page.tsx         # BG timeline tracker
│   │   ├── issued-bgs/page.tsx    # Completed BG vault
│   │   ├── payments/page.tsx      # Fee payment history
│   │   ├── renewals/page.tsx      # Expiry + renewal pipeline
│   │   ├── notifications/page.tsx # Notification center
│   │   └── profile/page.tsx       # Company KYC + documents
│   ├── bank/
│   │   ├── layout.tsx             # Sidebar layout (portal="bank")
│   │   ├── page.tsx               # redirect → /bank/dashboard
│   │   ├── dashboard/page.tsx     # Bank KPIs + market feed
│   │   ├── requests/page.tsx      # Incoming BG requests
│   │   ├── offers/page.tsx        # Make/manage offers
│   │   ├── issuance/page.tsx      # BG issuance workflow
│   │   ├── analytics/page.tsx     # Revenue, volume, sector charts
│   │   └── profile/page.tsx       # Bank institution settings
│   ├── admin/
│   │   ├── layout.tsx             # Sidebar layout (portal="admin")
│   │   ├── page.tsx               # redirect → /admin/dashboard
│   │   ├── dashboard/page.tsx     # Platform command centre
│   │   ├── banks/page.tsx         # Bank onboarding + management
│   │   ├── applicants/page.tsx    # KYC queue + BG pipeline
│   │   └── settings/page.tsx      # Platform config + gateway + API keys
│   ├── layout.tsx                 # Root layout (fonts, dark-mode class)
│   └── globals.css                # Tailwind base styles
├── components/
│   ├── charts/
│   │   └── applicant-charts.tsx   # ApplicantPortfolioChart, ApplicantBeneficiaryChart
│   ├── shared/
│   │   ├── logo.tsx               # e-BGX logo component
│   │   ├── sidebar.tsx            # PortalSidebar — used by all 3 portals
│   │   └── portal-header.tsx      # Sticky top header
│   └── ui/
│       ├── badge.tsx              # Status badge (custom, NOT @radix-ui/react-badge)
│       ├── button.tsx             # Button variants + loading state
│       ├── card.tsx               # Card, CardHeader, CardContent, CardTitle
│       ├── input.tsx              # Input with label, icon, hint, suffix
│       └── table.tsx              # Responsive table primitives
├── lib/
│   ├── firebase.ts                # Firebase singleton (Auth + Firestore + Storage)
│   ├── mock-data.ts               # mockBGApplications, mockBanks, mockBankAnalytics, mockMarketFeed
│   ├── types.ts                   # All TypeScript types
│   └── utils.ts                   # cn() helper + formatCurrency / formatDate
```

## Key TypeScript Types (`src/lib/types.ts`)

### BGApplication
```ts
{
  id, applicant_id, applicant_name, applicant_pan,
  bg_type: "PERFORMANCE" | "FINANCIAL" | "ADVANCE_PAYMENT" | "BID_BOND" | "CUSTOMS",
  amount, currency, beneficiary_name, beneficiary_type,
  purpose, validity_months, project_name,
  status: "DRAFT"|"SUBMITTED"|"UNDER_REVIEW"|"OFFERS_RECEIVED"|"OFFER_ACCEPTED"|"UNDER_ISSUANCE"|"ISSUED"|"EXPIRED"|"CANCELLED",
  created_at, updated_at, submitted_at,
  offers: BGOffer[], issued_bg?: IssuedBG, documents: BGDocument[]
}
```

### BankAnalytics (used in bank/analytics/page.tsx)
```ts
{
  bank_id, period,
  total_revenue,          // ← NOT total_revenue_ytd
  bgs_issued,             // ← NOT bgs_issued_ytd
  active_portfolio,       // ← NOT active_portfolio_inr
  avg_tat,                // ← NOT avg_tat_days
  offer_acceptance_rate,  // ← NOT acceptance_rate
  avg_bg_size,            // ← NOT avg_ticket_size_inr
  repeat_customers, customer_satisfaction,
  monthly_trend: { month, count, revenue }[],   // count NOT bgs_issued; revenue in rupees
  sector_distribution: { sector, amount }[]      // no percentage field — must compute
}
```

### BankPartner (used in admin/banks/page.tsx)
```ts
{
  bank_id, bank_name, branch_code,  // ← NOT ifsc_code
  address, branch_email,             // ← NOT contact_email
  officer_email, officer_name, officer_designation, officer_mobile,
  status: "ACTIVE"|"PENDING"|"SUSPENDED",
  member_since                       // ← NOT joined_at
  // No: bgs_issued_count, win_rate, bg_types_offered, branch_name, active_bgs_count
}
```

## Important Implementation Notes

### ⚠️ Recharts Hydration Fix
Recharts generates different `id` attributes (`recharts1-clip` vs `recharts2-clip`) server vs client.
**Fix**: Guard all charts with a `mounted` state:
```tsx
const [mounted, setMounted] = useState(false);
useEffect(() => setMounted(true), []);
if (!mounted) return <SkeletonCard />;
// then render charts normally
```
Applied in: `applicant-charts.tsx`, `bank/analytics/page.tsx`, `admin/dashboard/page.tsx`

### ⚠️ useSearchParams Suspense Requirement (Next.js 14)
`useSearchParams()` must be used inside a `<Suspense>` boundary in Next.js 14 app router.
**Pattern**: Extract page content into an inner component, wrap in `<Suspense>` in the default export.
Applied in: `(auth)/login/page.tsx`, `(auth)/register/page.tsx`

### ⚠️ next.config — Use `.mjs` not `.ts`
Next.js 14.2.x does NOT support `next.config.ts`. Use `next.config.mjs` with ESM syntax.

### ⚠️ ESLint version
`eslint-config-next@14.2.29` requires `eslint@^7 || ^8`.
Use `eslint@^8.57.0` — NOT v9.

### ⚠️ npm install
Always use `npm install --legacy-peer-deps` due to peer dependency conflicts.

### ⚠️ @radix-ui/react-badge does NOT exist
Do not add `@radix-ui/react-badge` — the package doesn't exist. Use the custom `badge.tsx` component.

### ⚠️ Tailwind custom classes in use
- `bg-gradient-navy` — custom gradient defined in tailwind.config
- `text-silver-300`, `text-navy-*` — custom color scale
- `portal-content` — class on the scrollable main content div (used for JS scroll queries)
- Do NOT use `border-border` — was removed from globals.css (shadcn/ui leftover)

## Dev Server
```bash
npm run dev   # starts at http://localhost:3000
# Must use --legacy-peer-deps for npm install
```
Launch config: `.claude/launch.json` → "e-BGX Dev Server" on port 3000

## Mock Data (`src/lib/mock-data.ts`)
- `mockBGApplications` — 3 sample BG applications with full offer/document data
- `mockBanks` — array of `BankPartner` objects
- `mockBankAnalytics` — `BankAnalytics` object for the logged-in bank
- `mockMarketFeed` — live market feed items for bank dashboard

## Portal Routing
| URL | Portal | Auth |
|-----|--------|------|
| `/` | Marketing landing | Public |
| `/login?portal=applicant\|bank\|admin` | Auth | Public |
| `/register?portal=applicant\|bank` | Auth | Public |
| `/applicant/*` | Applicant Portal | Applicant |
| `/bank/*` | Bank Portal | Bank officer |
| `/admin/*` | Admin Panel | e-BGX staff |

## Sidebar Navigation (`src/components/shared/sidebar.tsx`)
`PortalSidebar` accepts `portal: "applicant" | "bank" | "admin"` prop.
Nav items are defined internally per portal. Active item highlighted via `usePathname()`.

## Firebase (`src/lib/firebase.ts`)
Singleton pattern — exports `auth`, `db`, `storage`.
Config pulled from `NEXT_PUBLIC_FIREBASE_*` env vars.
Real auth/Firestore calls are TODO — all pages currently use mock data.

## Completed Features
- [x] Landing page with hero, features, how-it-works, CTA
- [x] Login + Register (Applicant / Bank portals)
- [x] Applicant Portal: 9 pages (dashboard, apply, offers, active-bgs, track, issued-bgs, payments, renewals, notifications, profile)
- [x] Bank Portal: 6 pages (dashboard, requests, offers, issuance, analytics, profile)
- [x] Admin Portal: 5 pages (dashboard, banks, applicants, settings) + layout

## TODO / Next Steps
- [ ] Wire up Firebase Auth (replace setTimeout mocks)
- [ ] Wire up Firestore for real BG application CRUD
- [ ] Implement Razorpay payment flow in applicant/payments
- [ ] Add Firebase Storage for document upload in applicant/profile
- [ ] Add route guards (middleware.ts) to protect portal routes
- [ ] Add API routes for bank offer submission
- [ ] Production deployment (Vercel)
- [ ] Admin portal: reports/export page
- [ ] Notifications: real-time Firestore listener
