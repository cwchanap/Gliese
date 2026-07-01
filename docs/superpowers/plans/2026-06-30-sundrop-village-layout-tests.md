# Sundrop Village Layout Tests Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the remaining HPA-113 test coverage gap by asserting runtime village blockers cannot reintroduce old micro-hedge ids.

**Architecture:** Keep the existing HPA-112 manifest-based `village-layout.test.ts` structure. Add one focused runtime blocker-prefix assertion to the village layout suite and leave runtime map data untouched.

**Tech Stack:** TypeScript, Vitest server tests, existing Svelte/Vite path aliases.

---

## File Structure

- Modify: `src/lib/game/content/maps/regions/village-layout.test.ts`
  - Responsibility: focused deterministic Sundrop Village regression tests.
- Do not modify: `src/lib/game/content/maps/regions/village.ts`
  - Runtime village map data already conforms and must remain unchanged.
- Do not modify: `src/lib/game/content/maps/regions/rooms.ts`
  - HPA-112 authoring manifest source of room and route data.
- Do not modify: `src/lib/game/content/maps/regions/route-scenes.ts`
  - HPA-112 route-scene manifest source.
- Do not modify: `src/lib/game/content/maps/regions/decor-roles.ts`
  - HPA-112 decor-role manifest source.

## Task 1: Add Runtime Micro-Hedge Blocker Guard

**Files:**
- Modify: `src/lib/game/content/maps/regions/village-layout.test.ts`

- [ ] **Step 1: Confirm the focused test starts from the current passing baseline**

Run:

```sh
rtk bun run test:unit -- --run src/lib/game/content/maps/regions/village-layout.test.ts
```

Expected: PASS with `1 passed` test file and `15 passed` tests. This is a
coverage-only task: the current runtime data already satisfies HPA-113, so the
new assertion should increase coverage rather than fix failing content.

- [ ] **Step 2: Add a shared removed micro-hedge prefix constant**

In `src/lib/game/content/maps/regions/village-layout.test.ts`, add this constant
after `removedVillageManifestIds`:

```ts
const removedVillageMicroHedgePrefix = /^(vp|vn|vw|ve|vs)-/;
```

Then update the existing authoring-manifest hygiene assertion to use the shared
constant:

```ts
expect(manifestIds.filter((id) => removedVillageMicroHedgePrefix.test(id))).toEqual([]);
```

The surrounding test should read:

```ts
it('does not reference removed micro-hedges or ring-spoke ids', () => {
	const manifestIds = collectVillageManifestIds();
	expect(manifestIds.filter((id) => removedVillageMicroHedgePrefix.test(id))).toEqual([]);
	expect(manifestIds.filter((id) => removedVillageManifestIds.has(id))).toEqual([]);
});
```

- [ ] **Step 3: Add the runtime blocker id assertion**

Inside `describe('village deterministic layout', () => { ... })`, add this block
after the `authoring manifests` block and before `describe('named rooms exist', ...)`:

```ts
describe('no old micro-hedges', () => {
	it('does not use removed technical blocker prefixes in runtime blockers', () => {
		const removedMicroHedgeBlockers = (map.blockers || [])
			.map((blocker) => blocker.id)
			.filter((id) => removedVillageMicroHedgePrefix.test(id));

		expect(removedMicroHedgeBlockers).toEqual([]);
	});
});
```

Do not ban `corridor-wall-*` ids. They are the preserved gate-to-Crossroads
dogleg, not the old village-interior micro-hedges.

- [ ] **Step 4: Run the focused HPA-113 test**

Run:

```sh
rtk bun run test:unit -- --run src/lib/game/content/maps/regions/village-layout.test.ts
```

Expected: PASS with `1 passed` test file and `16 passed` tests.

- [ ] **Step 5: Commit the test guard**

Run:

```sh
rtk git add src/lib/game/content/maps/regions/village-layout.test.ts
rtk git commit -m "test: guard sundrop village blocker ids"
```

Expected: one commit containing only `src/lib/game/content/maps/regions/village-layout.test.ts`.

## Task 2: Verify HPA-113 Scope

**Files:**
- Verify: `src/lib/game/content/maps/regions/village-layout.test.ts`
- Verify unchanged: `src/lib/game/content/maps/regions/village.ts`
- Verify unchanged: `src/lib/game/content/maps/regions/rooms.ts`
- Verify unchanged: `src/lib/game/content/maps/regions/route-scenes.ts`
- Verify unchanged: `src/lib/game/content/maps/regions/decor-roles.ts`

- [ ] **Step 1: Run the broader focused map suite**

Run:

```sh
rtk bun run test:unit -- --run src/lib/game/content/maps/regions/village-layout.test.ts src/lib/game/content/maps/regions/soft-maze.test.ts src/lib/game/content/maps.test.ts
```

Expected: PASS with `3 passed` test files.

- [ ] **Step 2: Confirm implementation diff scope**

Run:

```sh
rtk git diff --name-status HEAD~1..HEAD
```

Expected output:

```text
M	src/lib/game/content/maps/regions/village-layout.test.ts
```

- [ ] **Step 3: Confirm runtime and manifest sources are untouched**

Run:

```sh
rtk git diff -- src/lib/game/content/maps/regions/village.ts src/lib/game/content/maps/regions/rooms.ts src/lib/game/content/maps/regions/route-scenes.ts src/lib/game/content/maps/regions/decor-roles.ts
```

Expected: no output.

- [ ] **Step 4: Final status check**

Run:

```sh
rtk git status --short --branch
```

Expected: clean branch after the HPA-113 test commit.
