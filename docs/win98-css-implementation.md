# Win98 CSS Implementation Reference

This document maps the design rules in [`win98-ui-guidelines.md`](win98-ui-guidelines.md) to concrete HTML/JSX markup using the **98.css** library and the project's theme constants in `@/lib/theme/win98`.

**Rule:** Never hardcode colors, fonts, or border styles manually when an 98.css class or a `@/lib/theme/win98` constant already handles it. Use CSS classes for structural markup; use inline `style` props (via theme constants) only when overriding layout geometry (width, flex, padding adjustments) or applying semantic data colors.

---

## Setup

98.css is imported globally. No per-component import needed. Theme constants come from:

```ts
import { FONT, CELL, CELL_RIGHT, COL_HEADER_BASE, COL_RAISED, COL_SUNKEN,
         WINDOW_CONTAINER, SCROLLABLE_BODY, REFRESH_FOOTER, STATUS_BAR_STYLE,
         HR98, BUTTON_PRESSED, COLOR_POSITIVE, COLOR_NEGATIVE } from '@/lib/theme/win98';
```

---

## 1. Typography

The `FONT` constant applies the correct system font (`"Pixelated MS Sans Serif"`, 11px, no antialiasing). Apply it to the outermost container of every panel and to every `<table>` — child elements inherit it automatically.

```tsx
// Apply once at the container level; children inherit
<div style={WINDOW_CONTAINER}>...</div>

// Or on a table
<table style={{ ...FONT, borderCollapse: 'collapse', borderSpacing: 0 }}>
```

**Never** set `fontFamily` or `fontSize` manually on individual elements. 98.css does not set the system font globally, so `FONT` must be applied at the container level.

For **title bar text** 98.css applies bold automatically via `.title-bar-text`. Do not add `fontWeight: 'bold'` elsewhere.

---

## 2. Buttons

98.css styles all `<button>` and `<input type="submit|reset">` elements automatically.

```tsx
// Standard button (Raised Outer + Raised Inner borders)
<button>OK</button>

// Default action button (thick bold outline, responds to Enter)
<button className="default">OK</button>

// Pressed/active state (Sunken Outer + Sunken Inner, label shifts 1px down+right)
// For programmatic pressed state, apply BUTTON_PRESSED from theme:
<button style={isPressed ? BUTTON_PRESSED : undefined}>Toggle</button>

// Disabled (embossed label: white text + dark gray shadow 1px down+right)
<button disabled>Cannot Click</button>

// Focused (dotted border inside button — browser handles natively via :focus)
```

**Button ordering in dialogs:** OK first, then Cancel, then Help — left-to-right or top-to-bottom.

```tsx
<section className="field-row" style={{ justifyContent: 'flex-end' }}>
  <button className="default">OK</button>
  <button>Cancel</button>
</section>
```

---

## 3. Checkboxes

Must include a `<label>` with a matching `for`/`htmlFor` pointing at the input's `id`. Wrap each checkbox+label pair in a `.field-row` div.

```tsx
<div className="field-row">
  <input type="checkbox" id="chk-notifications" />
  <label htmlFor="chk-notifications">Show notifications</label>
</div>

// Checked + disabled
<div className="field-row">
  <input type="checkbox" id="chk-auto" checked disabled />
  <label htmlFor="chk-auto">Auto-refresh data</label>
</div>
```

Labels use **sentence caps** (capitalize first word only). No closing punctuation.

---

## 4. Option Buttons (Radio)

Same pattern as checkboxes. Group by sharing a `name` attribute.

```tsx
<div className="field-row">
  <input type="radio" id="sort-asc" name="sort-order" />
  <label htmlFor="sort-asc">Ascending</label>
</div>
<div className="field-row">
  <input type="radio" id="sort-desc" name="sort-order" defaultChecked />
  <label htmlFor="sort-desc">Descending</label>
</div>
```

---

## 5. Group Boxes

Use `<fieldset>` (gets the engraved Sunken Outer + Raised Inner border automatically) with an optional `<legend>` for the label.

```tsx
<fieldset>
  <legend>Sort order</legend>
  <div className="field-row">
    <input type="radio" id="r1" name="sort" />
    <label htmlFor="r1">By name</label>
  </div>
  <div className="field-row">
    <input type="radio" id="r2" name="sort" />
    <label htmlFor="r2">By date</label>
  </div>
</fieldset>
```

Legend text uses **sentence caps**. Internal controls are left-aligned; any command buttons inside are right-aligned.

---

## 6. Text Boxes

