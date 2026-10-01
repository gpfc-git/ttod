# Implementation — Team 2, Task 7: Unit and component tests for the graph island

Canonical source: [`ASSIGNMENT-graph-task7.md`](../ASSIGNMENTS/ASSIGNMENT-graph-task7.md)

## 1. Current state

- `services/frontend/src/components/graph/layout.test.mjs` exists with 2 tests covering
  `joinTags` + `filterGraph` + `radialLayout` determinism + `selectedTag` — but it runs via
  plain Node (`node --test`), and `vitest.config.ts` explicitly **excludes** it:

  ```ts
  exclude: [
    "node_modules/**",
    "dist/**",
    "e2e/**",
    "src/components/graph/layout.test.mjs",
  ];
  ```

- There is **no component test for `GraphIsland.svelte`** anywhere in the repo.
- `package.json` devDependencies include `@testing-library/jest-dom`,
  `@testing-library/react`, `@testing-library/user-event`, `jsdom`, and `vitest` — but **not**
  `@testing-library/svelte`. A Svelte 5 component test cannot be written without it (or an
  equivalent raw `mount`/`unmount` approach using `svelte`'s own `mount` API, which is more
  brittle for simulating user events).

## 2. Gap analysis against the task's acceptance criteria

| Criterion (ASSIGNMENT-graph-task7.md §3-4)                    | Status                                                          |
| ------------------------------------------------------------- | --------------------------------------------------------------- |
| At least one unit test for a pure `layout.ts` function        | ✅ exists, but not run by `vitest`/CI alongside component tests |
| At least one component test for `GraphIsland.svelte`          | ❌ missing entirely                                             |
| Component test asserts `role`/`tabindex`/`aria-label` present | ❌ — no test exists to assert this                              |
| Component test asserts selection updates the `<aside>`        | ❌ — no test exists to assert this                              |

## 3. Implementation steps

### 3.1 Add the missing test dependency

```powershell
cd services/frontend
npm install --save-dev @testing-library/svelte
```

### 3.2 Decide the layout-test wiring (don't silently leave two disconnected test runners)

Two options, pick one and document the choice in the PR:

- **Option A (minimal):** keep `layout.test.mjs` on `node --test`, add a `package.json` script
  `"test:unit": "node --test src/components/graph/layout.test.mjs"` and a `"test:component":
"vitest run"`, run both in CI.
- **Option B (consolidate):** port the existing assertions from `node:test`/`node:assert/strict`
  syntax to vitest's own `test`/`expect` API in a new `layout.test.ts`, then delete
  `layout.test.mjs` and drop it from the `exclude` list. **A bare rename is not enough** —
  `vitest` only executes and reports tests registered through its own `test`/`it`; a file that
  still calls `node:test`'s `test()` would import without error but silently report zero tests,
  which is worse than the current state. This matches the Testing Trophy "one runner" spirit
  most closely — recommended if CI currently only invokes `vitest`.

### 3.3 Write the component test

```ts
// services/frontend/src/components/graph/GraphIsland.test.ts
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, fireEvent, screen } from "@testing-library/svelte";
import GraphIsland from "./GraphIsland.svelte";

const graphPayload = {
  nodes: [
    {
      id: "a-001",
      section: "a",
      origin: "human",
      status: "active",
      text: "Node A",
      lang: "en",
    },
  ],
  edges: [],
};
const wisdomPayload = [
  {
    id: "a-001",
    tags: ["focus"],
    section: "a",
    level: "beginner",
    teaches: "",
    related: [],
    origin: "human",
    lang: "en",
    rights: { license: "CC-BY-NC-SA-4.0" },
    text: "Node A",
  },
];

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn((url: string) =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve(url.includes("graph") ? graphPayload : wisdomPayload),
      } as Response),
    ),
  );
});

describe("GraphIsland", () => {
  it("renders one accessible node per fetched entry", async () => {
    render(GraphIsland);
    const node = await screen.findByRole("button", { name: /a-001: Node A/ });
    expect(node).toHaveAttribute("tabindex", "0");
  });

  it("selecting a node by keyboard updates the live aside text", async () => {
    render(GraphIsland);
    const node = await screen.findByRole("button", { name: /a-001: Node A/ });
    await fireEvent.keyDown(node, { key: "Enter" });
    expect(await screen.findByText("Node A")).toBeInTheDocument();
  });
});
```

This mocks `fetch` (per the task's own quality criteria — "mocking the fetch and verifying the
rendered output" is explicitly acceptable since `layout.ts`'s pure functions are already
covered by the unit test, not re-verified here). It tests exactly the two things a unit test
can't: that the component renders real DOM with the right accessible attributes, and that a
simulated keyboard event produces the right DOM update — not the layout math itself.

## 4. Accessibility checklist

- [ ] Component test explicitly queries by `role="button"` + accessible name (`aria-label`),
      not by CSS selector — this is what proves the accessible name is real, not incidental.
- [ ] Component test exercises the keyboard path (`keyDown` with `Enter`), not only `click`.
- [ ] Unit test (`layout.test.mjs`) is still runnable and green under whichever option (A/B)
      was chosen in §3.2.

## 5. Verification

```powershell
cd services/frontend
npm install --save-dev @testing-library/svelte
npx vitest run src/components/graph/GraphIsland.test.ts
node --test src/components/graph/layout.test.mjs   # or `npx vitest run` if Option B was chosen
npx astro check
```

## 6. Cross-references

- Extend this same test file's fetch mock to cover Task 4's `?node=`/`?tag=` URL assertions
  (checking `window.location.search` after a simulated selection) rather than creating a
  third, separate test file.
- Task 6's manual keyboard audit checklist items (role/tabindex/aria-label, Enter and Space
  both triggering selection) are exactly what this component test should assert automatically
  going forward.
