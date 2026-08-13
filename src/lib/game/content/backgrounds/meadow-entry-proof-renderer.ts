import sharp from 'sharp';

import { MEADOW_ENTRY_WORLD_BOUNDS } from './meadow-entry-authoring-geometry';
import type { PixelBounds } from './meadow-entry-authoring-types';
import {
	MEADOW_ENTRY_APPROVED_CROPS,
	MEADOW_ENTRY_APPROVED_OVERLAPS,
	MEADOW_ENTRY_RUNTIME_COVERAGE
} from './meadow-entry-crop-manifest';
import {
	MEADOW_ENTRY_PAINTED_V2_PILOT_CROPS,
	MEADOW_ENTRY_PAINTED_V2_PILOT_OVERLAPS
} from './meadow-entry-painted-v2-crop-manifest';
import { decodeMeadowEntryRgba, encodeCanonicalMeadowEntryPng } from './meadow-entry-png';

export interface MeadowEntryProofDescriptor {
	proofId: string;
	filename: string;
	masterBounds: PixelBounds;
}

export interface MeadowEntryOverlapDifference {
	png: Buffer;
	differingPixels: number;
	maximumChannelDifference: number;
	firstDifference: {
		x: number;
		y: number;
		channel: number;
		first: number;
		second: number;
	} | null;
}

const FULL_PROOF_IDS = [
	'full/base-master',
	'full/foreground-checkerboard',
	'full/immutable-sundrop-composite',
	'full/protected-live-overlay',
	'full/collision-overlay',
	'full/foreground-eligibility-overlay',
	'full/interaction-readability-overlay',
	'full/baked-coverage',
	'full/fallback-coverage'
] as const;

const SUNDROP_BOUNDS = MEADOW_ENTRY_APPROVED_CROPS.find(
	({ id }) => id === 'sundrop-village-underlay'
)!.bounds;
const SUNDROP_EDGE_BAND_PX = 128;

function freezeBounds(bounds: PixelBounds): PixelBounds {
	return Object.freeze({ ...bounds });
}

function envelope(bounds: readonly PixelBounds[]): PixelBounds {
	return {
		left: Math.min(...bounds.map(({ left }) => left)),
		top: Math.min(...bounds.map(({ top }) => top)),
		right: Math.max(...bounds.map(({ right }) => right)),
		bottom: Math.max(...bounds.map(({ bottom }) => bottom))
	};
}

function descriptor(proofId: string, masterBounds: PixelBounds): MeadowEntryProofDescriptor {
	return Object.freeze({
		proofId,
		filename: `${proofId}.png`,
		masterBounds: freezeBounds(masterBounds)
	});
}

const cornerGroups = [
	...new Set(
		MEADOW_ENTRY_APPROVED_OVERLAPS.flatMap(({ cornerGroupId }) =>
			cornerGroupId ? [cornerGroupId] : []
		)
	)
];

const clampEdge = (value: number, minimum: number, maximum: number): number =>
	Math.min(maximum, Math.max(minimum, value));