Use `<input type="text">` or `<textarea>`. Wrap with `.field-row` (label beside input) or `.field-row-stacked` (label above input).

```tsx
// Label to the left
<div className="field-row">
  <label htmlFor="budget-input">Budget</label>
  <input id="budget-input" type="text" />
</div>

// Label stacked above (better for longer inputs)
<div className="field-row-stacked" style={{ width: '200px' }}>
  <label htmlFor="notes">Additional notes</label>
  <textarea id="notes" rows={4} />
</div>

// Disabled (gray interior, embossed label)
<div className="field-row">
  <label htmlFor="isin">ISIN</label>
  <input id="isin" type="text" value="US0378331005" disabled />
</div>
```

Text box labels use **sentence caps**. Focus is shown by a blinking cursor — no dotted outline.

---

## 7. Dropdowns

Use `<select>` + `<option>`. 98.css applies the correct drop-down border style automatically.

```tsx
<select defaultValue="AAPL">
  <option value="AAPL">AAPL — Apple Inc.</option>
  <option value="KO">KO — Coca-Cola</option>
  <option value="TSLA">TSLA — Tesla</option>
</select>
```

Wrap with `.field-row` when pairing with a label.

---

## 8. Sliders

```tsx
// Horizontal slider
<div className="field-row" style={{ width: '260px' }}>
  <label htmlFor="risk">Risk:</label>
  <label>Low</label>
  <input id="risk" type="range" min={1} max={10} defaultValue={5} />
  <label>High</label>
</div>

// Vertical slider with box indicator
<div className="field-row">
  <label>Volume</label>
  <div className="is-vertical">
    <input className="has-box-indicator" type="range" min={0} max={100} />
  </div>
</div>
```

---

## 9. Windows

### Complete window structure

```tsx
<div className="window" style={{ width: 320 }}>
  <div className="title-bar">
    <div className="title-bar-text">Portfolio Summary</div>
    <div className="title-bar-controls">
      <button aria-label="Minimize"></button>
      <button aria-label="Maximize"></button>
      <button aria-label="Close"></button>
    </div>
  </div>
  <div className="window-body">
    {/* content */}
  </div>
</div>
```

### Title bar button variants

| Scenario | Markup |
|---|---|
| Normal window | `Minimize` + `Maximize` + `Close` |
| Maximized window | `Minimize` + `Restore` + `Close` |
| Dialog (no resize) | `Close` only, or `Help` + `Close` |
| Maximize locked | `<button aria-label="Maximize" disabled>` |
| Inactive (unfocused) | `<div className="title-bar inactive">` |

Alternatively use explicit styling classes to decouple from `aria-label` language:

```tsx
<button aria-label="Cerrar ventana" className="close"></button>
<button aria-label="Minimizar" className="minimize"></button>
<button aria-label="Maximizar" className="maximize"></button>
<button aria-label="Restaurar" className="restore"></button>
<button aria-label="Ayuda" className="help"></button>
```

### Title bar text rules

- Use **Title Caps**.
- Must exactly match the command that opened it.
- Never include `...` in the title bar even if the invoking menu command did.
- For secondary dialogs (no Minimize/Maximize): `Close` button only.

---

## 10. Panel Windows (project-specific layout)

Every panel window in this project uses the layout pattern from `@/lib/theme/win98` constants instead of raw `.window` / `.window-body` so that draggable/resizable behavior can be layered on top:

```tsx
// 1. Outer container (flex column, full height, Win98 gray)
<div style={WINDOW_CONTAINER}>

  {/* 2. Optional tab strip */}
  <menu role="tablist">
    <li role="tab" aria-selected="true"><a href="#">Holdings</a></li>
    <li role="tab"><a href="#">Performance</a></li>
  </menu>

  {/* 3. Scrollable body */}
  <div style={SCROLLABLE_BODY}>
    {/* content */}
  </div>

  {/* 4. Refresh footer */}
  <div style={REFRESH_FOOTER}>
    <button>Refresh</button>
  </div>

  {/* 5. Status bar */}
  <div className="status-bar" style={STATUS_BAR_STYLE}>
    <p className="status-bar-field">12 items</p>
    <p className="status-bar-field">Last update: 14:32</p>
  </div>
</div>
```

---

## 11. Status Bar

```tsx
<div className="status-bar" style={STATUS_BAR_STYLE}>
  <p className="status-bar-field">Press F1 for help</p>
  <p className="status-bar-field">14 items selected</p>
  <p className="status-bar-field">Ready</p>
</div>
```

