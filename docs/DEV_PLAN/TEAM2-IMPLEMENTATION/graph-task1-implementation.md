# Implementation — Team 2, Task 1: Fetch and render the graph from the governed API

Canonical source: [`ASSIGNMENT-graph-task1.md`](../ASSIGNMENTS/ASSIGNMENT-graph-task1.md)

## 1. Current state

`services/frontend/src/components/graph/GraphIsland.svelte` already implements the full
pipeline this task asks for:

- `onMount` (starts at line 44) fetches `GET /api/v1/graph` and `GET /api/v1/wisdom/sample` in
  parallel (the two `fetch` calls are at lines 50-51).
- The payload is joined with `joinTags(graph.nodes, wisdom)` and laid out with
  `radialLayout(filtered.nodes)` via `$derived` (lines 15-16) — both pure functions live in
  `layout.ts`, nothing is reimplemented in the component.
- Nodes render as SVG `<circle>` elements with `role="button"`, `tabindex="0"`,
  `aria-label={`${node.id}: ${node.text}`}`, and an `onkeydown` handler for Enter/Space.
- `loading` / `error` / empty-result (`nodes.length === 0`) states are all handled before the
  `<svg>` renders.

This task is therefore **audit-and-document**, not build-from-zero: there is no missing
functional piece, only verification that the existing pipeline still matches the task's own
constraints as later tasks (3-5) touch the same file.

## 2. Gap analysis against the task's acceptance criteria

| Criterion (ASSIGNMENT-graph-task1.md §4)                                                | Status                                                |
| --------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| Layout stays shared (`radialLayout` after `joinTags`, no hand-placed SVG)               | ✅ holds — verify it still holds after tasks 3-5 land |
| Hello-world selection still works (click/Enter/Space → `<aside>` text)                  | ✅ holds                                              |
| Keyboard parity (`role`, `tabindex`, `aria-label`, Enter/Space)                         | ✅ holds                                              |
| Fetch integrity (only `/api/v1/graph` + `/api/v1/wisdom/sample`, no new backend routes) | ✅ holds                                              |

No code change required for this task alone. The only real risk is **regression** introduced
by tasks 2-5 editing the same file — this doc's job is to be the baseline snapshot those
other docs diff against.

## 3. What to actually do

1. Read `GraphIsland.svelte` end to end and confirm the data flow matches:
   `fetch → joinTags → filterGraph('') → radialLayout → SVG render → selectNode`.
2. Confirm `layout.ts` is untouched by anything component-local (no duplicate layout math in
   the `.svelte` file — currently true).
3. Add a one-line comment above the `onMount` fetch block documenting the data-flow order,
   since that's the one thing the task explicitly asks to "document" that the code doesn't
   show on its own (why two parallel fetches are joined client-side rather than one backend
   endpoint — see `docs/DEV_PLAN/PHASES/R4-svelte-graph-island.md` §3, "the backend never
   ships coordinates / tags").
4. No new dependency, no new endpoint.

## 4. Accessibility checklist

- [x] Every node is a real SVG `<circle role="button" tabindex="0" aria-label=...>`.
- [x] Enter and Space both trigger `selectNode`.
- [x] Loading/error states are plain text, not silent blank screens.
- [ ] (Covered by Task 2, not here) `<aside>` lacks `aria-live` — do not fix in this task's
      PR, it belongs to Task 2's scope.

## 5. Verification

```powershell
cd services/frontend
node --test src/components/graph/layout.test.mjs   # pure-logic tests, must stay green
npx astro check                                     # 0 errors
npm run dev                                          # then open /en/graph/ and confirm:
#   - nodes render without a filter applied
#   - clicking a node shows its text in the <aside>
#   - Tab + Enter/Space on a node does the same
```

## 6. Cross-references

- Task 2 adds `aria-live` to the `<aside>` this task renders — don't duplicate that work here.
- Tasks 2-6 all edit this same file (Task 7 only adds a new, separate test file); re-run this
  task's verification checklist after each of those lands to catch regressions early.
