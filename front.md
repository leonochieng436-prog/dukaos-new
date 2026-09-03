# DukaOS Front Page

The public front page lives at the application root (`/`). Signed-out visitors see the marketing page; authenticated visitors continue to be redirected to `/dashboard`.

## Run locally

From the repository root:

```powershell
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in a browser. Use **Get started** or **Start your workspace** to open `/register`, or **Log in** to open `/login`.

## Validate a production build

```powershell
npm run lint
npm run build
```

The landing page is implemented in `src/components/landing-page.tsx`. The root route checks the current session in `src/app/page.tsx`, so no authentication or dashboard routes need to be changed to use the new front page.

## Content and pricing

The page uses DukaOS capabilities already present in the application: POS, inventory, purchases, customers, suppliers, branches, roles, reports, and customer credit. Pricing is intentionally described by package maturity rather than hardcoded KES amounts because the repository does not currently define public subscription prices. Update the `plans` data in `src/components/landing-page.tsx` when approved prices are available.