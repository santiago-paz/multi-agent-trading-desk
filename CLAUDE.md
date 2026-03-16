# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start development server
npm run build     # Production build
npm run start     # Production server
npm run lint      # Run ESLint
```

No test runner is configured.

## Architecture

This is a **Win98-themed AI hedge fund dashboard** for trading CEDEARs (Argentine depository receipts for international stocks like AAPL, KO, TSLA) via the InvertirOnline (IOL) broker API.

### App Structure

- **`/`** — Landing page with "Enter Dashboard" button
- **`/trading`** — Main Win98-style desktop environment with draggable windows

The trading page is a large client component (`src/app/trading/page.tsx`) that coordinates window visibility, data fetching, and AI analysis. Heavy logic lives in server actions (`src/app/trading/actions.ts`).

### AI Agent Pipeline

Three agents run sequentially via `runAnalysis()` in `actions.ts`:

1. **Analyst** (`src/lib/agents/analyst.ts`) — Technical analysis per symbol (trend, score, reasoning)
2. **Sentinel** (`src/lib/agents/sentinel.ts`) — Risk scoring & news sentiment
3. **Strategist** (`src/lib/agents/strategist.ts`) — Portfolio allocation decisions → passed to trading engine

All agents call `generateText()` from Vercel AI SDK, parse JSON responses, and have error fallbacks. The **Advisor** (`src/lib/agents/advisor.ts`) is separate — triggered on demand for buy/sell recommendations with budget constraints.

The LLM is `meta-llama/llama-3.3-70b-instruct` via Fireworks (configured in `src/lib/llm.ts`).

### Trading Flow

```
runAnalysis() → Analyst → Sentinel → Strategist
                                         ↓
                              trading engine (order generation)
                                         ↓
                              user reviews orders in UI
                                         ↓
                              executeOrders() → IOL API
