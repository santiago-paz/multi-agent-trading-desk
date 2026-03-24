# Win98 UI Guidelines

Every UI component must authentically replicate Windows 98/2000 aesthetics. These rules are non-negotiable for all interface work.

### 1. Typography and Capitalization

**System Fonts & Styles:**
- **Win98:** MS Sans Serif 8pt. **Win2000 (preferred):** Tahoma 8pt.
- **General rules:** No italic, no serif. Limit the number of fonts and styles in use — visual clutter from mixed fonts undermines the authentic aesthetic.
- **Bold and italic restrictions:** Except for title bars, avoid bold or italic for general interface text. In menus, bold must be exclusively reserved to indicate a default action command.
- **Title bar text:** bold (e.g. Tahoma 8pt bold). **Standard text:** menus, status bars, dialog text, control labels → regular 8pt system font.
- Always use `FONT` from `@/lib/theme/win98` — never hardcode `fontFamily` or `fontSize`.

**Capitalization Rules:**
- **Title Caps** — capitalize the first and last word always, and all words in between except: articles (*a, an, the*), coordinating conjunctions (*and, but, for, or*), and prepositions of four letters or fewer (*at, for, with, into*, etc.). Applies to: column headings, command button labels, icon labels, menu names and menu commands, palette titles, tab titles, title bar text, toolbar and toolbar button labels, ToolTips, window titles.
- **Sentence caps** — capitalize only the first word and proper nouns. No closing punctuation on labels. Applies to: checkbox labels, group box labels, list box entries, messages, radio button labels, text box labels, status bar text, file names, alternate text for images.
- **User-supplied names** (e.g. file names the user typed): always display exactly as the user specified, preserving their original casing — including in the title bar.

**Punctuation:**
- Append `...` to a command **only** if it requires additional information from the user to complete (i.e. it opens a secondary dialog). Examples: `Save As...`, `Open...`, `Print...`, `Find...`, `Browse...`.
- Do **not** append `...` to commands that simply display a view, change the existing view, or perform a direct action requiring no further input. Examples: `Cut`, `Copy`, `Paste`, `Undo`, `Refresh`, `Details`, `Outline`, `Print Preview`, `Show Toolbar`, `Properties`, `Options`, `Settings`, `About`, `Close`.
- For introductory or instructional text, use complete sentences with standard ending punctuation. For checkbox, group box, and radio button labels, use phrases with **no closing punctuation**.
- When introducing a bulleted or numbered list, end the introductory sentence or fragment with a **colon**.

### 2. Layout, Margins, and Dialog Units (DLUs)

**Dialog Units (DLUs) and Resolution Independence**
All element sizes and positions are defined in DLUs, not pixels, to ensure the interface scales correctly when the user changes the system font or display settings. **1 horizontal DLU = 1/4 average character width** of the current system font; **1 vertical DLU = 1/8 average character height**.
- **Toolbar exception:** Toolbars and their buttons use absolute pixels instead of DLUs — see section 4 for toolbar pixel dimensions.

**Margins and Spacing**
Strict spacing rules are critical to creating a visually consistent and predictable layout.
- **Window margins:** 7 DLUs from all edges of a dialog box.
- **Unrelated controls / paragraphs of text:** 7 DLUs apart.
- **Related controls** (e.g. a set of grouped buttons): 4 DLUs apart.
- **Label → its control** (text box, list box): exactly 3 DLUs. If a label sits beside a button, position it 3 DLUs down from the button top. For a checkbox, list box, or option button beside a button, position it 2 DLUs down from the button top.
- **Minimum between any two controls:** 2 DLUs.

**Standard Control Sizes**
- **Command buttons:** 50 DLUs wide × 14 DLUs tall (width may grow for long labels; height is always fixed). Aim for consistent button widths within the same dialog for readability.
- **Text boxes:** 14 DLUs tall; width sized to visually match adjacent drop-downs or other text boxes in the same interface.
- **Drop-down combo boxes and drop-down lists:** 10 DLUs tall; width to match adjacent text boxes visually.
- **Option buttons & checkboxes:** 10 DLUs tall; width as needed to fit the label.
- **Text labels:** 8 DLUs per line; width as needed. For localization, make labels and controls wider than the English text requires to accommodate text expansion in other languages.