Each `.status-bar-field` gets the Sunken Outer border only (flat recessed look — no inner border). Text uses **sentence caps**. Apply `STATUS_BAR_STYLE` to the `.status-bar` container for correct font.

---

## 12. Tables (ListView)

All tables follow the pattern in `PortfolioSummary.tsx`. Key classes and constants:

```tsx
{/* Outer group box */}
<fieldset>
  <legend>Holdings (12 items)</legend>

  {/* Scrollable sunken panel */}
  <div className="sunken-panel win98-scrollbar">
    <table style={{ ...FONT, borderCollapse: 'collapse', borderSpacing: 0, width: '100%' }}>
      <thead>
        <tr>
          {/* Inactive (default) header */}
          <th style={{ ...COL_HEADER_BASE, ...COL_RAISED, textAlign: 'left' }}>
            Symbol
          </th>
          {/* Active (sorted) header — right-aligned numeric */}
          <th
            style={{ ...COL_HEADER_BASE, ...COL_SUNKEN, textAlign: 'right' }}
            onClick={handleSort}
          >
            Price ▼
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => {
          const isSelected = selectedRow === row.symbol;
          return (
            <tr
              key={row.symbol}
              onClick={() => setSelectedRow(row.symbol)}
              style={{
                background: isSelected ? '#000080' : (i % 2 === 0 ? '#ffffff' : '#f0f0f0'),
                color: isSelected ? '#ffffff' : 'inherit',
                cursor: 'default',
              }}
            >
              <td style={CELL}>{row.symbol}</td>
              <td style={{ ...CELL_RIGHT, borderRight: 'none' }}>
                <span style={{ color: isSelected ? '#ffffff' : (row.change >= 0 ? COLOR_POSITIVE : COLOR_NEGATIVE) }}>
                  {row.change >= 0 ? '+' : ''}{row.change}%
                </span>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
</fieldset>
```

**Rules enforced by these choices:**
- `sunken-panel` gives the Sunken Outer + Sunken Inner border (field border style) — never add `boxShadow` manually.
- `COL_RAISED` / `COL_SUNKEN` handle the raised/sunken header button look — no manual border strings.
- `CELL` / `CELL_RIGHT` handle font, padding, right-border separator — never hardcode these.
- Last cell in each row: always add `borderRight: 'none'`.
- **Rows:** Do not add `borderBottom` to rows; the table should rely only on vertical column borders (`borderRight` on cells) and alternating row backgrounds.
- **Sticky headers** are built into `COL_HEADER_BASE` (`position: 'sticky', top: 0, zIndex: 1`). No extra inline styles needed on `<th>`. For sticky to work, the `sunken-panel` wrapper must be the actual scroll container — give it `overflow: auto` and a height constraint (e.g. `flex: 1; minHeight: 0` or `maxHeight`). If a parent div scrolls instead of the sunken-panel, sticky headers will not stick.

For row selection highlight, apply inline styles dynamically: `background: '#000080'` and `color: '#ffffff'`. Ensure any custom semantic colors (like `COLOR_POSITIVE`) are overridden to `#ffffff` when the row is selected to maintain readability.

---

## 13. Tabs

```tsx
{/* Single-row tab strip (preferred) */}
<menu role="tablist">
  <li role="tab" aria-selected="true"><a href="#">Holdings</a></li>
  <li role="tab"><a href="#">Orders</a></li>
  <li role="tab"><a href="#">History</a></li>
</menu>

{/* Tab panel MUST be wrapped in .window and .window-body to get the correct 3D border */}
{/* Use minHeight: 0 on flex containers to allow scrolling, and marginBottom: 12 for authentic spacing */}
{/* Add margin: 0 to the .window-body to prevent excessive inner padding */}
{/* NOTE: If the tab panel is inside a group box (<fieldset>), do NOT wrap it in .window/.window-body as it will create a double border. */}
<div className="window" role="tabpanel" style={{ flex: 1, display: 'flex', flexDirection: 'column', marginBottom: 12, minHeight: 0 }}>
  <div className="window-body" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, overflow: 'hidden', minHeight: 0, marginTop: 0, marginRight: 0, marginBottom: 0, marginLeft: 0 }}>
    {/* active tab content */}
  </div>
</div>
```

Tab titles use **Title Caps**. Use `aria-selected="true"` on the active tab — manage with state. Never use multi-row tabs (`.multirows`) in production panels; the guideline prohibits it. If there are too many categories, switch to a dropdown inside the sheet.

---

## 14. Tree View

