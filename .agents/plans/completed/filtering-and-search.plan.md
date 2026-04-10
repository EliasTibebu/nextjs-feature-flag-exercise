# Plan: Filtering & Search (Phase 5)

## Summary

Add query param support to `GET /api/flags` for server-side filtering by environment, type, enabled status, and owner, plus a name substring search. Wire this up through the API client, React Query, and a new filter bar UI component above the flags table.

## User Story

As a software engineer
I want to filter and search feature flags by environment, status, type, owner, and name
So that I can quickly locate relevant flags within 10 seconds

## Metadata

| Field | Value |
|-------|-------|
| Type | ENHANCEMENT |
| Complexity | MEDIUM |
| Systems Affected | server/routes, server/services, server/middleware, server/tests, client/api, client/App.tsx, client/components |

---

## Patterns to Follow

### Zod Schema (for query params validation)
```typescript
// SOURCE: server/src/middleware/validation.ts:3-15
export const createFlagSchema = z.object({
  environment: z.enum(['development', 'staging', 'production']),
  type: z.enum(['release', 'experiment', 'operational', 'permission']),
  enabled: z.boolean(),
  // ...
})
// New filterFlagsSchema mirrors same enum values but all fields optional
```

### Service SQL pattern (parameterized queries)
```typescript
// SOURCE: server/src/services/flags.ts:93-107
const stmt = db.prepare('SELECT * FROM flags WHERE id = ?')
try {
  stmt.bind([id])
  if (stmt.step()) {
    const row = stmt.getAsObject() as unknown as DbRow
    return rowToFlag(row)
  }
} finally {
  stmt.free()
}
// For filtering: build WHERE clause dynamically with conditions[] and params[]
// then use db.exec() with bound values (exec doesn't support .bind; use stmt pattern)
```

### Dynamic UPDATE pattern (for building WHERE clauses)
```typescript
// SOURCE: server/src/services/flags.ts:190-234
const updates: string[] = []
const values: (string | number | null)[] = []
if (input.name !== undefined) {
  updates.push('name = ?')
  values.push(input.name)
}
// Same pattern for filters: conditions[] + params[]
```

### getAllFlags current implementation
```typescript
// SOURCE: server/src/services/flags.ts:86-90
export async function getAllFlags(): Promise<FeatureFlag[]> {
  const db = await getDb()
  const result = db.exec('SELECT * FROM flags ORDER BY created_at DESC')
  return resultToRows(result).map(rowToFlag)
}
// db.exec() with static SQL - needs to change to stmt + bind for dynamic filters
```

### Route handler pattern
```typescript
// SOURCE: server/src/routes/flags.ts:8-18
flagsRouter.get('/', async (_req, res, next) => {
  try {
    const flags = await getAllFlags()
    res.json(flags)
  } catch (error) {
    next(error)
  }
})
// Change _req → req, extract req.query, validate, pass to service
```

### React Query with params
```typescript
// SOURCE: client/src/App.tsx:19-22
const { data: flags = [], isLoading, error } = useQuery({
  queryKey: ['flags'],
  queryFn: getFlags,
})
// Change to: queryKey: ['flags', filters], queryFn: () => getFlags(filters)
```

### API fetch pattern
```typescript
// SOURCE: client/src/api/flags.ts:35-45
export async function getFlags(): Promise<FeatureFlag[]> {
  try {
    const response = await fetch(`${API_BASE}/flags`)
    return handleResponse<FeatureFlag[]>(response)
  } catch (e) {
    if (e instanceof TypeError) {
      throw new Error('Unable to connect to server. Please check your connection.')
    }
    throw e
  }
}
// Add optional params arg, build URLSearchParams, append to URL
```

### Component badge/color pattern
```typescript
// SOURCE: client/src/components/flags-table.tsx:20-31
const environmentColors: Record<Environment, string> = {
  development: 'bg-blue-100 text-blue-800 ...',
  // ...
}
// Reuse these same color maps in filter bar for visual consistency
```

### Test patterns
```typescript
// SOURCE: server/src/__tests__/flags.test.ts:41-53
describe('getAllFlags', () => {
  it('returns empty array when no flags exist', async () => {
    const flags = await getAllFlags()
    expect(flags).toEqual([])
  })
  it('returns all flags', async () => {
    await createFlag(validFlagInput)
    const flags = await getAllFlags()
    expect(flags).toHaveLength(1)
    expect(flags[0].name).toBe('test-flag')
  })
})
// New describe block: 'getAllFlags with filters'
// Create multiple flags, assert only matching ones returned
```

