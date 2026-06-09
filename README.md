# Coldcast Dashboard

React + Vite front-end for the Coldcast multi-product platform. It's a **separate
app** from the API server (`contacout_lusha_salesql_multiuser`) and talks to it
over HTTP using a Bearer token — so it can be hosted independently (Vercel /
Netlify / any static host).

## Stack
- **React 18** + **Vite 6** (plain JSX, no TypeScript)
- **Tailwind CSS v4** (via `@tailwindcss/vite` — no `tailwind.config.js`; theme
  tokens live in `src/index.css` under `@theme`)
- Zero routing dependency — a tiny hash router (`src/lib/useHashRoute.js`)

## Getting started
```bash
npm install
cp .env.example .env      # then set VITE_API_URL
npm run dev               # http://localhost:5180
```

### Environment
| Var | Purpose |
|-----|---------|
| `VITE_API_URL` | Base URL of the API server (e.g. `http://localhost:3003` in dev, your deployed host in prod). |
| `VITE_EXT_DOWNLOAD_URL` | Optional hosted `.zip` link for the Chrome extension. Blank → the "Get extension" button is disabled. |

> The API server must allow the `Authorization` header in CORS
> (`Access-Control-Allow-Headers`). That change ships in `routes/router.js` on the
> server side.

## Project structure
```
src/
  App.jsx                 # boot + auth gate (token → /api/auth/me) + login/logout
  components/
    Dashboard.jsx         # shell: Topbar + StatsBox + ProductNav + active page
    Topbar.jsx            # logo + account menu (Settings / API key / Sign out)
    ProductNav.jsx        # horizontal product tabs (accent underline, "Soon" badges)
    StatsBox.jsx          # stats + connection status + Get extension + API key
    Modal.jsx             # generic modal
  store/
    AppStore.jsx          # shared state: me, jobs (SSE), profiles (poll), actions
    ToastProvider.jsx     # toast notifications
  lib/
    api.js                # the ONE place that knows the backend (URLs, token, SSE)
    products.js           # product registry (single source of truth for the nav)
    icons.jsx             # inline SVG icon set
    useHashRoute.js       # #/route hash router
  pages/
    Login.jsx
    ComingSoon.jsx        # used by every not-yet-live product
    Settings.jsx          # profiles (activate / delete / connection status)
    ApiKey.jsx
    salesnav/             # the only live product today
      SalesNav.jsx        # job grid + pagination + New Job bar
      JobCard.jsx
      NewJobModal.jsx
      LogsModal.jsx
```

## Adding a new product
1. Add an entry to `PRODUCTS` in `src/lib/products.js` (id, label, accent, icon, status).
2. While `status: 'soon'` it renders the shared `ComingSoon` page automatically.
3. When it's ready: set `status: 'live'`, create a page under `src/pages/<id>/`,
   and wire it into the router switch in `components/Dashboard.jsx`.

## Build
```bash
npm run build     # → dist/  (static; deploy anywhere)
npm run preview
```
