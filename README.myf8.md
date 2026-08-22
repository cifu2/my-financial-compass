# Validation & Confirmation System (MYF-8)

Client-side validation, destructive-action confirmation, deletion undo, and
locale-localized dates for the My Financial Compass app.

## What was built

- `src/lib/validation.ts` — rule-based validators (`required`, `requiredSelect`,
  `mustBeNumber`, `greaterThan`, `minValue`, `maxValue`, `maxLength`,
  `isValidDate`, `notInFuture`) plus `validateField`/`validateFields` helpers
  with contextual, localized error messages (Spanish `es` default, `en`
  available).
- `src/lib/dates.ts` — `formatDate` (DD/MM/YYYY for `es`, MM/DD/YYYY for `en`),
  `parseDate`, `toInputDate`. All date display goes through local format so
  Spanish renders `22/08/2026`.
- `src/lib/i18n.ts` — `translate(locale, key)` UI strings for forms, delete
  confirmations, undo, and section labels.
- `src/components/ConfirmDialog.tsx` — accessible `alertdialog` for any
  destructive action: visible labels, `aria-modal`, Escape to cancel, focus
  restored to the trigger, cancel + destructive confirm actions.
- `src/hooks/useUndo.ts` — time-limited undo stack. Entries stay restorable for
  a duration clamped to the required 5–10 second window (default 8s) then are
  automatically dropped.
- `src/components/UndoToast.tsx` — live-region toast that shows a deleted item
  and its `Undo` action until the window expires or the user dismisses it.
- `src/state/AppState.tsx` — shared store for transactions, categories,
  investments, budgets with `remove`/`restore` used by the undo flows and
  `initialStore` support for tests.

## Integration

- Transactions page: validated new-transaction form (required concept, positive
  amount, income/expense type, category, localized date with future-date
  guard), category add/delete, delete transactions and categories via
  ConfirmDialog with 5–10s undo toast.
- Investments page: validated add form, portfolio table with confirm + undo
  deletion, localized dates.
- Settings page: language selector drives the localized date format (DD/MM/YYYY
  when Spanish is selected).

## Verification

- `npx tsc -b` clean.
- `npx vitest run` — all tests pass (suite covers validation messages, date
  localization, ConfirmDialog focus/Escape, useUndo expiry/restore, and a full
  end-to-end create → confirm → undo flow).
- `npx vite build` clean.