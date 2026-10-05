# COMERSEM — Catálogo de Refrigeración Comercial

## Problem statement
Pixel-close responsive clone of https://www.comersem.com.mx/ (Spanish-language commercial refrigeration catalog), extended into a working full-stack app: real catalog database, server-side quote requests emailed to sales, product search/filters, and an admin panel.

## Architecture
- Frontend: React (CRA) + react-router + @tanstack/react-query + shadcn/ui + sonner. Routes: `/` (hero/3D carousel), `/buscar` (search), `/admin/login`, `/admin`.
- Backend: FastAPI (`/app/backend/server.py`) + Motor/MongoDB. Modules: `auth.py` (bcrypt + PyJWT, admin seed, lockout), `catalog.py` (seed from `data/catalog.json`, `enrich()` → `capacity_ft3`, `temp_min_c`, `temp_max_c`), `emailer.py` (Emergent email proxy + guardrail gate), `storage.py` (Emergent object storage).
- Collections: `categories`, `products`, `quotes`, `users`, `files`.

## API (all under /api)
- `GET /catalog`, `GET /categories`, `GET /products/popular?limit`, `GET /products?q&category&min_ft3&max_ft3&temp=refrigeracion|congelacion&disponible`, `GET /products/{id}`
- `POST /quotes` {customer{nombre,email,telefono,empresa,mensaje}, items[{product_id,qty}]} → saves + emails SALES_EMAIL, returns folio `COT-YYMMDD-XXXX`
- `POST /auth/login` → {token,user} (+httpOnly cookie), `GET /auth/me`, `POST /auth/logout`
- Admin (Bearer): `GET/POST /admin/products`, `PUT/DELETE /admin/products/{id}`, `POST /admin/upload` (image ≤8MB → `/api/files/{path}`), `GET /admin/quotes`, `PATCH /admin/quotes/{id}` {status: nueva|atendida|cerrada}
- Public: `GET /files/{path}` serves uploaded images.

## Env (backend/.env)
MONGO_URL, DB_NAME, CORS_ORIGINS, JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD, EMERGENT_EMAIL_KEY, EMAIL_FROM_NAME=COMERSEM, SALES_EMAIL=ventas@comersem.com.mx, EMERGENT_LLM_KEY (object storage).

## Implemented
- 2026-06 (fork 1): Frontend clone — navbar, category themes, 3D carousel, product modal, quote drawer (localStorage), footer, snow overlay.
- 2026-06 (fork 2): Backend catalog + seed (43 products / 5 categories); quote requests saved + emailed; search page with model/category/capacity/temperature filters; admin panel (JWT login, product CRUD, photo upload to object storage, quotes inbox with status). Tested: 33/33 backend pytest + all frontend flows (test_reports/iteration_1.json).

## Design palette (applied 2026-06)
#0B2A4A navy (footer, headings, admin bg) · #3E6A8A steel (accents/links, "sky" scale) · #DCEBF5 ice (backgrounds) · #2B3138 charcoal (text, "slate" scale) · #2E7D5B forest (CTA buttons, "emerald" scale). Tailwind `sky`/`emerald`/`slate` scales are overridden in tailwind.config.js; category themes (accent/grad/glow) in DB + backend/data/catalog.json use palette tones only.

- 2026-06: Customer confirmation email (branded copy with folio + equipment list) sent on quote submit; `customer_email_sent` flag shown in admin; per-email rate limit 5 quotes/hour.

- 2026-06: "Más cotizados" strip on home (GET /api/products/popular aggregates quotes.items; falls back to featured products when no quotes yet).

- 2026-06: Quote Reply — POST /api/admin/quotes/{id}/reply {prices[{product_id,unit_price}], shipping, include_iva, validity_days, notes} computes subtotal/IVA 16%/total, emails branded price quote to customer, stores `reply` on quote, sets status atendida. Admin dialog with live totals; row shows total badge + per-line prices. Email failures return 424 (502 is swallowed by ingress).

