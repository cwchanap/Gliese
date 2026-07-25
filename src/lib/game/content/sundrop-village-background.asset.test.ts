import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import {
	SUNDROP_VILLAGE_BACKGROUND_HARD_LIMIT_BYTES,
	SUNDROP_VILLAGE_BACKGROUND_HEIGHT,
	SUNDROP_VILLAGE_BACKGROUND_REVIEW_TARGET_BYTES,
	SUNDROP_VILLAGE_BACKGROUND_WIDTH,
	sundropVillageBackgroundAlpha
} from '$lib/game/content/backgrounds/sundrop-village-background';
import { validateSundropVillagePng } from '$lib/game/content/backgrounds/sundrop-village-png';
import { sundropVillageBackgroundApproval } from '$lib/game/content/approvals/sundrop-village-background';
import { SUNDROP_VILLAGE_ART_CONTROL_FINGERPRINT } from '$lib/game/content/generated/sundrop-village-art-control';
import { compileLayeredRegion } from '$lib/game/content/maps/layered/compile-layered-region';
import { computeVillageArtControlFingerprint } from '$lib/game/content/maps/layered/village-art-controls';
import { sundropVillageLayered } from '$lib/game/content/maps/regions/village-layered';
import { meadowEntryMap } from '$lib/game/content/maps/meadow-entry';
import {
	NORMALIZE_DOORWAY_CLEARANCE_WIDTH,
	NORMALIZE_PLAYER_RADIUS,
	NORMALIZE_TRANSITION_RADIUS,
	collectLandmarkRects,
	collectStrictCollisionRects
} from '$lib/game/save/save-state';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';

const repositoryRoot = process.cwd();
const staleGeometryMessage =
	'Regenerate controls, review master alignment, record evidence, then update the approved fingerprint.';
const assetPath = join(repositoryRoot, 'public/game/assets/regions/sundrop-village-background.png');
const approvalPath = join(
	repositoryRoot,
	'src/lib/game/content/approvals/sundrop-village-background.ts'
);
const manifestPath = join(
	repositoryRoot,
	'docs/superpowers/reports/img/hpa-307/village-art-control-manifest.json'
);

let loadedAsset:
	| Promise<{
			readonly png: Buffer;
			readonly validated: Awaited<ReturnType<typeof validateSundropVillagePng>>;
	  }>
	| undefined;

function loadAsset() {
	loadedAsset ??= readFile(assetPath).then(async (png) => ({
		png,
		validated: await validateSundropVillagePng(png)
	}));
	return loadedAsset;
}