const sundropEdgeBounds = {
	top: {
		left: SUNDROP_BOUNDS.left,
		top: clampEdge(
			SUNDROP_BOUNDS.top - SUNDROP_EDGE_BAND_PX,
			MEADOW_ENTRY_WORLD_BOUNDS.top,
			MEADOW_ENTRY_WORLD_BOUNDS.bottom
		),
		right: SUNDROP_BOUNDS.right,
		bottom: clampEdge(
			SUNDROP_BOUNDS.top + SUNDROP_EDGE_BAND_PX,
			MEADOW_ENTRY_WORLD_BOUNDS.top,
			MEADOW_ENTRY_WORLD_BOUNDS.bottom
		)
	},
	right: {
		left: clampEdge(
			SUNDROP_BOUNDS.right - SUNDROP_EDGE_BAND_PX,
			MEADOW_ENTRY_WORLD_BOUNDS.left,
			MEADOW_ENTRY_WORLD_BOUNDS.right
		),
		top: SUNDROP_BOUNDS.top,
		right: clampEdge(
			SUNDROP_BOUNDS.right + SUNDROP_EDGE_BAND_PX,
			MEADOW_ENTRY_WORLD_BOUNDS.left,
			MEADOW_ENTRY_WORLD_BOUNDS.right
		),
		bottom: SUNDROP_BOUNDS.bottom
	},
	bottom: {
		left: SUNDROP_BOUNDS.left,
		top: clampEdge(
			SUNDROP_BOUNDS.bottom - SUNDROP_EDGE_BAND_PX,
			MEADOW_ENTRY_WORLD_BOUNDS.top,
			MEADOW_ENTRY_WORLD_BOUNDS.bottom
		),
		right: SUNDROP_BOUNDS.right,
		bottom: clampEdge(
			SUNDROP_BOUNDS.bottom + SUNDROP_EDGE_BAND_PX,
			MEADOW_ENTRY_WORLD_BOUNDS.top,
			MEADOW_ENTRY_WORLD_BOUNDS.bottom
		)
	},
	left: {
		left: clampEdge(
			SUNDROP_BOUNDS.left - SUNDROP_EDGE_BAND_PX,
			MEADOW_ENTRY_WORLD_BOUNDS.left,
			MEADOW_ENTRY_WORLD_BOUNDS.right
		),
		top: SUNDROP_BOUNDS.top,
		right: clampEdge(
			SUNDROP_BOUNDS.left + SUNDROP_EDGE_BAND_PX,
			MEADOW_ENTRY_WORLD_BOUNDS.left,
			MEADOW_ENTRY_WORLD_BOUNDS.right
		),
		bottom: SUNDROP_BOUNDS.bottom
	}
} as const satisfies Readonly<Record<'top' | 'right' | 'bottom' | 'left', PixelBounds>>;

export const MEADOW_ENTRY_PROOF_DESCRIPTORS: readonly MeadowEntryProofDescriptor[] = Object.freeze([
	...FULL_PROOF_IDS.map((id) => descriptor(id, MEADOW_ENTRY_WORLD_BOUNDS)),
	...MEADOW_ENTRY_APPROVED_CROPS.map((crop) =>
		descriptor(
			`${crop.id.includes('connector') ? 'connectors' : 'regions'}/${crop.id}`,
			crop.bounds
		)
	),
	...MEADOW_ENTRY_APPROVED_OVERLAPS.map((overlap) =>
		descriptor(`overlaps/${overlap.id}`, overlap.bounds)
	),
	...cornerGroups.map((cornerGroupId) =>
		descriptor(
			`corners/${cornerGroupId}`,
			envelope(
				MEADOW_ENTRY_APPROVED_OVERLAPS.filter(
					(overlap) => overlap.cornerGroupId === cornerGroupId
				).map(({ bounds }) => bounds)
			)
		)
	),
	...MEADOW_ENTRY_APPROVED_CROPS.flatMap((crop) =>
		(crop.edgeClamp?.sides ?? []).map((side) =>
			descriptor(`clamps/${crop.id}-${side}`, crop.bounds)
		)
	),
	...MEADOW_ENTRY_RUNTIME_COVERAGE.flatMap((coverage, index) =>
		coverage.mode === 'fallback-tile'
			? [
					descriptor(
						`fallback-boundaries/fallback-${String(index).padStart(3, '0')}`,
						coverage.bounds
					)
				]
			: []
	),
	...(['top', 'right', 'bottom', 'left'] as const).map((edge) =>
		descriptor(`sundrop-feather/${edge}`, sundropEdgeBounds[edge])
	)
]);

export const MEADOW_ENTRY_PROOF_FILENAMES: readonly string[] = Object.freeze(
	MEADOW_ENTRY_PROOF_DESCRIPTORS.map(({ filename }) => filename)
);

const PAINTED_V2_PROOF_IDS = [
	'pilot-camera-envelope',
	'pilot-underlay-sundrop-seam',
	'pilot-underlay-crossroads-seam',
	'pilot-underlay-family-handoff',
	'pilot-detail-panel-handoffs',
	'pilot-base-coverage',
	'pilot-master-transparency',
	'pilot-runtime-overlap',
	'pilot-protected-live',
	'pilot-ownership'
] as const;

const paintedV2CropEnvelope = envelope(
	MEADOW_ENTRY_PAINTED_V2_PILOT_CROPS.map(({ bounds }) => bounds)
);
const PAINTED_V2_LABEL_MARGIN_PX = 64;