- 2026-06: Security audit fixes — Bearer-only auth (cookies removed), CORS restricted to CORS_ORIGINS (frontend origin, no credentials), Mongo-backed login lockout per ip:email with TTL (uses first X-Forwarded-For → deployment must sit behind a trusted proxy), first-run-only admin seed, quote abuse limits per email/IP/global with indexes. Verified by testing agent (iteration_2: 18/18 security tests + UI regression).

- 2026-06: "Más cotizados" strip is hidden by default; shown only via the new "Más cotizados" nav link (`nav-popular-btn` desktop / `nav-popular-mobile-btn`) which sets `?popular=1` and scrolls to the strip; strip has an "Ocultar" button (`popular-close-btn`). Screenshot-verified desktop + mobile.
- 2026-06: Code-review remediation — tests read ADMIN_EMAIL/ADMIN_PASSWORD from backend/.env (dotenv); console.warn in catch blocks; stable React keys (ProductForm specs via `specRow`, SnowOverlay flake ids); QuoteContext restores saved quote via lazy `useState(loadSaved)` (fixed StrictMode wipe found by testing agent iteration_4). Intentionally NOT changed: `is None` comparisons (correct Python), Bearer token in localStorage (deliberate — cookie auth removed in security audit to avoid CSRF), module-constant hook deps (not real deps), complexity refactors (no behavior need).
- 2026-06: Responsive/mobile-first pass — search filters 1/2/12-col grid (sm/xl), footer 1→2→4 columns with nowrap badges, mobile category row with right fade hint, product modal fits 92vh on mobile, admin header wraps (tabs on 2nd row <md) with logo, product table `table-fixed` <lg with availability badge inline on mobile, quote contact lines stacked. `resolveImg` returns undefined for empty src. Verified by testing agent iteration_3 (all viewports pass).
- 2026-06: Logo replaced with user-provided image, self-hosted at frontend/public/logo.png (`COMPANY.logo = "/logo.png"`); used in navbar, footer and admin login.
- 2026-06: Footer brand text replaced by logo image rendered white/monochrome via CSS `brightness-0 invert` (`footer-logo`).
- 2026-06: Admin pagination — GET /api/admin/products?page&page_size(≤100)&q&category and GET /api/admin/quotes?page&page_size&status now return `{items,total,page,page_size,pages}` (+`new_count` on quotes). Admin UI: 20 per page with Pagination component (`admin-products-pagination-*`, `admin-quotes-pagination-*`), product search box (debounced) + category select, quote status filter chips. Tests updated (backend_test.py, test_security.py). Note: `test_login_success_token_no_cookie` now ignores Cloudflare `__cf_bm` edge cookie.
- 2026-06: Footer — quick links are real routes (Inicio, Buscar equipos, Más cotizados); categories rendered from the live catalog (Metal Frío removed); phone updated to +52 33 1902 5608 in mock.js (footer, WhatsApp) and server.py COMPANY (emails).
- 2026-06: Navbar "Buscar" is a toggle: opens /buscar, and when already on /buscar it returns to home (`aria-pressed`).
- 2026-06: Browser tab title set to "Comersem" (public/index.html) + Spanish meta description.
- 2026-06: Navbar category tabs (desktop + mobile) all use the Horizontales navy `#0B2A4A` (`NAV_ACCENT`) for active background and inactive icon color; hero/cards keep per-category accents.
- 2026-06: Navbar — removed "Solicitar Cotización" button; "Cotización (n)" (`nav-quote-btn`) now uses the green forest gradient and opens the quote drawer.
- 2026-06: "Más cotizados" link removed from navbar; now lives on /buscar at the right of the "Encuentra tu equipo ideal" title (`search-popular-link` → `/?popular=1`).
- 2026-06: "Promociones" category tab moved out of the desktop nav tabs into a standalone pill at the right, directly below the navbar (`nav-cat-promociones`); still in the scrollable mobile category row.
- 2026-06: Navbar — logo is now the sole home button (separate "Inicio" pill removed) as a pill (`data-testid="nav-home-logo-btn"`, Navbar.jsx). Screenshot-verified desktop + 390px.


## Backlog
- P1: explicit CORS origin for production cookie auth; category management in admin.
- P2: PDF export of quotes; note: Emergent email proxy rate-limits bursts (429) — consider queue/retry if volume grows; 
