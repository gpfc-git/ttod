# Implementation — Team 2, Task 3: Tag-filter interaction

Canonical source: [`ASSIGNMENT-graph-task3.md`](../ASSIGNMENTS/ASSIGNMENT-graph-task3.md)

## 1. Current state

The filter control is already wired end to end:

```svelte
<select value={activeTag} onchange={(event) => setTag(event.currentTarget.value)}>
  <option value="">All tags</option>
  {#each tags as tag}<option value={tag}>{tag}</option>{/each}
</select>
```

`setTag` calls `filterGraph` indirectly through the `$derived(filterGraph(allNodes, allEdges, activeTag))`
chain, writes `?tag=` to the URL via `history.pushState`, and clears `selected` by default.
`layout.ts`'s `filterGraph` is untouched by the component — exactly what the task requires
("the filtering logic must remain in `layout.ts`").

## 2. Gap analysis against the task's acceptance criteria

| Criterion (ASSIGNMENT-graph-task3.md §4-5)                            | Status                                                                                                                                                                                                                                                           |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tag filter reflected in URL                                           | ✅ (`?tag=`)                                                                                                                                                                                                                                                     |
| Layout stays shared (filtered set re-run through `radialLayout`)      | ✅ — `$derived(radialLayout(filtered.nodes))`                                                                                                                                                                                                                    |
| Hello-world selection still works while filtered                      | ✅ — the filter `<select>`'s `onchange` calls `setTag(value)` with the default `clearSelection=true`, clearing a stale `selected` on every external tag change (`selectNode` itself always passes `false`, so direct node clicks never lose their own selection) |
| Accessible name on the filter control                                 | ✅ — implicit `<label>Tag <select>...` wrapping                                                                                                                                                                                                                  |
| Keyboard operability of the control                                   | ✅ — native `<select>`, Tab/Arrow/Enter work by default                                                                                                                                                                                                          |
| **`aria-live` announcement of filter changes ("Filtered to tag: X")** | ❌ — missing                                                                                                                                                                                                                                                     |
| **Focus management when the filtered set removes the focused node**   | ❌ — `selected` state is cleared, but DOM focus itself isn't redirected; if a node had focus and disappears from the DOM, focus silently falls back to `<body>`                                                                                                  |

## 3. Implementation steps

### 3.1 Announce filter changes

Add a visually-hidden live region (can be the same one as Task 2's `<aside>`, or a dedicated
one — a dedicated one is safer since it shouldn't compete with the selection-text announcement):

```svelte
<p class="sr-only" aria-live="polite">{activeTag ? `Filtered to tag: ${activeTag}` : 'Showing all tags'}</p>
```

```css
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

Because this is a plain reactive interpolation (not a manual DOM write), Svelte updates the
live region's text node automatically whenever `activeTag` changes — the `aria-live="polite"`
attribute is what makes assistive tech announce it.

### 3.2 Focus management when filtering removes the focused node

Capture whether the currently-focused element is a graph node before the filter changes, and
if it disappears from the new `nodes` list, move focus to the filter `<select>` itself:

```ts
function setTag(tag: string, clearSelection = true) {
  const focusedWasNode = document.activeElement?.classList?.contains("node");
  const url = new URL(window.location.href);
  if (tag) url.searchParams.set("tag", tag);
  else url.searchParams.delete("tag");
  history.pushState({}, "", url);
  activeTag = tag;
  if (clearSelection) selected = null;
  requestAnimationFrame(() => {
    if (focusedWasNode && !document.body.contains(document.activeElement)) {
      // the previously focused node's DOM element is gone — fall back to the filter control
      (
        document.querySelector(
          ".graph-island select",
        ) as HTMLSelectElement | null
      )?.focus();
    }
    if (reducedMotion()) return;
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
```

This is a minimal, defensible fix: it only acts when the browser has actually lost the
previously-focused node from the DOM (`!document.body.contains(...)`), so it never steals
focus from an element that's still present (e.g. the `<select>` itself, mid-change).

## 4. Accessibility checklist

- [ ] A live region announces "Filtered to tag: X" / "Showing all tags" on every change.
- [ ] If the focused node is removed by filtering, focus moves to the filter `<select>`, never
      silently to `<body>`.
- [ ] The filter control retains its existing accessible name and keyboard operability.
- [ ] No change to `filterGraph`/`layout.ts` — all new logic stays in the component.

## 5. Verification

```powershell
cd services/frontend
node --test src/components/graph/layout.test.mjs   # filterGraph tests must still pass unmodified
npx astro check
npm run dev
# manual: focus a node, change the dropdown to a tag that excludes it, confirm focus lands on the select
# manual: with a screen reader running, change the filter and confirm "Filtered to tag: X" is announced
```

## 6. Cross-references

- Task 6's keyboard audit should specifically re-test this focus-redirect behavior as its main
  checklist item for the Graph seam.
- Task 4's URL state additions (`?node=`) must not conflict with this task's `?tag=` handling —
  both read/write the same `URL`/`URLSearchParams` object, so land Task 3 before Task 4 and
  re-run Task 3's manual checks afterward.