**Internal Structure of Group Boxes**
- First control inside: **11 DLUs** below the top edge (below the legend line), aligned to the group box title.
- Between subsequent controls inside: **4 DLUs**.
- Controls sit **9 DLUs from the left edge** of the group box. If the group box is left-aligned to the dialog margin (7 DLUs), internal controls end up **16 DLUs** from the absolute left edge.
- Last control inside: must leave **7 DLUs** of bottom margin above the group box's bottom frame line.
- **Controls below a group box:** Align them to the group box's left edge and leave **7 DLUs** between the group box's bottom frame and the control below.

**Alignment and Text Flow**
Orient controls left-to-right, top-to-bottom (natural western reading order). Place the primary interactive field as close to the upper-left as possible.
- **Text fields & labels:** When stacked vertically, align fields by their left edges. Labels go above or to the left of their controls. When a label sits left of a text box, align the top of the label text with the text inside the box.
- **Group boxes:** Standard controls inside are left-aligned to the group title; command buttons inside are right-aligned.
- **Numeric columns:** Align numbers at the decimal point. Right-align whole-number columns and any column mixing whole numbers with text.

### 3. The 3D Shading Model (Borders and Edges)
The 3D appearance serves a functional purpose — perspective, highlighting, and shadow provide real-world visual cues and feedback in response to user actions. The theoretical light source comes from the **upper-left corner** of the screen. Do not use fixed pixel widths to define borders; rely on system metrics so lines render at the correct thickness for the display resolution.

Four system color roles: Button Face (light gray), Window Frame (black/dark gray), Button Highlight (white), Button Shadow (dark gray).

**Four border primitives:**
- **Raised Outer:** top/left = Button Face; bottom/right = Window Frame
- **Raised Inner:** top/left = Button Highlight; bottom/right = Button Shadow
- **Sunken Outer:** top/left = Button Shadow; bottom/right = Button Highlight
- **Sunken Inner:** top/left = Window Frame; bottom/right = Button Face

**Component rules:**
- **Window border style (windows, menus, scroll arrows):** Raised Outer + Raised Inner.
- **Command buttons (up):** Raised Outer + Raised Inner — note that button borders swap the top/left outer and inner colors compared to the standard raised primitive. **Buttons (down/pressed):** Sunken Outer + Sunken Inner; text label shifts **1px down and 1px right**.
- **Toolbar buttons:** No visible border at rest. On hover: Raised Inner only (Button Highlight top/left, Button Shadow bottom/right) — no outer border. On press: edges swap (Button Shadow top/left, Button Highlight bottom/right); no secondary border.
- **Field border style (text boxes, checkboxes, dropdowns, list boxes, spin boxes):** Sunken Outer + Sunken Inner. Interior = white (Button Highlight) unless disabled or read-only → gray (Button Face).
- **Status field border style (status bars, dynamic read-only fields):** Sunken Outer only — flat recessed look.
- **Grouping border style (group boxes, menu separators):** Sunken Outer + Raised Inner (engraved appearance).
- Never hardcode colors — use CSS variables (`--btn-face`, `--btn-highlight`, `--btn-shadow`) or theme constants from `@/lib/theme/win98`.

### 4. UI Controls and States

**Command Buttons:**
- **Default action button:** Thick dark bold outline around it, activated by Enter. When the user navigates via keyboard to a different button, that button temporarily takes the bold outline; the original default loses it. **Never** designate a destructive or irreversible action (e.g. "Replace All") as the default button.
- **Placement & ordering:** Stack vertically along the upper-right border, or line up horizontally across the bottom-right. OK must always be first, immediately followed by Cancel.
- **Pressed state:** Sunken Outer + Sunken Inner border; text label shifts **1px down and 1px right**.
- **Disabled state:** Draw label text in Button Highlight (white), then redraw the same text 1px down and 1px right in Button Shadow (dark gray) — this creates the embossed/engraved look.

**Toolbar Buttons:**
- **Dimensions (absolute pixels, not DLUs):** **22×21px** (width × height, for 16×16 icons); **28×26px** (for 20×20 icons).
- **Resting state:** Flat, no visible border. **Hover (hot-tracked):** Raised Inner border appears (Button Highlight top/left, Button Shadow bottom/right). **Pressed:** edges swap (Button Shadow top/left, Button Highlight bottom/right).
- Leave **3px** between the button's icon and its text label.