describe('Sundrop Village production background approval', () => {
	it('requires the exact production paths and a Task 3-valid PNG', async () => {
		const assetExists = existsSync(assetPath);
		const approvalExists = existsSync(approvalPath);

		expect.soft(assetExists, `missing production asset: ${assetPath}`).toBe(true);
		expect.soft(approvalExists, `missing production approval: ${approvalPath}`).toBe(true);
		if (!assetExists || !approvalExists) return;

		await expect(loadAsset()).resolves.toMatchObject({
			validated: {
				width: SUNDROP_VILLAGE_BACKGROUND_WIDTH,
				height: SUNDROP_VILLAGE_BACKGROUND_HEIGHT
			}
		});
	});

	it('keeps the approved master tied to current control geometry', async () => {
		const currentFingerprint = computeVillageArtControlFingerprint(sundropVillageLayered, {
			compiledVillage: compileLayeredRegion(sundropVillageLayered),
			map: meadowEntryMap,
			strictCollisionRects: collectStrictCollisionRects(meadowEntryMap),
			landmarkCollisionRects: collectLandmarkRects(meadowEntryMap),
			playerRadius: NORMALIZE_PLAYER_RADIUS,
			doorwayClearanceWidth: NORMALIZE_DOORWAY_CLEARANCE_WIDTH,
			transitionRadius: NORMALIZE_TRANSITION_RADIUS
		});
		const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as {
			readonly computedControlFingerprint: string;
		};

		expect(manifest.computedControlFingerprint).toBe(currentFingerprint);
		expect(SUNDROP_VILLAGE_ART_CONTROL_FINGERPRINT).toBe(currentFingerprint);
		expect(currentFingerprint, staleGeometryMessage).toBe(
			sundropVillageBackgroundApproval.approvedControlFingerprint
		);
	});

	it('matches the approved PNG bytes, alpha edge, and size-budget disposition', async () => {
		const { png, validated } = await loadAsset();
		const metadata = await sharp(png).metadata();
		const { data, info } = await sharp(png)
			.toColourspace('srgb')
			.ensureAlpha()
			.raw()
			.toBuffer({ resolveWithObject: true });

		expect(metadata).toMatchObject({
			format: 'png',
			width: SUNDROP_VILLAGE_BACKGROUND_WIDTH,
			height: SUNDROP_VILLAGE_BACKGROUND_HEIGHT,
			channels: 4,
			depth: 'uchar',
			hasAlpha: true
		});
		expect({ bitDepth: png[24], colorType: png[25] }).toEqual({
			bitDepth: 8,
			colorType: 6
		});
		expect(info).toMatchObject({
			width: SUNDROP_VILLAGE_BACKGROUND_WIDTH,
			height: SUNDROP_VILLAGE_BACKGROUND_HEIGHT,
			channels: 4
		});

		let firstAlphaMismatch:
			| {
					readonly x: number;
					readonly y: number;
					readonly expected: number;
					readonly actual: number;
			  }
			| undefined;
		for (let y = 0; y < info.height && !firstAlphaMismatch; y += 1) {
			for (let x = 0; x < info.width; x += 1) {
				const expected = sundropVillageBackgroundAlpha(x, y, info.width, info.height);
				const actual = data[(y * info.width + x) * 4 + 3] ?? -1;
				if (actual !== expected) {
					firstAlphaMismatch = { x, y, expected, actual };
					break;
				}
			}
		}
		expect(firstAlphaMismatch).toBeUndefined();

		const alphaAt = (x: number, y: number): number => data[(y * info.width + x) * 4 + 3] ?? -1;
		let edgesAreMonotonic = true;
		let maximumAdjacentJump = 0;
		const inspectStep = (previous: number, current: number): void => {
			edgesAreMonotonic &&= current >= previous;
			maximumAdjacentJump = Math.max(maximumAdjacentJump, current - previous);
		};
		for (let y = 0; y < info.height; y += 1) {
			let left = alphaAt(0, y);
			let right = alphaAt(info.width - 1, y);
			for (let distance = 1; distance <= 64; distance += 1) {
				const nextLeft = alphaAt(distance, y);
				const nextRight = alphaAt(info.width - 1 - distance, y);
				inspectStep(left, nextLeft);
				inspectStep(right, nextRight);
				left = nextLeft;
				right = nextRight;
			}
		}
		for (let x = 0; x < info.width; x += 1) {
			let top = alphaAt(x, 0);
			let bottom = alphaAt(x, info.height - 1);
			for (let distance = 1; distance <= 64; distance += 1) {
				const nextTop = alphaAt(x, distance);
				const nextBottom = alphaAt(x, info.height - 1 - distance);
				inspectStep(top, nextTop);
				inspectStep(bottom, nextBottom);
				top = nextTop;
				bottom = nextBottom;
			}
		}
		expect(edgesAreMonotonic).toBe(true);
		expect(maximumAdjacentJump).toBeLessThanOrEqual(32);

		expect(png.byteLength).toBe(validated.bytes);
		expect(png.byteLength).toBeLessThanOrEqual(SUNDROP_VILLAGE_BACKGROUND_HARD_LIMIT_BYTES);
		if (png.byteLength <= SUNDROP_VILLAGE_BACKGROUND_REVIEW_TARGET_BYTES) {
			expect(sundropVillageBackgroundApproval.sizeBudgetException).toBeNull();
		} else {
			expect(typeof sundropVillageBackgroundApproval.sizeBudgetException).toBe('string');
			expect(sundropVillageBackgroundApproval.sizeBudgetException.trim().length).toBeGreaterThan(0);
		}

		const exactSha256 = createHash('sha256').update(png).digest('hex');
		expect(exactSha256).toBe(validated.sha256);
		expect(exactSha256).toBe(sundropVillageBackgroundApproval.approvedPngSha256);
	});

	it('points approval at the committed evidence report', () => {
		expect(sundropVillageBackgroundApproval.evidenceReport).toBe(
			'docs/superpowers/reports/2026-07-25-hpa-307-baked-background-validation.md'
		);
		expect(existsSync(join(repositoryRoot, sundropVillageBackgroundApproval.evidenceReport))).toBe(
			true
		);
	});
});
