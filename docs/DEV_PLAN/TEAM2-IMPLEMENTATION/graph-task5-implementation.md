# Implementation — Team 2, Task 5: Layout and performance at real corpus scale

Canonical source: [`ASSIGNMENT-graph-task5.md`](../ASSIGNMENTS/ASSIGNMENT-graph-task5.md)

## 1. Current state

`radialLayout` (`layout.ts`) groups nodes by `section`, computes one angle per section and
one ring position per node within its section — an O(n) pass with a `Map`, no nested loops
over the full node set. No profiling evidence exists yet in the repo, and no DOM
virtualization/culling is implemented: every node in the filtered set becomes one real SVG
`<circle>`, every edge one real `<line>`.

**Real corpus scale**: `ttod.yml` → `meta.total_quotes: 460`. The backend's
`SnapshotService.wisdom()` / `.graph_bytes()` (`services/backend/app/storage.py`) apply only
the `is_public_active` rights filter — there is no sampling or count cap despite the
`/api/v1/wisdom/sample` route name. So "full governed dataset" here means roughly a few
hundred nodes after the public/active/rights filters, not a small fixture set — but also not
tens of thousands. This changes what's worth optimizing: a virtualization library is probably
overkill at this scale; the likely real bottleneck is unnecessary re-renders, not raw DOM
count.

## 2. Gap analysis against the task's acceptance criteria

| Criterion (ASSIGNMENT-graph-task5.md §4-5)                                 | Status                                |
| -------------------------------------------------------------------------- | ------------------------------------- |
| Constraint compliance — keep using `radialLayout` from `layout.ts` exactly | not yet exercised — no profiling done |
| Accessibility preservation during any optimization                         | N/A until an optimization is chosen   |
| State integrity (`$state`/`$derived` consistent)                           | N/A until an optimization is chosen   |
| **Evidence-based optimization with before/after numbers**                  | ❌ — nothing measured yet             |

## 3. Profiling runbook (do this before writing any optimization code)

1. **Get a realistic dataset.** Run the full stack (`make up` or the frontend against a live
   backend pointed at the real `ttod.yml`) so `/api/v1/graph` and `/api/v1/wisdom/sample`
   return the full ~460-quote-derived node/edge set, not a hand-written test fixture.
2. **Record a baseline trace.** Open `/en/graph/` in Chrome DevTools → Performance tab, hit
   Record, then: reload, clear the tag filter, select a few nodes, change the tag filter a
   few times, stop recording.
3. **Read the flame chart for three specific costs**, not just "total time":
   - Time inside `radialLayout` itself (look for the function name in the JS stack).
   - Time spent in `Recalculate Style` / `Layout` / `Paint` for the `<svg>` subtree — this is
     the DOM-node-count cost (one `<circle>`/`<line>` per node/edge).
   - Time spent in Svelte's own reactivity (`$derived` recomputation) — if `filtered`, `nodes`,
     `positioned`, and `edges` all recompute in a chain on every `activeTag` change, confirm
     that chain isn't recomputing more than once per actual state change.
4. **Identify the single largest cost.** Do not guess — write down the actual millisecond
   numbers from the trace before touching code.

## 4. Likely findings and matching fixes (confirm against your own trace before applying)

- **If `radialLayout` itself is cheap (likely, given O(n) with ~460 nodes)**: do not optimize
  it further — the task explicitly says not to fork or rewrite it without evidence of a real
  bottleneck there.
- **If DOM node count dominates paint/layout**: the simplest evidence-based fix is reducing
  per-node rendering cost, not virtualization — e.g. replacing per-node `<title>` tooltips
  (which add an extra DOM node each) with a single shared tooltip driven by `aria-label`/hover
  state, or batching the `gsap.fromTo` stagger call so it animates one `<g>` transform instead
  of per-circle transforms.
- **If Svelte re-render overhead dominates**: check whether `tags` (`$derived([...new
Set(allNodes.flatMap(...))].sort())`) recomputes on every `activeTag` change even though it
  only depends on `allNodes` — if so, it's accidentally re-running a `flatMap` + `Set` + `sort`
  over the _unfiltered_ full node list on every filter change for no reason, since `tags`
  doesn't depend on `activeTag` at all. Svelte 5's `$derived` should already skip this if the
  dependency tracking is correct — verify it actually does, since this is the one existing
  `$derived` that doesn't need to recompute per filter change and is a candidate first check.

## 5. What to do after measuring

1. Pick exactly one fix justified by your own trace numbers.
2. Implement it without touching `layout.ts`'s public function signatures (`radialLayout`,
   `joinTags`, `filterGraph`) unless the trace proves a genuine bug inside one of them.
3. Re-profile with the same steps and record the after numbers.
4. Confirm `node --test src/components/graph/layout.test.mjs` still passes unmodified and that
   keyboard operability (Task 6) and the `aria-live` announcements (Tasks 2-3) still work.

## 6. Verification

```powershell
cd services/frontend
node --test src/components/graph/layout.test.mjs   # must still pass, unmodified
npx astro check
npm run dev
# DevTools Performance tab: record before/after traces per the runbook above, save both
# as screenshots/exports for the PR description — "it feels faster" is not acceptable evidence
```

## 7. Cross-references

- Any optimization must not reintroduce the reduced-motion gap closed in Task 2 — if you
  change how the entrance animation batches, re-check the `prefers-reduced-motion` guard.
- Keep Task 6's keyboard audit in mind: culling or restructuring DOM nodes must not break
  `tabindex`/`aria-label` on the nodes that remain.
