Fix the pre-existing ESLint error in `client/src/components/flag-form-modal.tsx`.

## The Problem

`react-hooks/set-state-in-effect` error at line 76: `setFormData` and `setTagsInput` are called synchronously inside a `useEffect`, which ESLint flags as a cascading render risk.

## The Fix

The `useEffect` is redundant because `handleOpenChange` already resets form state when the dialog opens or closes. Remove the `useEffect` and instead force a remount of `FlagFormModal` by adding a `key` prop in `App.tsx` — this gives each flag (or "new") its own fresh component instance with correct initial state.

### Step 1 — Remove the `useEffect` from `flag-form-modal.tsx`

Remove the `useEffect` import (if no longer used) and delete the effect block:

```tsx
useEffect(() => {
  if (open) {
    setFormData(initialData)
    setTagsInput(initialTags)
  }
}, [open, initialData, initialTags])
```

Also remove `useEffect` from the import line if it's the only remaining usage.

### Step 2 — Add `key` prop to `FlagFormModal` in `App.tsx`

In `client/src/App.tsx`, find the `<FlagFormModal` JSX and add `key={selectedFlag?.id ?? 'new'}`:

```tsx
<FlagFormModal
  key={selectedFlag?.id ?? 'new'}
  open={isFormOpen}
  ...
/>
```

This causes React to unmount and remount `FlagFormModal` whenever `selectedFlag` changes, so `useState` initializes fresh from `initialData` — no effect needed.

### Step 3 — Validate

```bash
cd client && pnpm run lint
```

Confirm zero errors before finishing.