function expandedProofBounds(bounds: PixelBounds): PixelBounds {
	return {
		left: Math.max(MEADOW_ENTRY_WORLD_BOUNDS.left, bounds.left - PAINTED_V2_LABEL_MARGIN_PX),
		top: Math.max(MEADOW_ENTRY_WORLD_BOUNDS.top, bounds.top - PAINTED_V2_LABEL_MARGIN_PX),
		right: Math.min(MEADOW_ENTRY_WORLD_BOUNDS.right, bounds.right + PAINTED_V2_LABEL_MARGIN_PX),
		bottom: Math.min(MEADOW_ENTRY_WORLD_BOUNDS.bottom, bounds.bottom + PAINTED_V2_LABEL_MARGIN_PX)
	};
}

const sundropSeamBounds = { left: 0, top: 4736, right: 3200, bottom: 4864 } as const;
const crossroadsSeamBounds = { left: 2368, top: 3776, right: 5568, bottom: 3904 } as const;
const familyHandoffBounds = { left: 2368, top: 3200, right: 3200, bottom: 5440 } as const;

const paintedV2ProofBounds: Readonly<Record<(typeof PAINTED_V2_PROOF_IDS)[number], PixelBounds>> = {
	'pilot-camera-envelope': MEADOW_ENTRY_WORLD_BOUNDS,
	'pilot-underlay-sundrop-seam': expandedProofBounds(sundropSeamBounds),
	'pilot-underlay-crossroads-seam': expandedProofBounds(crossroadsSeamBounds),
	'pilot-underlay-family-handoff': expandedProofBounds(familyHandoffBounds),
	'pilot-detail-panel-handoffs': expandedProofBounds(paintedV2CropEnvelope),
	'pilot-base-coverage': paintedV2CropEnvelope,
	'pilot-master-transparency': MEADOW_ENTRY_WORLD_BOUNDS,
	'pilot-runtime-overlap': MEADOW_ENTRY_PAINTED_V2_PILOT_OVERLAPS[0]!.bounds,
	'pilot-protected-live': MEADOW_ENTRY_WORLD_BOUNDS,
	'pilot-ownership': MEADOW_ENTRY_WORLD_BOUNDS
};

export const MEADOW_ENTRY_PAINTED_V2_PROOF_DESCRIPTORS: readonly MeadowEntryProofDescriptor[] =
	Object.freeze(
		PAINTED_V2_PROOF_IDS.map((proofId) => descriptor(proofId, paintedV2ProofBounds[proofId]))
	);

export const MEADOW_ENTRY_PAINTED_V2_PROOF_FILENAMES: readonly string[] = Object.freeze(
	MEADOW_ENTRY_PAINTED_V2_PROOF_DESCRIPTORS.map(({ filename }) => filename)
);

const allowedProofPaths = new Set(
	[...MEADOW_ENTRY_PROOF_FILENAMES, ...MEADOW_ENTRY_PAINTED_V2_PROOF_FILENAMES].flatMap(
		(filename) => [filename, filename.replace(/\.png$/, '.json')]
	)
);

export function assertAllowedMeadowEntryProofDestination(relativePath: string): void {
	if (
		relativePath.startsWith('/') ||
		relativePath.includes('\\') ||
		relativePath.split('/').includes('..') ||
		!allowedProofPaths.has(relativePath)
	) {
		throw new Error(`Refusing unexpected Meadow Entry proof destination: ${relativePath}`);
	}
}

function assertBoundsWithinMaster(bounds: PixelBounds, width: number, height: number): void {
	if (
		!Number.isInteger(bounds.left) ||
		!Number.isInteger(bounds.top) ||
		!Number.isInteger(bounds.right) ||
		!Number.isInteger(bounds.bottom) ||
		bounds.left < 0 ||
		bounds.top < 0 ||
		bounds.right > width ||
		bounds.bottom > height ||
		bounds.left >= bounds.right ||
		bounds.top >= bounds.bottom
	) {
		throw new Error(
			`Sundrop bounds leave the Meadow Entry review composite: ${JSON.stringify(bounds)} in ${width}x${height}`
		);
	}
}

/**
 * Renders the review composite: the base master with the Immutable Sundrop
 * base overlays, the foreground master, and the Immutable Sundrop foreground
 * overlays composited in draw order.
 *
 * @param input - The base and foreground masters plus the Sundrop planes and
 *   their bounds within the masters.
 * @returns The canonical PNG encoding of the composite.
 * @throws Error - When the master dimensions differ, the Sundrop planes do not
 *   match their bounds, the bounds leave the master, or the composite decode
 *   drifts from the master dimensions.
 */
