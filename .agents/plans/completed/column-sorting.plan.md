# Plan: Column Sorting for Feature Flags Table

## Summary

Add client-side column sorting to `FlagsTable`. Sort state (active column + direction) lives inside the component itself via `useState` — no backend changes, no prop drilling. Clicking a `TableHead` sorts ascending; clicking again toggles to descending. An arrow icon from `lucide-react` shows which column is active and in which direction.

## User Story

As a client using the feature flag manager
I want to click a column header to sort the table by that column
So that I can find flags faster (e.g., most recently created)

## Metadata

| Field | Value |
|-------|-------|
| Type | ENHANCEMENT |
| Complexity | LOW |
| Systems Affected | `client/src/components/flags-table.tsx` only |

---

## Patterns to Follow

### State Management
```typescript
// SOURCE: client/src/App.tsx:16-19
const [isFormOpen, setIsFormOpen] = useState(false)
const [selectedFlag, setSelectedFlag] = useState<FeatureFlag | null>(null)
const [filters, setFilters] = useState<FlagFilters>({})
```
Use `useState` with explicit generic type. Union types for nullable values.

### Icon Usage (already in file)
```typescript
// SOURCE: client/src/components/flags-table.tsx:12
import { Pencil, Trash2 } from 'lucide-react'
```
Add sort icons from the same `lucide-react` import.

### Tailwind className on TableHead
```typescript
// SOURCE: client/src/components/flags-table.tsx:54
<TableHead className="text-right">Actions</TableHead>
```
Pass `className` directly; use `cursor-pointer select-none` for clickable headers.

### Button-style click handler
```typescript
// SOURCE: client/src/components/flags-table.tsx:97
onClick={() => onEdit(flag)}
```
Inline arrow function on the element.

---

## Files to Change

| File | Action | Purpose |
|------|--------|---------|
| `client/src/components/flags-table.tsx` | UPDATE | Add sort state, sort logic, clickable headers, arrow icons |

No other files need to change — sorting is pure client-side on the already-fetched `flags` array.

---

## Tasks

### Task 1: Add sort state and sorted flags derivation

- **File**: `client/src/components/flags-table.tsx`
- **Action**: UPDATE
- **Implement**:
  1. Add `useState` import if not present (already there via React).
  2. Add two new imports from `lucide-react`: `ArrowUpDown`, `ArrowUp`, `ArrowDown`.
  3. Define a `SortDirection` type: `'asc' | 'desc'`.
  4. Define `SortColumn` as the union of sortable column keys: `'name' | 'enabled' | 'environment' | 'type' | 'rolloutPercentage' | 'owner'`.
  5. Inside `FlagsTable` (before the early-return), add:
     ```typescript
     const [sortColumn, setSortColumn] = useState<SortColumn | null>(null)
     const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
     ```
  6. Add a `handleSort` function:
     ```typescript
     function handleSort(column: SortColumn) {
       if (sortColumn === column) {
         setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
       } else {
         setSortColumn(column)
         setSortDirection('asc')
       }
     }
     ```
  7. Derive `sortedFlags` from `flags`:
     ```typescript
     const sortedFlags = sortColumn === null ? flags : [...flags].sort((a, b) => {
       const aVal = a[sortColumn]
       const bVal = b[sortColumn]
       const cmp =
         typeof aVal === 'boolean'
           ? Number(aVal) - Number(bVal)
           : String(aVal).localeCompare(String(bVal))
       return sortDirection === 'asc' ? cmp : -cmp
     })
     ```
  8. Use `sortedFlags` in the `.map()` instead of `flags`.
- **Mirror**: `client/src/App.tsx:16-19` — state pattern
- **Validate**: `cd client && pnpm run build`

### Task 2: Make column headers clickable with sort indicator

- **File**: `client/src/components/flags-table.tsx`
- **Action**: UPDATE
- **Implement**:
  1. Add a helper component (or inline JSX) `SortIcon` that renders:
     - `ArrowUpDown` (gray) when the column is not the active sort column
     - `ArrowUp` when active and `sortDirection === 'asc'`
     - `ArrowDown` when active and `sortDirection === 'desc'`
  2. Update each sortable `TableHead` to:
     ```tsx
     <TableHead
       className="cursor-pointer select-none"
       onClick={() => handleSort('name')}
     >
       <span className="flex items-center gap-1">
         Name <SortIcon column="name" />
       </span>
     </TableHead>
     ```
  3. Apply the same pattern to: **Status** (`enabled`), **Environment** (`environment`), **Type** (`type`), **Rollout** (`rolloutPercentage`), **Owner** (`owner`).
  4. Leave **Tags** and **Actions** headers non-sortable (no `onClick`, no icon).
- **Mirror**: `client/src/components/flags-table.tsx:47-54` — existing `TableHead` structure
- **Validate**: `cd client && pnpm run build && pnpm run lint`

---

## Validation

```bash
# Type check + build
cd client && pnpm run build

# Lint
cd client && pnpm run lint
```

No server tests needed — this is a pure frontend change.

---

## Acceptance Criteria

- [ ] Clicking Name, Status, Environment, Type, Rollout, Owner headers sorts the table
- [ ] First click → ascending; second click on same column → descending
- [ ] Active sort column shows directional arrow; inactive columns show neutral icon
- [ ] Tags and Actions columns are not sortable
- [ ] Type check and lint pass with zero errors