---

## Files to Change

| File | Action | Purpose |
|------|--------|---------|
| `shared/types.ts` | UPDATE | Add `FlagFilters` type |
| `server/src/middleware/validation.ts` | UPDATE | Add `filterFlagsSchema` Zod schema |
| `server/src/services/flags.ts` | UPDATE | Accept `FlagFilters` in `getAllFlags`, build dynamic SQL |
| `server/src/routes/flags.ts` | UPDATE | Extract query params, validate, pass to service |
| `server/src/__tests__/flags.test.ts` | UPDATE | Add filter test cases |
| `client/src/api/flags.ts` | UPDATE | Accept optional filters, build query string |
| `client/src/App.tsx` | UPDATE | Add filter state, pass to query |
| `client/src/components/flags-filter-bar.tsx` | CREATE | Filter UI: dropdowns + search input + clear button |

---

## Tasks

### Task 1: Add `FlagFilters` type to shared types

- **File**: `shared/types.ts`
- **Action**: UPDATE
- **Implement**: Add exported interface `FlagFilters` with all fields optional:
  ```typescript
  export interface FlagFilters {
    environment?: Environment
    type?: FlagType
    enabled?: boolean
    owner?: string
    search?: string   // substring match on name
  }
  ```
- **Mirror**: `shared/types.ts:32-42` — same optional pattern as `UpdateFlagInput`
- **Validate**: `cd server && pnpm run build`

---

### Task 2: Add `filterFlagsSchema` to validation middleware

- **File**: `server/src/middleware/validation.ts`
- **Action**: UPDATE
- **Implement**: Add a new exported Zod schema that validates query params for the list endpoint:
  ```typescript
  export const filterFlagsSchema = z.object({
    environment: z.enum(['development', 'staging', 'production']).optional(),
    type: z.enum(['release', 'experiment', 'operational', 'permission']).optional(),
    enabled: z.enum(['true', 'false']).transform(v => v === 'true').optional(),
    owner: z.string().optional(),
    search: z.string().optional(),
  })
  ```
  Note: `enabled` comes in as a string query param (`'true'`/`'false'`), so use `.transform` to convert to boolean.
- **Mirror**: `server/src/middleware/validation.ts:3-13` — same enum values
- **Validate**: `cd server && pnpm run build`

---

### Task 3: Update `getAllFlags` service to accept and apply filters

- **File**: `server/src/services/flags.ts`
- **Action**: UPDATE
- **Implement**:
  1. Import `FlagFilters` from shared types
  2. Change signature to `getAllFlags(filters?: FlagFilters): Promise<FeatureFlag[]>`
  3. Build dynamic WHERE clause using the same `conditions[]` + `params[]` pattern from `updateFlag` (lines 190-234):
     - `environment` → exact match: `environment = ?`
     - `type` → exact match: `type = ?`
     - `enabled` → `enabled = ?` with boolean→0/1 conversion
     - `owner` → exact match: `owner = ?`
     - `search` → LIKE: `name LIKE ?` with `%${search}%`
  4. When no filters: use existing `db.exec('SELECT * FROM flags ORDER BY created_at DESC')`
  5. When filters present: use `db.prepare(sql)` + `stmt.bind(params)` + iterate with `stmt.step()` in try-finally, then collect rows via `stmt.getAsObject()`
- **Mirror**: `server/src/services/flags.ts:93-107` for stmt pattern; `server/src/services/flags.ts:190-232` for dynamic condition building
- **Validate**: `cd server && pnpm run build`

---

### Task 4: Update GET `/api/flags` route to extract and pass filters

- **File**: `server/src/routes/flags.ts`
- **Action**: UPDATE
- **Implement**:
  1. Import `filterFlagsSchema` from validation middleware
  2. Change `_req` → `req` in the GET `/` handler
  3. Parse `req.query` with `filterFlagsSchema.parse(req.query)` — wrap in try-catch with `next(error)` on failure
  4. Pass parsed filters to `getAllFlags(filters)`
- **Mirror**: `server/src/routes/flags.ts:34-42` — same schema.parse + next(error) pattern
- **Validate**: `cd server && pnpm run build`