export async function renderMeadowEntryReviewComposite(input: {
	baseMasterPng: Buffer;
	foregroundMasterPng: Buffer;
	sundropBasePng: Buffer;
	sundropForegroundPng: Buffer;
	sundropBounds: PixelBounds;
}): Promise<Buffer> {
	const [base, foreground, sundropBase, sundropForeground] = await Promise.all([
		decodeMeadowEntryRgba(input.baseMasterPng),
		decodeMeadowEntryRgba(input.foregroundMasterPng),
		decodeMeadowEntryRgba(input.sundropBasePng),
		decodeMeadowEntryRgba(input.sundropForegroundPng)
	]);
	if (base.width !== foreground.width || base.height !== foreground.height) {
		throw new Error('Meadow Entry review-composite master dimensions differ');
	}
	assertBoundsWithinMaster(input.sundropBounds, base.width, base.height);
	const sundropWidth = input.sundropBounds.right - input.sundropBounds.left;
	const sundropHeight = input.sundropBounds.bottom - input.sundropBounds.top;
	if (
		sundropBase.width !== sundropWidth ||
		sundropBase.height !== sundropHeight ||
		sundropForeground.width !== sundropWidth ||
		sundropForeground.height !== sundropHeight
	) {
		throw new Error('Immutable Sundrop planes do not match their approved master bounds');
	}

	const { data, info } = await sharp(input.baseMasterPng)
		.composite([
			{
				input: input.sundropBasePng,
				left: input.sundropBounds.left,
				top: input.sundropBounds.top
			},
			{ input: input.foregroundMasterPng, left: 0, top: 0 },
			{
				input: input.sundropForegroundPng,
				left: input.sundropBounds.left,
				top: input.sundropBounds.top
			}
		])
		.toColourspace('srgb')
		.ensureAlpha()
		.raw()
		.toBuffer({ resolveWithObject: true });
	if (info.width !== base.width || info.height !== base.height || info.channels !== 4) {
		throw new Error('Meadow Entry review composite decoded dimensions drifted');
	}
	return await encodeCanonicalMeadowEntryPng(data, info.width, info.height);
}

/**
 * Renders the pixel difference between two overlapping exports.
 *
 * @param firstPng - Canonical PNG of the first plane.
 * @param secondPng - Canonical PNG of the second plane, decoded at the same
 *   dimensions.
 * @returns The difference image plus the differing-pixel count, maximum
 *   per-channel difference, and first differing pixel position.
 * @throws Error - When the two planes decode at different dimensions.
 */
export async function renderMeadowEntryOverlapDifference(
	firstPng: Buffer,
	secondPng: Buffer
): Promise<MeadowEntryOverlapDifference> {
	const [first, second] = await Promise.all([
		decodeMeadowEntryRgba(firstPng),
		decodeMeadowEntryRgba(secondPng)
	]);
	if (first.width !== second.width || first.height !== second.height) {
		throw new Error(
			`Meadow Entry overlap dimensions differ: ${first.width}x${first.height}/${second.width}x${second.height}`
		);
	}

	const difference = Buffer.alloc(first.data.length);
	let differingPixels = 0;
	let maximumChannelDifference = 0;
	let firstDifference: MeadowEntryOverlapDifference['firstDifference'] = null;
	for (let offset = 0; offset < first.data.length; offset += 4) {
		let pixelDiffers = false;
		for (let channel = 0; channel < 4; channel += 1) {
			const firstValue = first.data[offset + channel]!;
			const secondValue = second.data[offset + channel]!;
			const delta = Math.abs(firstValue - secondValue);
			maximumChannelDifference = Math.max(maximumChannelDifference, delta);
			if (delta === 0) continue;
			pixelDiffers = true;
			difference[offset + channel] = delta;
			if (firstDifference === null) {
				const pixelIndex = offset / 4;
				firstDifference = {
					x: pixelIndex % first.width,
					y: Math.floor(pixelIndex / first.width),
					channel,
					first: firstValue,
					second: secondValue
				};
			}
		}
		if (pixelDiffers) {
			differingPixels += 1;
			difference[offset + 3] = 255;
		}
	}

	return {
		png: await encodeCanonicalMeadowEntryPng(difference, first.width, first.height),
		differingPixels,
		maximumChannelDifference,
		firstDifference
	};
}