**Option Buttons (Radio) & Checkboxes:**
- Height **10 DLUs**; width as needed to fit the label.
- Both use the field border style (Sunken Outer + Sunken Inner).
- **Radio buttons:** circular; solid dot when set. If the group represents mixed values, all circles display completely empty — no dots.
- **Checkboxes:** square with check mark when set. **Indeterminate/mixed state:** Button Shadow check mark drawn over a checkerboard dither of Button Face + Button Highlight.

**Input Focus and Selection:**
- **Most controls** (buttons, checkboxes, list items): keyboard focus draws a **thin dotted rectangle** outline with at least one border-width of space inside the control's outer border. If this is visually intrusive, draw it tightly around the control's text label instead.
- **Text fields:** Input focus is represented by a blinking vertical insertion-point cursor, not a dotted outline.

**Tables (ListView):** see Tables section below.

### 5. Windows, Dialogs, and Menus

**Secondary windows (dialogs & property sheets):**
- Maximum size: **263 × 263 DLUs** — ensures the window fits entirely on a 640×480 screen.
- No Minimize or Maximize buttons — only Close (X). Optional **?** (What's This?) button for contextual help.
- **Initial placement:** Open fully visible, centered just below the primary window's title bar or menu bar. On multi-monitor setups, appear on the same monitor as the parent. Preserve position between sessions.
- **Cascading windows:** Limit nesting to a single sublevel. Offset the dependent window slightly right and below its parent — never chain more than two levels deep.
- **Unfold buttons (progressive disclosure):** Use a `>>` button (e.g. "Define Custom Colors >>") to reveal advanced options without cluttering the initial view. You may optionally allow the button to refold the window.
- **Input validation:** Validate as close to the point of entry as possible (balloon tips, audio cues, or message boxes). Never block navigation away from a control due to invalid input. If immediate validation is impossible, validate on commit or when the user attempts to close the window — leave the window open and return focus to the invalid control.

**Dialog box layout:**
- **Title bar text:** Must exactly match the command that opened it, using Title Caps. Never include `...` in the title bar, even if the invoking menu command had one. Do not include the menu's parent title (e.g. use "Print", not "File Print").
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
**Sizes, Color Depth & Palettes:**
- Supply assets at all three sizes: **16×16** (menus/title bars), **32×32** (desktop/large view), **48×48** (optional splash).
- Provide both **16-color and 256-color** variants for each size. Colors must be drawn strictly from the standard Windows system halftone palette to prevent palette flashing across display configurations.
- **Monochrome fallback:** The system maps colors automatically for monochrome displays, but if the automated mapping degrades the image, provide explicit monochrome variants.

**Dimensionality & Light Source:**
- Use perspective, lighting, and shadow to give icons a realistic three-dimensional volume wherever appropriate.
- All icons must be designed assuming a light source from the **upper-left corner**. Apply a **black edge** on the bottom/right sides and a **dark gray edge** on the top/left sides to simulate this light.
- **If you flip an icon horizontally** to avoid lower-left occlusion (see below), you must manually recalculate and adjust the shading so the light source remains accurately positioned in the upper-left.

**Design Metaphors & Cultural Safety:**
- Use real-world object metaphors (nouns representing verbs) to support immediate recognition — e.g. scissors for "Cut".
- **Never** depict realistic humans, faces, gender-specific traits, stereotypes, or body parts. If representing a user is unavoidable, the depiction must be entirely abstract and generic.
- **Never embed text or letters** inside icon graphics — text cannot be localized and becomes illegible at 16×16.

**Application vs. Document Icons:**
- The primary application icon must be the **first icon resource (Index 0)** compiled into the `.exe` — the system always uses index 0 to represent the application.
- Document/data-file icons must be visually distinct from the application icon while sharing a common graphical element that ties them to the parent application.
- Every data file type the application supports must have its own registered icon. If unregistered, the system supplies a generic fallback that harms the user experience.

**System Overlays:**
- The system places status overlays (shortcut arrow, share hand, etc.) on the **lower-left corner** of icons. Keep the most important defining details of the icon away from that corner to avoid occlusion.

### Tables (ListView) — Reference: `PortfolioSummary`
All data tables must follow the pattern established in `src/components/ui/PortfolioSummary.tsx`. These rules are mandatory for every table.

**Structure:**
- Wrap the table in a `<fieldset>` with a `<legend>` (e.g., `"Tenencia (12 títulos)"`).
- Inside the fieldset, use `<div className="sunken-panel win98-scrollbar">` as the scrollable container — never apply `boxShadow` manually.

**Column Headers:**
- Import and use `COL_HEADER_BASE`, `COL_RAISED`, `COL_SUNKEN` from `@/lib/theme/win98`.
- **Inactive** (non-sorted): `{ ...COL_HEADER_BASE, ...COL_RAISED }`. **Active** (sorted): `{ ...COL_HEADER_BASE, ...COL_SUNKEN }`.
- Header text: Title Caps, brief, no trailing punctuation. Initial column width should reflect the average size of its data entries.
- Sortable headers show `▲` / `▼` suffix — `▼` indicates descending order (e.g. most recent date first). Headers must be sticky — this is built into `COL_HEADER_BASE`. For sticky to work, the `sunken-panel` wrapper must be the scroll container (`overflow: auto` with a height constraint like `flex: 1; minHeight: 0` or `maxHeight`), not a parent div.
- **Header alignment must match the data below:** left-align text columns, right-align numeric columns. Never mix alignment between a header and its cells. Always align numbers at the decimal point (or imaginary decimal point). If a column mixes whole numbers with text, force alignment to the right.
- If a header uses only a graphic (no text), include a tooltip so the user can identify it on hover.

**Sorting behavior:**
- Left-click a header → sort the list by that column. If already sorted by that column, reverse the order. If there is no natural ordering for the content, default to ascending or alphabetical (0–9 or A–Z).
- Right-click a header → show a context menu with sort options ("Sort Ascending", "Sort Descending"). These options must also be reachable via Shift+F10 or the Application key when no list item is selected (column headers have no native keyboard navigation).

**Column resizing:**
- Users may drag the divider between column headers to manually resize.
- Double-clicking a divider auto-fits the left column to its longest content value.
- Ctrl+Plus (numpad) auto-fits all columns simultaneously.

**Cells and Rows:**
- **Cells:** Use `CELL` (left) and `CELL_RIGHT` (right) from `@/lib/theme/win98`. Never hardcode padding/fontSize/fontFamily. Last cell in row: `borderRight: 'none'`.
- **Rows:** Even rows `#ffffff`, odd rows `#f0f0f0`. Each row: `borderBottom: '1px solid #c0c0c0'`, `cursor: 'default'`.
- **First column:** The leftmost column always carries the item's icon and its text label. Subsequent columns hold supplementary data.
- **Row selection:** Users select an item by clicking its icon or label. Support extended selection for contiguous (range) and disjoint selections.
- **Checkboxes in rows:** Optionally display checkboxes next to items to represent state or support multiple selections natively.

**Keyboard Navigation:**
- Support arrow keys, Page Up, Page Down, Home, and End for navigation and selection.
- Support text keys (timeout-based character matching) so the user can jump to alphabetical entries quickly.

**Semantic coloring:** Positive → `color: '#008000'` with `+` prefix. Negative → `color: '#800000'`.

**Hierarchical range selection:** When a user begins a text selection inside a cell and drags into an adjacent cell, the selection level must automatically promote from character-level to cell-level (selecting both full cells). If the user pulls the selection back within the original cell's boundaries without releasing, the level demotes back to character selection.

**Footer Elements:**
- **Refresh button:** `REFRESH_FOOTER` from `@/lib/theme/win98` — bottom-right, outside the scrollable area.
- **Status bar:** `<div className="status-bar">` with `STATUS_BAR_STYLE`. Display item count and summary metrics. Status fields use only the Sunken Outer border primitive (flat, recessed look — no inner border).

**Font/general:** Apply `FONT` to the `<table>`. Use `borderCollapse: 'collapse'`, `borderSpacing: 0`.

### Window Layout Pattern
Every panel window must use this structure (use constants from `@/lib/theme/win98`):
1. Outer div: `WINDOW_CONTAINER` (flex column, full height, `background: #c0c0c0`)
2. Optional tab strip: `<menu role="tablist">` immediately inside
3. Scrollable body: `SCROLLABLE_BODY` (flex: 1, overflow auto, padding 6px)
4. Refresh footer: `REFRESH_FOOTER` (bottom-right button, border-top separator)
5. Status bar: `<div className="status-bar">` with `STATUS_BAR_STYLE`
