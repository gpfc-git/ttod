# Implementation — Team 2, Task 6: Keyboard operability audit

Canonical source: [`ASSIGNMENT-graph-task6.md`](../ASSIGNMENTS/ASSIGNMENT-graph-task6.md)

## 1. Current state

Every node circle already has `role="button"`, `tabindex="0"`, a descriptive `aria-label`, and
an `onkeydown` handler for Enter/Space. The tag filter is a native `<select>`, keyboard
operable by default (Tab to focus, Arrow keys to change option, Enter/click to commit). This
task is an **audit**, not new feature work — its only real finding is the shared focus-loss
gap also tracked under Task 3.

## 2. Gap analysis against the task's acceptance criteria

| Criterion (ASSIGNMENT-graph-task6.md §4)                                       | Status                                            |
| ------------------------------------------------------------------------------ | ------------------------------------------------- |
| Every visible node has `role`, `tabindex`, `aria-label`, Enter/Space selection | ✅                                                |
| New filter control is keyboard-operable                                        | ✅ — native `<select>`                            |
| **Focus management when filtering removes the focused node**                   | ❌ — same gap identified and fixed in Task 3 §3.2 |

This task's deliverable is therefore: (a) confirm Task 3's fix actually closes the gap by
manually tabbing through the real UI, and (b) produce the audit record the detail sheet asks
for ("document the audit process... linking to the specific lines of code").

## 3. Audit checklist (perform manually, in a real browser, keyboard only — no mouse)

1. Load `/en/graph/`. Press Tab repeatedly from the top of the page.
2. Confirm the tag `<select>` receives focus with a visible focus ring, and that a visible
   label ("Tag") is read by the browser's accessibility tree (check via DevTools → Accessibility
   pane, not just visually).
3. Continue tabbing into the graph: confirm each node circle receives focus in a sensible
   order (DOM order == render order == section-then-id order from `radialLayout`).
4. On a focused node, press Enter — confirm the `<aside>` updates (Task 2) and focus stays on
   the node (no focus trap, no focus loss).
5. Press Space on a different focused node — confirm identical behavior to Enter.
6. With a node focused, use Shift+Tab back to the `<select>`, change the filter to a tag that
   excludes the currently-selected node — confirm (after Task 3's fix lands) that focus moves
   to the `<select>` itself, not to `<body>` or nowhere.
7. Confirm visible focus (an outline or equivalent) is present at every step above — if the
   default SVG/browser focus ring is suppressed anywhere, add a visible `:focus-visible` style
   on `.node` rather than removing the default outline.

## 4. What to fix if the audit finds a gap

If step 6 fails (focus silently lost), that is precisely Task 3 §3.2's fix — apply it there,
not duplicated here, and re-run this checklist afterward to confirm.

If step 7 finds the default SVG focus ring is invisible against the graph's background (a
real risk given `circle { stroke: Canvas; }` already uses the stroke for fill-adjacent
contrast), add:

```css
.node:focus-visible {
  stroke: #ffda00;
  stroke-width: 3;
}
```

## 5. Accessibility checklist

- [ ] Full keyboard tab-through completed with no dead ends.
- [ ] Focus is visibly indicated at every focusable element, including after filtering.
- [ ] Audit steps and findings recorded in the PR description per the detail sheet's
      requirement to document "the steps taken to verify keyboard operability."

## 6. Verification

```powershell
cd services/frontend
npm run dev
# manual only — this task has no automated test of its own; Task 7 covers the
# automatable subset (role/tabindex/aria-label assertions) in a component test
```

## 7. Cross-references

- Depends on Task 3's focus-redirect fix (§3.2) — do this audit _after_ Task 3 lands, or the
  audit will correctly report a failing checklist item that Task 3 is meant to fix.
- Task 7's component test should assert the static attributes (`role`, `tabindex`,
  `aria-label`) this audit confirms manually, so regressions are caught automatically next
  time, not only during a manual audit.