```tsx
<ul className="tree-view">
  <li>Equities</li>
  <li>
    <details open>
      <summary>Technology</summary>
      <ul>
        <li>AAPL</li>
        <li>MSFT</li>
      </ul>
    </details>
  </li>
  <li>Fixed Income</li>
</ul>
```

Use `<details>` + `<summary>` for collapsible nodes. Nested `<ul>` (no class needed) gets the dotted connector lines automatically.

---

## 15. Progress Indicator

```tsx
// Solid (default)
<div className="progress-indicator">
  <span className="progress-indicator-bar" style={{ width: '65%' }} />
</div>

// Segmented (classic Win98 chunked style)
<div className="progress-indicator segmented">
  <span className="progress-indicator-bar" style={{ width: '40%' }} />
</div>
```

---

## 16. Field Border Utilities

These classes apply borders without implying a specific form control — useful for work areas and dynamic content regions.

| Class | Border style | Use case |
|---|---|---|
| `field-border` | Sunken Outer + Sunken Inner | Work areas, active input regions |
| `field-border-disabled` | Sunken Outer + Sunken Inner, gray bg | Disabled/read-only work areas |
| `status-field-border` | Sunken Outer only | Dynamic read-only content (same as status bar fields) |

```tsx
// Read-only display panel
<div className="field-border" style={{ padding: '8px' }}>
  {dynamicContent}
</div>

// Disabled region
<div className="field-border-disabled" style={{ padding: '8px' }}>
  {disabledContent}
</div>

// Dynamic data that updates (equivalent to status bar field, standalone)
<div className="status-field-border" style={{ padding: '4px 8px' }}>
  MEP: {mepRate}
</div>
```

---

## 17. Separators / Horizontal Rules

Use `HR98` from `@/lib/theme/win98` for the engraved horizontal divider (dark line on top, white line below, simulating a groove):

```tsx
<hr style={HR98} />
```

Never use a plain `<hr>` or a `border-top` manually — the groove effect requires both a shadow line and a highlight line.

---

## 18. Semantic Colors

Always use the constants — never hardcode these hex values:

```ts
COLOR_POSITIVE = '#008000'  // green — use with '+' prefix
COLOR_NEGATIVE = '#800000'  // dark red
COLOR_LINK     = '#0000ff'
COLOR_SECONDARY = '#555555'
COLOR_DISABLED  = '#808080'
```

```tsx
<span style={{ color: change >= 0 ? COLOR_POSITIVE : COLOR_NEGATIVE }}>
  {change >= 0 ? '+' : ''}{change.toFixed(2)}%
</span>
```

---

## Quick-Reference Cheatsheet

| UI element | 98.css class / HTML | Theme constant |
|---|---|---|
| Window shell | `.window` | — |
| Title bar | `.title-bar` + `.title-bar-text` + `.title-bar-controls` | — |
| Inactive title bar | `.title-bar.inactive` | — |
| Window body | `.window-body` | — |
| Panel outer container | `<div>` | `WINDOW_CONTAINER` |
| Panel scrollable body | `<div>` | `SCROLLABLE_BODY` |
| Refresh footer | `<div>` | `REFRESH_FOOTER` |
| Status bar | `.status-bar` + `.status-bar-field` | `STATUS_BAR_STYLE` |
| Group box | `<fieldset>` + `<legend>` | — |
| Table scrollable container | `.sunken-panel.win98-scrollbar` | — |
| Table column header (inactive) | `<th>` | `COL_HEADER_BASE` + `COL_RAISED` |
| Table column header (sorted) | `<th>` | `COL_HEADER_BASE` + `COL_SUNKEN` |
| Table cell (left) | `<td>` | `CELL` |
| Table cell (right) | `<td>` | `CELL_RIGHT` |
| Horizontal separator | `<hr>` | `HR98` |
| Button pressed state | `<button>` | `BUTTON_PRESSED` |
| Default action button | `<button className="default">` | — |
| Field border (active) | `.field-border` | — |
| Field border (disabled) | `.field-border-disabled` | — |
| Status field border | `.status-field-border` | — |
| Tree view | `<ul className="tree-view">` | — |
| Tab strip | `<menu role="tablist">` + `<li role="tab">` | — |
| Tab panel | `<div className="window" role="tabpanel">` + `<div className="window-body">` | — |
| Progress bar | `.progress-indicator` + `.progress-indicator-bar` | — |
| Row selection | inline styles (`background: #000080`, `color: #fff`) | — |
| Font | — | `FONT` |
| Label (fixed-width right-aligned) | — | `LABEL` / `LABEL_ACCOUNT` |
