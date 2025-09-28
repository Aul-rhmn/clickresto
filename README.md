# Click Resto — Technical Test MVP

Public demo: deploy via Vercel Publish (landing: `/`, admin: `/admin`).

## Stack & Architecture
- Frontend: Next.js (App Router, shadcn/ui). Simple, clean, responsive.
- Database: Supabase (tables: `products`, `orders`, `order_items`). RLS: `products` readable by anon; orders/items server-only.
- Orchestration: n8n handles AI extraction using LangChain (image -> name/description/price).
- Payments: Midtrans Sandbox (Snap). App creates transaction and handles callback to confirm order.
- Builder Tool: v0 used for fast build.

## Environment Variables
Add these in Project Settings:
- SUPABASE_URL, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_ANON_KEY, NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY (server-only)
- MIDTRANS_SERVER_KEY (server-only, sandbox)
- NEXT_PUBLIC_BASE_URL (optional, your public base URL)
- N8N_WEBHOOK_URL (points to your n8n workflow)

## n8n Workflow (Summary)
1. Webhook (POST) receives `{ image_url }`.
2. Fetch Image -> LangChain (e.g., vision model or OCR + LLM) extracts `{ name, description, price }`.
3. Return JSON to caller. App route `/api/admin/upload` uploads image -> calls webhook -> inserts product.

## Payment Flow
- Client posts cart to `/api/checkout`.
- Server creates pending `orders` + `order_items`, calls Midtrans Snap API, returns `redirect_url`.
- User pays. Midtrans calls `/api/midtrans/callback`.
- Callback verifies signature, updates `orders.status` to `paid/failed/pending`.

## SQL
Run `scripts/001_create_tables.sql` to create schema and policies. Ensure a public Storage bucket `products` exists (the API also auto-creates if missing).

## Notes
- Prices stored in cents. Displayed as `Rp (price/100)`.
- Admin login is optional per brief; page `/admin` is open for MVP.
- Cart uses SWR + localStorage for simple global sync.
