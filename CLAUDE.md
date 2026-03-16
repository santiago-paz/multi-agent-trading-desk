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

### 1. Typography and Capitalization
- **System fonts:** Win98 → MS Sans Serif 8pt; Win2000 → Tahoma 8pt (preferred). No italic, no serif.
- **Title bar text:** bold (e.g. Tahoma 8pt bold).
- **Standard text:** menus, status bars, dialog text, control labels → regular 8pt system font.
- **Title Caps** (first letter of every major word, ignoring articles and prepositions of 4 letters or fewer): column headings, command buttons, icon labels, menu names, tabs, window titles.
- **Sentence caps** (first word + proper nouns only, no final punctuation unless a full instruction): checkbox labels, group box labels, list box entries, messages, radio button labels, text box labels, status bar text.
- Append `...` to commands that open a secondary dialog before executing (e.g. "Save As...", "Print..."). Do **not** append `...` to direct-action commands or view toggles (e.g. "Properties", "About", "Options").
- Always use `FONT` from `@/lib/theme/win98` — never hardcode `fontFamily` or `fontSize`.

### 2. Layout, Margins, and Dialog Units (DLUs)
- 1 horizontal DLU = 1/4 average character width of system font; 1 vertical DLU = 1/8 average character height.
- Window/dialog outer margins: **7 DLUs** from all edges.
- Between **unrelated** controls: **7 DLUs**. Between **related** controls: **4 DLUs**. Label → control: **3 DLUs**. Minimum between any controls: **2 DLUs**.
- Standard control heights: command buttons **14 DLUs**; text boxes and combo boxes **14 DLUs**; radio buttons and checkboxes **10 DLUs**.
- Standard button width: **50 DLUs** base (can grow for long labels; height always fixed at 14 DLUs).
- **Group box internals:** first control starts **11 DLUs** below the top edge (below the legend); last control leaves **7 DLUs** of bottom margin. Controls inside align vertically with **4 DLUs** between them.
- Text fields: left-aligned. Numeric columns: right-aligned at the decimal point.

### 3. The 3D Shading Model (Borders and Edges)
Light source comes from **top-left**. Four system color roles: Button Face (light gray), Window Frame (black/dark gray), Button Highlight (white), Button Shadow (dark gray).

Four border primitives:
- **Raised Outer:** top/left = Button Face; bottom/right = Window Frame
- **Raised Inner:** top/left = Button Highlight; bottom/right = Button Shadow
- **Sunken Outer:** top/left = Button Shadow; bottom/right = Button Highlight
- **Sunken Inner:** top/left = Window Frame; bottom/right = Button Face

Component rules:
- **Window frames & scroll bars:** Raised Outer + Raised Inner
- **Buttons (up):** Raised Outer + Raised Inner. **Buttons (down/pressed):** Sunken Outer + Sunken Inner; text shifts **1px down-right**.
- **Text fields, list boxes, dropdowns:** Sunken Outer + Sunken Inner (the "field border"). Interior = white unless disabled/read-only → gray (Button Face).
- **Status bars:** Sunken Outer only.
- **Group boxes:** Sunken Outer + Raised Inner (engraved grouping line).
- Never hardcode colors — use CSS variables (`--btn-face`, `--btn-highlight`, `--btn-shadow`) or theme constants from `@/lib/theme/win98`.

### 4. UI Controls and States

**Buttons:**
- Default action button (activated by Enter): thick dark bold outline around it.
- OK/Cancel placement: bottom-right (horizontal) or top-right (vertical column). OK always first.
- **Disabled state:** draw label text in Button Highlight (white), then redraw the same text 1px down and 1px right in Button Shadow (dark gray) — this creates the embossed/engraved look.
- Toolbar buttons: **21×22px** (for 16×16 icons) or **26×28px** (for 20×20 icons). Flat at rest; 3D border appears on hover (hot-tracked); sunken on click. Leave **3px** between a toolbar button and its text label.

**Option buttons & checkboxes:**
- Height 10 DLUs. Radio buttons: circular with solid dot when set; completely empty circles for indeterminate/mixed group. Checkboxes: square with check mark when set.
- Both use "field border style" (Sunken Outer + Sunken Inner).
- Indeterminate checkbox: Button Shadow check mark over a checkerboard dither of Button Face + Button Highlight.

