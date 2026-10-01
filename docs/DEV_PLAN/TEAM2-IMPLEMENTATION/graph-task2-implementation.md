# Implementation — Team 2, Task 2: One accessible node selection reflected as text

Canonical source: [`ASSIGNMENT-graph-task2.md`](../ASSIGNMENTS/ASSIGNMENT-graph-task2.md)

## 1. Current state

`GraphIsland.svelte` already has the interaction skeleton:

```svelte
{#if selected}<aside><strong>{selected.id}</strong><p>{selected.text}</p><small>{selected.section} · {selected.origin}</small></aside>{/if}
```

and every node circle carries `role="button"`, `tabindex="0"`, a descriptive
`aria-label={`${node.id}: ${node.text}`}`, and an `onkeydown` handler for Enter/Space.
Selection is reactive Svelte state (`selected = $state<PositionedNode | null>(null)`), ready
to be consumed by the URL-state and filter tasks without changing shape.

## 2. Gap analysis against the task's acceptance criteria

| Criterion (ASSIGNMENT-graph-task2.md §4)                   | Status                                                                                                                                            |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Keyboard selection works (Enter/Space → `<aside>` updates) | ✅                                                                                                                                                |
| Click selection works                                      | ✅                                                                                                                                                |
| Accessible name present on every node                      | ✅                                                                                                                                                |
| **Screen-reader announcement of `<aside>` changes**        | ❌ — the `<aside>` has no `aria-live`, so a screen-reader user gets silence until they manually navigate to it                                    |
| No focus trap after selection                              | ✅ — focus stays on the clicked/activated node                                                                                                    |
| Reduced-motion compliance                                  | ❌ — the GSAP entrance stagger (`setTag`) and hover scale (`hover()`) run unconditionally, no `prefers-reduced-motion` check anywhere in the file |

## 3. Implementation steps

### 3.1 Add `aria-live` to the selection panel

```svelte
{#if selected}
  <aside aria-live="polite">
    <h2>Selected node</h2>
    <strong>{selected.id}</strong><p>{selected.text}</p><small>{selected.section} · {selected.origin}</small>
  </aside>
{/if}
```

`aria-live="polite"` on the container means screen readers announce the new text whenever
`selected` changes, without interrupting whatever the user is currently doing. Adding the
`<h2>Selected node</h2>` heading gives the region a stable accessible name independent of
its (changing) content.

### 3.2 Respect `prefers-reduced-motion`

Add one guard near the top of the `<script>` block and use it in both animation call sites:

```ts
const reducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;
```

In `setTag`:

```ts
requestAnimationFrame(() => {
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
```

In `hover`:

```ts
function hover(event: MouseEvent, entering: boolean) {
  if (reducedMotion()) return;
  gsap.to(event.currentTarget, {
    scale: entering ? 1.7 : 1,
    duration: 0.18,
    transformOrigin: "center",
  });
}
```

This keeps the functional node-appearance/scale state intact (nodes still show at full
opacity/scale — the guard only skips the _transition_, matching the pattern already used
elsewhere in TTOD's Definition of Done).

## 4. Accessibility checklist

- [ ] `<aside>` has `aria-live="polite"` and a stable heading.
- [ ] Selecting a node by click and by keyboard both update the live region's text.
- [ ] `prefers-reduced-motion: reduce` disables the entrance stagger and hover scale, verified
      via DevTools' "Emulate CSS media feature prefers-reduced-motion".
- [ ] No regression to existing keyboard parity from Task 1.

## 5. Verification

```powershell
cd services/frontend
node --test src/components/graph/layout.test.mjs
npx astro check
npm run dev   # then, with a screen reader (NVDA/VoiceOver) running:
#   - Tab to a node, press Enter -> confirm the selection text is announced
#   - toggle prefers-reduced-motion in DevTools -> confirm no stagger/scale animation plays
```

## 6. Cross-references

- Task 3's filter-change announcement can reuse the same `aria-live` pattern — consider a
  single shared live region if both land close together, to avoid two competing announcements
  firing at once.
- Task 6 (keyboard audit) should re-verify this task's keyboard parity holds once Task 3's
  focus-management fix (its §3.2) lands — the filter control itself already exists; only its
  accessible announcement and focus-redirect behavior are new.