---

### Task 5: Add filter tests

- **File**: `server/src/__tests__/flags.test.ts`
- **Action**: UPDATE
- **Implement**: Add a new `describe('getAllFlags with filters')` block. Create 3-4 flags with different environments/types/enabled states. Test:
  - `environment` filter returns only matching flags
  - `type` filter returns only matching flags
  - `enabled` filter returns only enabled/disabled flags
  - `search` filter does case-insensitive substring match on name
  - Multiple filters combined (environment + enabled)
  - No results when no match
- **Mirror**: `server/src/__tests__/flags.test.ts:41-53` — same describe/it/expect structure; `flags.test.ts:28-34` for beforeEach db reset pattern
- **Validate**: `cd server && pnpm test`

---

### Task 6: Update `getFlags` API client to accept filters

- **File**: `client/src/api/flags.ts`
- **Action**: UPDATE
- **Implement**:
  1. Import `FlagFilters` type from `@shared/types`
  2. Change signature to `getFlags(filters?: FlagFilters): Promise<FeatureFlag[]>`
  3. Build `URLSearchParams` from filters, skipping undefined values. For `enabled`, convert boolean to string (`'true'`/`'false'`).
  4. Append non-empty params to the URL: `` `${API_BASE}/flags?${params}` `` or just `` `${API_BASE}/flags` `` when no filters
- **Mirror**: `client/src/api/flags.ts:35-45` — same fetch + handleResponse + TypeError catch pattern
- **Validate**: `cd client && pnpm run build`

---

### Task 7: Create `FlagsFilterBar` component

- **File**: `client/src/components/flags-filter-bar.tsx`
- **Action**: CREATE
- **Implement**: A controlled component that renders filter inputs and calls `onChange` when any filter changes:
  ```typescript
  interface FlagsFilterBarProps {
    filters: FlagFilters
    onChange: (filters: FlagFilters) => void
    onClear: () => void
  }
  ```
  - Text input for `search` (name substring) — use `Input` from `@/components/ui/input`
  - `Select` (Radix, from `@/components/ui/select`) for `environment` with options: All / development / staging / production
  - `Select` for `type` with options: All / release / experiment / operational / permission
  - `Select` for `enabled` with options: All / Enabled / Disabled
  - "Clear filters" `Button` (variant="outline") that calls `onClear` — only show when any filter is active
  - Wrap in a `div` with `flex gap-2 items-center mb-4` layout
- **Mirror**: `client/src/components/flags-table.tsx:20-31` for env/type constants; `client/src/components/flag-form-modal.tsx` for Select usage patterns
- **Validate**: `cd client && pnpm run build`

---

### Task 8: Wire filters into `App.tsx`

- **File**: `client/src/App.tsx`
- **Action**: UPDATE
- **Implement**:
  1. Import `FlagFilters` type and `FlagsFilterBar` component
  2. Add filter state: `const [filters, setFilters] = useState<FlagFilters>({})`
  3. Update `useQuery`:
     - `queryKey: ['flags', filters]`
     - `queryFn: () => getFlags(filters)`
  4. Add `handleClearFilters` that calls `setFilters({})`
  5. Render `<FlagsFilterBar filters={filters} onChange={setFilters} onClear={handleClearFilters} />` between the header row and the loading/table conditional
- **Mirror**: `client/src/App.tsx:15-22` for useState + useQuery pattern
- **Validate**: `cd client && pnpm run build`

---

## Validation

```bash
# Type check + lint + tests (server)
cd server && pnpm run build && pnpm run lint && pnpm test

# Type check + build (client)
cd client && pnpm run build && pnpm run lint
```

---

## Acceptance Criteria

- [ ] `GET /api/flags?environment=production` returns only production flags
- [ ] `GET /api/flags?enabled=true` returns only enabled flags
- [ ] `GET /api/flags?type=release` returns only release flags
- [ ] `GET /api/flags?search=auth` returns flags whose name contains "auth"
- [ ] Multiple query params combined work correctly
- [ ] Frontend filter bar renders dropdowns for environment, type, enabled + search input
- [ ] Changing any filter triggers a new API request (React Query refetch)
- [ ] "Clear filters" button resets all filters and shows all flags
- [ ] All server tests pass including new filter tests
- [ ] TypeScript strict mode passes with zero errors
- [ ] ESLint passes with zero errors