```

### IOL Client (`src/lib/iol/client.ts`) — see [`docs/iol-api.md`](docs/iol-api.md) for full API reference

Broker API integration with:
- Token caching to `.iol_token_cache.json` on disk
- Auto-refresh 60s before expiry, fallback to username/password
- `SIMULATION_MODE` env var skips actual order placement

### Market Data (`src/lib/market-data.ts`)

- Yahoo Finance (`yahoo-finance2`) for quotes and 7-day historical OHLC
- Puppeteer + `@mozilla/readability` for enriching news articles with full content
- CEDEAR ratios are hardcoded (e.g., 10 AAPL shares = 1 US share)
- MEP rate (ARS/USD) fetched separately, polled every 10 minutes

### State Management

- **Zustand** stores for news (`src/lib/store/news-store.ts`, persisted to localStorage) and MEP rate (`src/lib/store/mep-store.ts`)
- **`useWindowManager`** hook manages Win98 window positions, z-index, and minimize state
- Desktop icon positions saved to localStorage
- No Redux or Context API

### Required Environment Variables

```
IOL_USERNAME          # InvertirOnline broker login
IOL_PASSWORD
IOL_REFRESH_TOKEN
FIREWORKS_API_KEY     # LLM provider
BASIC_AUTH_USER       # Optional HTTP basic auth
BASIC_AUTH_PASSWORD
SIMULATION_MODE       # Set to skip real order execution
```

### Path Aliases

`@/*` maps to `./src/*` (configured in `tsconfig.json`).

## Win98 UI Guidelines

Every UI component must authentically replicate Windows 98/2000 aesthetics. These rules are non-negotiable for all interface work.

### Fonts
- **Win98:** MS Sans Serif, 8pt. **Win2000:** Tahoma, 8pt (preferred).
- No italics, no serif fonts. **Bold only** for title bars and default menu actions.
- **Title Caps** (every word): window titles, menu items, button labels, tab names, icon names.
- **Sentence caps** (first word only): checkboxes, radio buttons, field labels, status bar text, messages.
- Append `...` to commands that open a secondary dialog before executing (e.g. "Save As...").

### Colors & 3D Effect
- Never hardcode colors — use CSS variables that map to system colors (e.g. `--btn-face`, `--btn-highlight`, `--btn-shadow`).
- Light source comes from **top-left**. All 3D borders follow this rule.
- **Raised** (buttons, window chrome): top/left border = highlight (white), bottom/right = shadow (dark gray).
- **Sunken** (inputs, active areas): top/left = shadow, bottom/right = highlight.
- **Flat** (toolbar buttons at rest): no border until hover → raised; click → sunken.

### Layout & Spacing
- Window/dialog margins: **7 DLUs** from edge to nearest control.
- Unrelated controls: **7 DLUs** apart. Related controls: **4 DLUs**. Label → control: **3 DLUs**.
- Standard button size: **50 × 14 DLUs** (width can grow for long labels; height stays fixed).

### Controls & States
- **Button pressed:** border flips to sunken, content shifts **1px down-right**.
- **Button focused:** thin dotted rectangle around label text.
- **Disabled:** gray text with inverted white emboss behind it.
- **Toolbar buttons:** flat at rest; raised on hover; sunken on click.
- **Checkboxes / radio buttons:** use sunken "field" border style.

### Dialogs
- Action buttons (OK/Cancel) align to **bottom-right** (horizontal) or **top-right** (vertical column).
- Order is always: OK first, then Cancel.
- Tab order follows visual flow: left-to-right, top-to-bottom.
- ESC always closes without saving (equivalent to Cancel).

### Iconography
- Sizes: **16×16** (menus, title bars), **32×32** (desktop/large icon view), **48×48** (optional splash).
- Provide 16-color and 256-color variants. Use real-world metaphors for icon concepts.

### Tables (ListView) — Reference: `PortfolioSummary`
All data tables in the app must follow the pattern established in `src/components/ui/PortfolioSummary.tsx`. These rules are mandatory for every table.

**Structure:**
- Wrap the table in a `<fieldset>` with a `<legend>` (e.g., `"Tenencia (12 títulos)"`).
- Inside the fieldset, use `<div className="sunken-panel win98-scrollbar">` as the scrollable container — never apply `boxShadow` manually for the inset border.

**Column Headers:**
- Import and use `COL_HEADER_BASE`, `COL_RAISED`, `COL_SUNKEN` from `@/lib/theme/win98`.
- **Inactive** (non-sorted) headers: `{ ...COL_HEADER_BASE, ...COL_RAISED }`.
- **Active** (currently sorted) header: `{ ...COL_HEADER_BASE, ...COL_SUNKEN }` — border inverts to show "pressed".
- Sortable headers show `▲` / `▼` suffix next to the label.
- Headers must be `position: sticky; top: 0; zIndex: 1` so they stay visible while scrolling.

**Cells:**
- Import and use `CELL` (left-aligned) and `CELL_RIGHT` (right-aligned) from `@/lib/theme/win98`.
- Never hardcode `padding`, `fontSize`, or `fontFamily` on individual cells — the theme constants handle this.
- Last cell in a row should have `borderRight: 'none'` to avoid a double border.

**Rows:**
- Alternating row background: even rows `#ffffff`, odd rows `#f0f0f0`.
- Each row: `borderBottom: '1px solid #c0c0c0'`.
- `cursor: 'default'` on rows (no pointer unless the row is clickable).

**Semantic coloring:**
- Positive values (gains, up % change): `color: '#008000'` (dark green).
- Negative values (losses, down % change): `color: '#800000'` (dark red).
- Prefix positive values with `+` explicitly.

**Refresh button:**
- Always placed at **bottom-right**, outside the scrollable area, in a `flexShrink: 0` container with `borderTop: '1px solid #808080'` separator.

**Status bar:**
- Use `<div className="status-bar">` with `<p className="status-bar-field">` children.
- Apply `{ ...FONT, flexShrink: 0, margin: 0 }` on the status-bar div.
- Display item count and any relevant summary metrics.

**Font / general:**
- Apply `FONT` from `@/lib/theme/win98` to the table element — never hardcode `fontFamily`/`fontSize`.
- `borderCollapse: 'collapse'`, `borderSpacing: 0` on all tables.
