# UI Style Guide -- Views Tree Hierarchy

**Generated on:** 2026-02-22
**URL:** http://localhost:3000/views
**Design Philosophy:** Clean file-explorer / outline-view hierarchy where parent cards are full-detail and child entries are compact navigational rows, connected by clearly visible tree lines.

## Typography

- **Parent card title**: `text-base font-semibold text-gray-900`
- **Child row title**: `text-sm font-medium text-gray-800`, truncated at 50% max-width
- **Mono key (parent)**: `text-xs font-mono text-gray-400`
- **Mono key (child)**: `text-[10px] font-mono text-gray-400`, truncated, hidden below `sm` breakpoint
- **Description (parent only)**: `text-sm text-gray-600 line-clamp-2 leading-relaxed`
- **Badge text**: `text-xs` (parent), `text-[10px]` (child)

## Color Palette

### Renderer Type Colors (border + badge)
| Renderer | Border Color | Badge BG | Badge Text |
|----------|-------------|----------|------------|
| tab | blue-500 | blue-50 | blue-700 |
| card_grid | emerald-500 | emerald-50 | emerald-700 |
| timeline | amber-500 | amber-50 | amber-700 |
| prose | violet-500 | violet-50 | violet-700 |
| matrix | rose-500 | rose-50 | rose-700 |
| accordion | teal-500 | teal-50 | teal-700 |
| card | orange-500 | orange-50 | orange-700 |
| stat_summary | cyan-500 | cyan-50 | cyan-700 |
| table | indigo-500 | indigo-50 | indigo-700 |
| raw_json | gray-500 | gray-50 | gray-600 |

### Tree Line Colors
- **Trunk & branches**: `#a1a1aa` (zinc-400) -- clearly visible against white
- **Endpoint dots**: `#71717a` (zinc-500) -- slightly darker for emphasis
- **Children container background**: `rgba(243,244,246,0.4)` -- very subtle gray-100 tint

### Stance Badge
- Purple: `bg-purple-50 text-purple-700 border-purple-200`

### Child Count Badge
- Indigo: `bg-indigo-50 text-indigo-700 border-indigo-200`

## Spacing System

### Parent Cards
- Padding: `p-5` (20px)
- Left border: `border-l-4` (4px)

### Child Rows
- Padding: `px-3 py-2` (12px horizontal, 8px vertical)
- No left border (replaced by 1.5px color pip)

### Tree Layout
- `TREE_INDENT`: 28px per nesting level
- `TREE_BRANCH_Y`: 18px vertical offset for horizontal branch
- `TREE_LINE_WIDTH`: 2px
- Gap between child rows: `gap-1` (4px)
- Children container margin-left: 16px
- Children container margin-top: 2px
- Children container padding-bottom/right: 4px

### Endpoint Dots
- Size: 6px x 6px, rounded-full
- Position: left `TREE_INDENT - 10`, top `TREE_BRANCH_Y - 2`

## Component Styles

### Parent Card (ViewCard, isChild=false)
```
card hover:shadow-md transition-shadow group border-l-4 p-5
+ rendererBorderOnly color class
```
Contains: title, badges, mono key, description (2-line clamp), metadata row, chevron

### Child Row (ViewCard, isChild=true)
```
flex items-center gap-3 px-3 py-2 rounded-lg bg-white
border border-gray-200 hover:border-gray-300 hover:bg-gray-50/80
transition-all group
```
Contains: color pip (w-1.5 h-6), title (truncate), mono key (truncate), badges (whitespace-nowrap), chevron (h-3.5)

### Tree Connector (TreeChildRow)
- Vertical trunk: 2px wide, zinc-400, full-height (or to branch point for last child)
- Horizontal branch: 2px tall, zinc-400, width = TREE_INDENT - 8
- Endpoint dot: 6px circle, zinc-500

### Children Container (ViewTreeGroup)
```
relative rounded-b-lg
marginLeft: 16px, marginTop: 2px
paddingBottom: 4px, paddingRight: 4px
backgroundColor: rgba(243,244,246,0.4)
```

### Standalone Cards Grid
```
grid gap-4 grid-cols-1 lg:grid-cols-2
```

## Layout Principles

1. **Parent-child visual hierarchy**: Parents are full cards with border-l-4 and descriptions. Children are slim rows suitable for scanning, not reading.
2. **Tree lines must be visible**: 2px width in zinc-400 ensures tree structure is never lost behind card chrome.
3. **Renderer identification**: Small color pip on child rows preserves renderer-type color coding without the heavy border-l-4.
4. **Badges stay readable**: `whitespace-nowrap` and `flex-shrink-0` on badge containers prevents truncation. The expandable middle section (name + key) absorbs overflow.
5. **Subtle grouping**: Light background tint on children container visually groups nested items without hard borders.

## Accessibility Notes

- All interactive elements are `<Link>` or `<button>` elements
- Color coding supplemented by text labels (renderer type badge text)
- Hover states provide visual feedback (border-gray-300, bg-gray-50/80)
- Focus states inherited from base card/link styles
- Minimum text contrast ratios maintained (gray-800 on white for child names)
