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

**Dialog Units (DLUs) and Resolution Independence**
All element sizes and positions are defined in DLUs, not pixels, to ensure the interface scales correctly when the user changes the system font or display settings. **1 horizontal DLU = 1/4 average character width** of the current system font; **1 vertical DLU = 1/8 average character height**.

**Margins and Spacing**
- **Window margins:** 7 DLUs from all edges of a dialog box.
- **Unrelated controls / paragraphs of text:** 7 DLUs apart.
- **Related controls** (e.g. a set of grouped buttons): 4 DLUs apart.
- **Label → its control** (text box, list box): exactly 3 DLUs. If a label sits beside a button, position it 3 DLUs down from the button top. For a checkbox, list box, or option button beside a button, position it 2 DLUs down from the button top.
- **Minimum between any two controls:** 2 DLUs.

**Standard Control Sizes**
- **Command buttons:** 50 DLUs wide × 14 DLUs tall (width may grow for long labels; height is always fixed).
- **Text boxes:** 14 DLUs tall. Drop-down combo boxes and drop-down lists: 10 DLUs tall; size width to match adjacent text boxes or drop-downs visually.
- **Option buttons & checkboxes:** 10 DLUs tall; width as needed to fit the label.
- **Text labels:** 8 DLUs per line; width as needed.

**Internal Structure of Group Boxes**
- First control inside: **11 DLUs** below the top edge (below the legend line), aligned to the group box title.
- Between subsequent controls inside: **4 DLUs**.
- Controls sit **9 DLUs from the left edge** of the group box. If the group box is left-aligned to the dialog margin (7 DLUs), internal controls end up **16 DLUs** from the absolute left edge.
- Last control inside: must leave **7 DLUs** of bottom margin above the group box's bottom frame line.

**Alignment and Text Flow**
Orient controls left-to-right, top-to-bottom (natural western reading order). Place the primary interactive field as close to the upper-left as possible.
- **Text fields & labels:** When stacked vertically, align fields by their left edges. Labels go above or to the left of their controls. When a label sits left of a text box, align the top of the label text with the text inside the box.
- **Group boxes:** Standard controls inside are left-aligned to the group title; command buttons inside are right-aligned.
- **Numeric columns:** Align numbers at the decimal point. Right-align whole-number columns and any column mixing whole numbers with text.

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
- Maximum size: **263 × 263 DLUs** — ensures the window fits entirely on a 640×480 screen.
- No Minimize or Maximize buttons — only Close (X). Optional **?** (What's This?) button for contextual help.
- **Initial placement:** Open fully visible, centered just below the primary window's title bar or menu bar. On multi-monitor setups, appear on the same monitor as the parent. Preserve position between sessions.
- **Cascading windows:** Limit nesting to a single sublevel. Offset the dependent window slightly right and below its parent — never chain more than two levels deep.
- **Unfold buttons (progressive disclosure):** Use a `>>` button (e.g. "Define Custom Colors >>") to reveal advanced options without cluttering the initial view.
- **Input validation:** Validate as close to the point of entry as possible (balloon tips, audio cues, or message boxes). Never block navigation away from a control due to invalid input — validate on commit if immediate validation is impossible.

**Dialog box layout:**
- **Title bar text:** Must exactly match the command that opened it, using Title Caps. Never include `...` in the title bar, even if the invoking menu command had one.
- **Command button layout:** Stack vertically along the upper-right border, or line up horizontally across the bottom-right.
- **Button ordering:** Default/most important button first. If OK and Cancel are present, group them together. Strict left-to-right (or top-to-bottom) order: **OK → Cancel → Help**.
- **Default button:** Thick bold outline, responds to Enter. Keyboard focus temporarily transfers the bold outline to the focused button. Never make a destructive or irreversible action the default button.

**Property sheets (tabbed dialogs):**
- Use a **single row of tabs** — stacked multi-row tabs cause usability problems and must be avoided entirely. If too many categories exist, use a drop-down list inside the sheet instead.
- Global action buttons (OK, Cancel, Apply) must sit **outside** the tab area, aligned to the **bottom-right**.
- **Multiple selection:** Display the intersection of shared properties. Controls whose values differ across selected items must render in a mixed-value (indeterminate) appearance.

**Access keys (mnemonics):**
- Every menu title, menu item, and interactive control must have an **underlined access key** (unique within the window scope) reachable via Alt+key.
- Assignment priority: first letter → distinctive consonant → vowel.
- **Exception:** Do not assign access keys to OK and Cancel — Enter and Esc handle those natively.
- **DBCS locales (Japanese, Chinese, Korean):** Underlining does not apply — append the roman character in parentheses at the end of the label instead (e.g. "保存(S)").

**Context menus (right-click / Shift+F10 / Application key):**
- Strict top-to-bottom order: primary commands (Open, Play, Print) → transfer commands (Cut, Copy, Paste) → other object commands → What's This? → **Properties always last**. Use visual separators between groups.
- Do **not** include keyboard shortcut annotations (Ctrl+C, etc.) — context menus are visual shortcuts; annotation reduces readability.
- **Disabled vs. removed:** If a command is temporarily inapplicable, disable it (grayed out) rather than removing it — preserves spatial stability. Only remove a command if the object or state permanently invalidates it.
- **Ellipsis rule:** Append `...` only if the command requires additional user input to complete. Do not append `...` to commands that simply execute an action or change a view (e.g. "Properties", "Cut", "Outline").

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
- Header text: Title Caps, brief, no trailing punctuation. Initial column width should reflect the average size of its data entries.
- Sortable headers show `▲` / `▼` suffix. Headers must be `position: sticky; top: 0; zIndex: 1`.
- **Header alignment must match the data below:** left-align text columns, right-align numeric columns. Never mix alignment between a header and its cells.
- If a header uses only a graphic (no text), include a tooltip so the user can identify it on hover.

**Sorting behavior:**
- Left-click a header → sort the list by that column. If already sorted by that column, reverse the order.
- Right-click a header → show a context menu with sort options ("Sort Ascending", "Sort Descending"). These options must also be reachable via Shift+F10 or the Application key when no list item is selected (column headers have no native keyboard navigation).

**Column resizing:**
- Users may drag the divider between column headers to manually resize. Double-clicking a divider auto-fits the left column to its longest content value.
- Ctrl+Plus (numpad) auto-fits all columns simultaneously.

**Cells:** Use `CELL` (left) and `CELL_RIGHT` (right) from `@/lib/theme/win98`. Never hardcode padding/fontSize/fontFamily. Last cell in row: `borderRight: 'none'`.

**Rows:** Even rows `#ffffff`, odd rows `#f0f0f0`. Each row: `borderBottom: '1px solid #c0c0c0'`. `cursor: 'default'`.

**First column:** In a standard ListView, the leftmost column always carries the item's icon and its text label. Subsequent columns hold supplementary data.

**Semantic coloring:** Positive → `color: '#008000'` with `+` prefix. Negative → `color: '#800000'`.

**Hierarchical range selection:** When a user begins a text selection inside a cell and drags into an adjacent cell, the selection level must automatically promote from character-level to cell-level (selecting both full cells). If the user pulls the selection back within the original cell's boundaries without releasing, the level demotes back to character selection.

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
