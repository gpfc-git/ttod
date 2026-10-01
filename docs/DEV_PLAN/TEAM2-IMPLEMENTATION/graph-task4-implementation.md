# Implementation — Team 2, Task 4: URL state for the current selection/filter

Canonical source: [`ASSIGNMENT-graph-task4.md`](../ASSIGNMENTS/ASSIGNMENT-graph-task4.md)

## 1. Current state

`layout.ts` exports `selectedTag(search: string): string`, reading only the `tag` query
parameter. `GraphIsland.svelte`'s `syncFromUrl()` calls it on mount and on `popstate`, and
`setTag()` writes `?tag=` via `history.pushState`. **There is no `node` query parameter
anywhere** — `selectNode()` calls `setTag(node.tags[0] ?? '', false)` but never records which
specific node was selected in the URL.

This is a genuine functional gap, not polish: per `docs/DEV_PLAN/PHASE-R4-REPORT.md`, the
reference solution deliberately scoped URL sync to "only the `tag` query key" — a documented,
intentional reduction relative to this task's own published contract
(`?tag=architecture&node=arch-031`, ASSIGNMENT-graph-task4.md §3). Closing that gap is this
task's actual work.

## 2. Gap analysis against the task's acceptance criteria

| Criterion (ASSIGNMENT-graph-task4.md §4)                     | Status                                                                                                          |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| Tag filter reflected in URL, reload/back-forward restores it | ✅                                                                                                              |
| **URL state drives rendering for BOTH tag and node**         | ❌ — only tag is restored on load                                                                               |
| Back/forward navigation works                                | ⚠️ partial — works for tag, not for node selection                                                              |
| Invalid state handling (bad tag/node id doesn't crash)       | ⚠️ tag: implicitly safe (unknown tag just filters to empty set); node: not applicable yet since node isn't read |

## 3. Implementation steps

### 3.1 Add `selectedNode()` to `layout.ts`

Mirror the existing `selectedTag` function exactly — same shape, same file, same test pattern:

```ts
export function selectedNode(search: string): string {
  return new URLSearchParams(search).get("node") ?? "";
}
```

### 3.2 Write `?node=` alongside `?tag=`

Extend `setTag` to accept and persist an explicit node id (defaulting to clearing it), and
have `selectNode` pass its own id through. **This must preserve Task 2's reduced-motion guard
and Task 3's focus-redirect fix — do not drop either while adding the `nodeId` parameter:**

```ts
function setTag(tag: string, clearSelection = true, nodeId = "") {
  const focusedWasNode = document.activeElement?.classList?.contains("node"); // from Task 3
  const url = new URL(window.location.href);
  if (tag) url.searchParams.set("tag", tag);
  else url.searchParams.delete("tag");
  if (nodeId) url.searchParams.set("node", nodeId);
  else url.searchParams.delete("node");
  history.pushState({}, "", url);
  activeTag = tag;
  if (clearSelection) selected = null;
  requestAnimationFrame(() => {
    if (focusedWasNode && !document.body.contains(document.activeElement)) {
      (
        document.querySelector(
          ".graph-island select",
        ) as HTMLSelectElement | null
      )?.focus(); // from Task 3
    }
    if (reducedMotion()) return; // from Task 2
    gsap.fromTo(
      graphRoot.querySelectorAll(".node"),
      { opacity: 0, scale: 0.6 },
      {
        opacity: 1,
        scale: 1,
        duration: 0.45,
        stagger: 0.006,
        ease: "back.out(1.5)",
      },
    );
  });
}

function selectNode(node: PositionedNode) {
  selected = node;
  setTag(node.tags[0] ?? "", false, node.id);
}
```

### 3.3 Resolve `selected` from the URL once nodes are loaded

`syncFromUrl` currently only sets `activeTag`. It needs to also resolve a `node` id into the
`selected` object — but only once `allNodes` (and therefore `nodes`, after layout) is
populated, since the id needs to be looked up in the positioned node list:

```ts
function syncFromUrl() {
  activeTag = selectedTag(window.location.search);
  const nodeId = selectedNode(window.location.search);
  selected = nodeId ? (nodes.find((node) => node.id === nodeId) ?? null) : null;
}
```

Because `syncFromUrl` already runs on `popstate` and once after the initial fetch resolves,
call it again after `allNodes`/`allEdges` are set in `onMount`'s fetch `try` block, so the
very first load (not just back/forward) restores a `?node=` deep link:

```ts
allNodes = joinTags(graph.nodes, wisdom);
allEdges = graph.edges;
syncFromUrl(); // re-resolve now that `nodes` can actually contain the requested id
```

### 3.4 Invalid id handling

`nodes.find(...)` returning `undefined` already degrades to `selected = null` — no crash, no
stale `<aside>`. Same for an unknown `tag`: `filterGraph` returns an empty node list, and the
existing "No nodes carry this tag." empty state renders. Both edge cases from
ASSIGNMENT-graph-task4.md §4.4 are satisfied by this design without extra branching.

## 4. Accessibility checklist

- [ ] Restoring a `?node=` deep link on fresh page load shows the same `<aside>` content as
      if the user had just clicked that node (reuses Task 2's `aria-live` region — no new
      announcement logic needed).
- [ ] An invalid `?node=` id resets to "nothing selected" instead of showing stale or broken
      data.
- [ ] Back/forward through a sequence of filter + node selections restores each step exactly.

## 5. Verification

```powershell
cd services/frontend
node --test src/components/graph/layout.test.mjs   # extend with a selectedNode() test, see below
npx astro check
npm run dev
# manual: select a node, copy the URL, open it in a new tab -> same node selected
# manual: use browser back/forward across several selections -> each one restores correctly
# manual: manually edit the URL to an id that doesn't exist -> no crash, selection clears
```

Add to `layout.test.mjs`:

```js
test("selectedNode reads only the node param", () => {
  assert.equal(selectedNode("?tag=focus&node=a-001"), "a-001");
  assert.equal(selectedNode("?tag=focus"), "");
});
```

## 6. Cross-references

- Must land after Task 3 (shares the same `URL`/`history.pushState` call sites) — re-run
  Task 3's manual focus-management checks afterward, since `setTag`'s signature changes.
- Task 7's component test should assert that selecting a node updates `window.location.search`
  to include `node=<id>`, proving this task's contract rather than just the DOM text update.
