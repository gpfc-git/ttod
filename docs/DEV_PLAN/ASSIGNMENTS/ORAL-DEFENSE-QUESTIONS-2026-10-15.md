# Oral defense — question bank (2026-10-15)

**Audience:** instructor only.  
**Rubric:** [`PHASE-V-FEII-COHORT-COLLABORATION-AND-ASSESSMENT.md`](../PHASE-V-FEII-COHORT-COLLABORATION-AND-ASSESSMENT.md) §6  
**Versión ES:** [`ORAL-DEFENSE-QUESTIONS-2026-10-15.es.md`](./ORAL-DEFENSE-QUESTIONS-2026-10-15.es.md)  
**Use:** pick **one** question from the group trio in the room; keep the other two as backups / follow-ups. Reserve ~3–4 minutes for the method block at the end (any student, or one volunteer per team).

Each group trio is built as: **(1) own-module decision** · **(2) AI critical usage** · **(3) seam / system fluency**.

---

## E1 — Content (`gontugithub`) · seam: Content

*Tip PRs merged: #61–#68 (+ #43). Tasks 7–8 (cross-team PR / formal review) **waived**.*

1. **Learning — provenance as a surface, not a field.**  
   Task 5 asks for source/rights/provenance on *every* quote view (index cards, facet listings, and detail). Why is “we put it on the detail page” not enough? What breaks for a reader who never opens the detail route?

2. **AI critical usage — what the amend is really asking.**  
   #67 was rejected because a `frequencies()` unit test alone does not meet Task 6. If an assistant told you “the unit test covers the form,” how would you disprove that claim without re-running the whole suite? Name the *behavior* a propose-form component test must exercise that `frequencies()` cannot.

3. **System fluency — `loadWisdom()` as a trust boundary.**  
   Task 9 is a design-decision tip about centralized error handling. Point to where a fetch failure must become user-visible empty/error UI, and where it must *not* leak into a 200 page that looks empty for the wrong reason. How does that decision touch Graph or Accounts if they call the same wisdom path later?

---

## E2 — Graph (`gpfc-git`) · seam: Graph