**Input focus:**
- Keyboard navigation draws a thin **dotted rectangle** outline just inside the control border, or around its text label.

**Tables (ListView):** see Tables section below.

### 5. Windows, Dialogs, and Menus

**Secondary windows (dialogs & property sheets):**
- Maximum size: **263 × 263 DLUs**. No Minimize or Maximize buttons — only Close (X). Optional **?** (What's This?) button for contextual help.
- Property sheets (tabbed dialogs): use a **single row of tabs** — stacked multi-row tabs cause usability problems and must be avoided.
- Global action buttons (OK, Cancel, Apply) must sit **outside** the tab area, aligned to the **bottom-right**.

**Access keys:**
- Every menu item and interactive control must have an **underlined access key** (unique within the window scope) reachable via Alt+key.

**Context menus (right-click / Shift+F10):**
- Order: primary commands (Open, Play…) → transfer commands (Cut, Copy, Paste) → secondary/view commands → **Properties always last**.
- Do **not** include keyboard shortcut annotations (Ctrl+C, etc.) in the visual text of context menus.

### 6. Iconography
- Sizes: **16×16** (menus/title bars), **32×32** (desktop/large view), **48×48** (optional splash).
- Provide 16-color and 256-color palette variants mapped to the standard Windows system palette.
- Shading: black edge on bottom/right, dark gray edge on top/left (upper-left light source) to simulate volume.
- Use real-world object metaphors. **Never** depict realistic humans, faces, gender, body parts, or embed explicit text inside icon graphics — this avoids cultural conflicts.

### Tables (ListView) — Reference: `PortfolioSummary`
All data tables must follow the pattern established in `src/components/ui/PortfolioSummary.tsx`. These rules are mandatory for every table.

**Structure:**
- Wrap the table in a `<fieldset>` with a `<legend>` (e.g., `"Tenencia (12 títulos)"`).
- Inside the fieldset, use `<div className="sunken-panel win98-scrollbar">` as the scrollable container — never apply `boxShadow` manually.

**Column Headers:**
- Import and use `COL_HEADER_BASE`, `COL_RAISED`, `COL_SUNKEN` from `@/lib/theme/win98`.
- **Inactive** (non-sorted): `{ ...COL_HEADER_BASE, ...COL_RAISED }`. **Active** (sorted): `{ ...COL_HEADER_BASE, ...COL_SUNKEN }`.
- Sortable headers show `▲` / `▼` suffix. Headers must be `position: sticky; top: 0; zIndex: 1`.
- Header text alignment must match the data below (left for text, right for numbers).

**Cells:** Use `CELL` (left) and `CELL_RIGHT` (right) from `@/lib/theme/win98`. Never hardcode padding/fontSize/fontFamily. Last cell in row: `borderRight: 'none'`.

**Rows:** Even rows `#ffffff`, odd rows `#f0f0f0`. Each row: `borderBottom: '1px solid #c0c0c0'`. `cursor: 'default'`.

**Semantic coloring:** Positive → `color: '#008000'` with `+` prefix. Negative → `color: '#800000'`.

**Refresh button:** `REFRESH_FOOTER` from `@/lib/theme/win98` — bottom-right, outside the scrollable area.

**Status bar:** `<div className="status-bar">` with `STATUS_BAR_STYLE`. Display item count and summary metrics.

**Font/general:** Apply `FONT` to the `<table>`. Use `borderCollapse: 'collapse'`, `borderSpacing: 0`.

### Window Layout Pattern
Every panel window must use this structure (use constants from `@/lib/theme/win98`):
1. Outer div: `WINDOW_CONTAINER` (flex column, full height, `background: #c0c0c0`)
2. Optional tab strip: `<menu role="tablist">` immediately inside
3. Scrollable body: `SCROLLABLE_BODY` (flex: 1, overflow auto, padding 6px)
4. Refresh footer: `REFRESH_FOOTER` (bottom-right button, border-top separator)
5. Status bar: `<div className="status-bar">` with `STATUS_BAR_STYLE`