*Tasks 1–8 on main (#48 → … → #78). Tip 9 **waived**. Tip 10: no tip PR filed.*

1. **Learning — URL as source of truth.**  
   In #71, user actions use `pushState` and load/corrections use `replaceState`. Explain one concrete bug you would get if *every* URL write used `pushState` (including invalid-tag cleanup on first paint).

2. **AI critical usage — rejected or revised navigation.**  
   #52’s amend replaced list ±1 arrow focus with spatial navigation. Walk the room through *why* ±1 on a radial layout is the wrong model. Did an assistant propose the list version first? What evidence (layout coordinates, failing e2e, manual Tab) made you keep or reject it?

3. **System fluency — filter × selection × focus.**  
   When a tag filter removes the focused node, focus returns to the filter (#55 / #76). Who owns that contract: layout math, URL sync, or the island’s `applyTag`? What should Accounts or Content *not* assume about Graph focus when they deep-link `?node=`?

---

## E3 — Oracle (`Andreavilaro0` / fork `nbfrodri`) · seam: Oracle

*Seam complete via cumulative #42; per-task PRs #44/#45/#38–#41 closed as superseded. Tasks 8–9 (cross-team PR / formal review) **waived**.*

1. **Learning — cumulative vs per-task tips.**  
   Product for Tasks 1–6 landed through #42’s stack while leftover per-task PRs looked `DIRTY` / unmergeable. In your own words: what is the difference between “the feature is on `main`” and “this tip branch is mergeable”? Why did closing superseded tips not erase the work?

2. **AI critical usage — streaming UX without lying.**  
   Pick preparing-state, live region, or recovery error from the Oracle stack. Show one place an assistant might have over-promised (e.g. announce a complete answer before the stream ends, or hide “preparing” on immediate failure). How did you verify the order of states in a test or in the browser?

3. **System fluency — Oracle offline vs Oracle online.**  
   PWA Task 2 caches the Oracle *shell*; it does not answer without the model. Where does your module’s trust end and PWA’s offline queue begin? What should a user hear/see when they submit offline — and which team’s code owns that message?

---

## E4 — PWA (`PRNovoa`) · seam: PWA & Local Operations

*Seam complete (#51→#69); AI-use memo #74 merged. Tasks 8–9 (cross-team PR / formal review) **waived**.*

1. **Learning — Cache-First vs Network-First.**  
   Name one asset class that must be Cache-First and one path that must stay Network-First (or bypass cache) for the Oracle stream. What user-visible failure appears if you swap them?

2. **AI critical usage — the rejected `tsc` drop (#74 / #49).**  
   An assistant proposed removing the `tsc` phase from the compatibility monitor because Astro imports confused it. Why was that unsafe? What class of bug (`TS17001` / duplicate JSX attributes) would have slipped through a green monitor? What did you keep instead?

3. **System fluency — queue flush and auth.**  
   When the offline queue flushes on `online`, which credentials (if any) must it use, and which must it refuse? How does that interact with Accounts’ session cookie vs Bearer PAT split?

---

## E5 — Accounts (`alexxblaro16` / `Gonsiii11`) · seam: Accounts

*Seam complete (#53→#58→#57→#72→#56→#73→#59). Tasks 8–9 (cross-team PR / formal review) **waived**.*

1. **Learning — two credentials, one API.**  
   Explain why a session cookie must not authorize `GET /api/v1/wisdom/random`, and why a Bearer PAT must not act as a browser session. What attack or foot-gun does that split prevent?

2. **AI critical usage — FavoriteButton placement (#58).**  
   An early amend moved save-favorite off the index onto the quote detail. If an assistant argued “put the button wherever the quote text appears,” how would you argue from a11y / SSR / card density that the detail route is the right trust surface?

3. **System fluency — propose → review → public corpus.**  
   Walk a proposal from the logged-in form through reviewer role gate to acceptance. Where does Content’s propose UI end and your backend `ProposalStore` / origin fields begin? What must never be client-authored?

---

## Method evaluation — students score the teaching (3 questions)

Ask these of the cohort (or rotate one per team). They are **evaluating your method**, not their code. Score lightly for honesty and specificity, not for praise.

**M1 — Real product vs toy repo.**  
   We used one shared TTOD app, tip-sized PRs, instructor merge hygiene (Update branch / DIRTY resolve), and “code/verify only” rejects. Did that help you learn professional review, or did it hide too much of the messy git work from you? Give one concrete moment (a PR number is enough) where the method either clarified or obscured the lesson.

**M2 — AI as mandatory process, not forbidden tool.**  
   Unit 6 + AI Review Logs + “AI never approves” + rejected-suggestion examples (#74’s `tsc` case, Graph spatial nav, Accounts empty-login / FavoriteButton). As a learner: which of those rituals actually changed how you use assistants, and which felt like paperwork? What would you keep if you redesigned the course?

**M3 — Seam ownership and oral defense.**  
   You owned one seam but the defense demands whole-system fluency and cross-examination. Was building in parallel on a real shared `main` the right way to force that breadth, or would a sequenced monorepo / stubbed seams have taught the same idea with less friction? Argue with one dependency you hit (or avoided) across teams.

---

## Examiner quick tips

- Prefer answers that name **files, PR numbers, or failing checks** over slogans.
- “I’d check X” is a valid recovery answer (§6 Recovery under question).
- For open Content tips (#65–#68), do not treat unfinished amends as failed defense — ask what they would change next and why the reject reason was correct or wrong.
- Method block (M1–M3): interrupt praise; push for a **cost** of the method (time, confusion, unfairness) as well as a benefit.

---

_Created 2026-10-14 for defense 2026-10-15. Grounded in live scorecard + formal AMEND reasons + merged Graph/PWA/Accounts/Oracle history._
