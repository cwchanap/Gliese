import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
	MEADOW_ENTRY_PAINTED_V2_PILOT_CROPS,
	MEADOW_ENTRY_PAINTED_V2_PILOT_OVERLAPS
} from './meadow-entry-painted-v2-crop-manifest';
import {
	assembleMeadowEntryPaintedV2Pilot,
	type MeadowEntryPaintedV2PilotAssemblyInput
} from './meadow-entry-painted-v2-pilot-finalizer';
import { measureMeadowEntryDetailBoundaryMetrics } from './meadow-entry-detail-boundary-metrics';
import {
	assembleMeadowEntryPaintedV2Underlay,
	compositeMeadowEntryDetailPanel,
	compositeMeadowEntryDetailPanels,
	type MeadowEntryUnderlayDecodedPanel
} from './meadow-entry-painted-v2-underlay-assembly';
import { decodeMeadowEntryRgba, encodeCanonicalMeadowEntryPng } from './meadow-entry-png';
import {
	MEADOW_ENTRY_PAINTED_V2_DETAIL_PAIRS,
	MEADOW_ENTRY_PAINTED_V2_DETAIL_PAIR_FORMULAS,
	MEADOW_ENTRY_PAINTED_V2_SOURCE_PANELS
} from './meadow-entry-painted-v2-pilot';
import { MEADOW_ENTRY_PAINTED_V2_SCENERY_INSERTS } from './meadow-entry-painted-v2-scenery';
import {
	buildMeadowEntryPaintedV2SceneryMaskSet,
	enrichMeadowEntryPaintedV2Sources
} from './meadow-entry-painted-v2-scenery-bake';
import {
	validateMeadowEntryGenerationProvenance,
	type MeadowEntryGenerationProvenance
} from './meadow-entry-master-provenance';
import { mergeMeadowEntryPaintedV2PackageProvenance } from '../../../../../tools/finalize-meadow-entry-painted-v2-pilot';

const repositoryRoot = resolve(import.meta.dirname, '../../../../..');

it('preserves the exact nine-row root source-panel provenance while rebinding assembly', () => {
	const existing = JSON.parse(
		readFileSync(join(repositoryRoot, 'artifacts/meadow-entry/painted-v2/provenance.json'), 'utf8')
	) as Record<string, unknown>;
	const assembly = Buffer.from(
		JSON.stringify({ controls: { fingerprint: 'f'.repeat(64) }, kind: 'test-assembly' })
	);
	const merged = JSON.parse(
		mergeMeadowEntryPaintedV2PackageProvenance(
			Buffer.from(JSON.stringify(existing)),
			assembly
		).toString('utf8')
	) as Record<string, unknown>;
	expect(merged.sourcePanels).toStrictEqual(existing.sourcePanels);
	expect(merged.inventory).toStrictEqual(existing.inventory);
	expect(merged.assembly).toStrictEqual({
		controls: { fingerprint: 'f'.repeat(64) },
		kind: 'test-assembly'
	});
	expect(merged.controlFingerprint).toBe('f'.repeat(64));
});

async function fixture(): Promise<MeadowEntryPaintedV2PilotAssemblyInput> {
	const packageProvenance = JSON.parse(
		await readFile(
			join(repositoryRoot, 'artifacts/meadow-entry/painted-v2/provenance.json'),
			'utf8'
		)
	) as { controlFingerprint: string };
	const panelProvenance = await Promise.all(
		MEADOW_ENTRY_PAINTED_V2_SOURCE_PANELS.map(async (panel) => {
			const manifest = JSON.parse(
				await readFile(join(repositoryRoot, panel.provenancePath), 'utf8')
			) as {
				generation: {
					mode?: 'generative' | 'manual';
					provider?: string | null;
					model?: string | null;
					modelVersion?: string | null;
					tool?: string;
					prompt?: string | null;
					promptSha256?: string | null;
					seed?: number | string | null;
					seedUnavailable?: boolean;
					promptUnavailable?: boolean;
				};
				normalized: {
					sha256: string;
					bytes: number;
					dimensions: { width: number; height: number };
				};
			};
			const generation = manifest.generation;
			const provenance: MeadowEntryGenerationProvenance = {
				mode: generation.mode ?? 'generative',
				provider: generation.provider ?? null,
				model: generation.model ?? null,
				modelVersion: generation.modelVersion ?? null,
				tool: generation.tool ?? 'fixture',
				toolVersion: generation.modelVersion ?? 'fixture',
				settings: {
					normalizedSha256: manifest.normalized.sha256,
					normalizedBytes: manifest.normalized.bytes,
					normalizedDimensions: manifest.normalized.dimensions,
					promptUnavailable:
						generation.promptUnavailable ?? (panel.id.startsWith('camera-underlay-') ? true : false)
				},
				seed: generation.seed ?? null,
				seedUnavailable: generation.seedUnavailable ?? true,
				prompt:
					(generation.promptUnavailable ?? (panel.id.startsWith('camera-underlay-') ? true : false))
						? null
						: (generation.prompt ?? null),
				promptSha256:
					(generation.promptUnavailable ?? (panel.id.startsWith('camera-underlay-') ? true : false))
						? null
						: (generation.promptSha256 ?? null),
				referenceImageSha256: [],
				byteReproducibleGeneration: false
			};
			return [panel.id, provenance] as const;
		})
	);
	const blockedSceneryRows = await Promise.all(
		MEADOW_ENTRY_PAINTED_V2_SCENERY_INSERTS.map(async (insert) => {
			const normalizedPath = join(repositoryRoot, insert.normalizedPath);
			const provenancePath = join(repositoryRoot, insert.provenancePath);
			const [bytes, manifestBytes] = await Promise.all([
				readFile(normalizedPath),
				readFile(provenancePath)
			]);
			const manifest = JSON.parse(manifestBytes.toString('utf8')) as Record<string, unknown>;
			const generation = manifest.generation as Record<string, unknown>;
			const raw = manifest.raw as Record<string, unknown>;
			const normalized = manifest.normalized as Record<string, unknown>;
			const review = manifest.review as Record<string, unknown>;
			const rawDimensions = raw.dimensions as Record<string, unknown>;
			const normalizedDimensions = normalized.dimensions as Record<string, unknown>;
			const promptUnavailable = generation.promptUnavailable === true;
			const provenance: MeadowEntryGenerationProvenance = {
				mode: 'generative',
				provider: String(generation.provider),
				model: String(generation.model),
				modelVersion: String(generation.modelVersion),
				tool: String(generation.tool),
				toolVersion: String(generation.modelVersion),
				settings: {
					insertId: insert.id,
					sceneryClass: insert.sceneryClass,
					owningSourceId: insert.owningSourceId,
					owningSourcePriority: insert.owningSourcePriority,
					bounds: insert.bounds,
					attempt: generation.attempt,
					attemptHistory: generation.attemptHistory ?? [],
					result: generation.result ?? null,
					rejected: generation.rejected ?? false,
					rawSha256: raw.sha256,
					rawBytes: raw.bytes,
					rawDimensions: {
						width: rawDimensions.width,
						height: rawDimensions.height
					},
					normalizedSha256: normalized.sha256,
					normalizedBytes: normalized.bytes,
					normalizedDimensions: {
						width: normalizedDimensions.width,
						height: normalizedDimensions.height
					},
					provenanceSha256: createHash('sha256').update(manifestBytes).digest('hex'),
					promptUnavailable,
					approval: {
						status: review.approval,
						answer: review.userAnswer,
						reviewer: null,
						approvedAtUtc: review.approvedAtUtc,
						scope: review.approvalScope,
						candidateSha256: review.approvalCandidateSha256,
						evidenceManifestSha256: review.approvalEvidenceManifestSha256,
						evidenceFileCount: review.approvalEvidenceFileCount ?? null,
						runtimePermission: review.runtimePermission ?? false
					}
				},
				seed: (generation.seed as number | string | null | undefined) ?? null,
				seedUnavailable: generation.seedUnavailable === true,
				prompt: promptUnavailable ? null : String(generation.prompt),
				promptSha256: promptUnavailable ? null : String(generation.promptSha256),
				referenceImageSha256: [],
				byteReproducibleGeneration: false
			};
			return [insert.id, { bytes, provenance }] as const;
		})
	);
	return {
		panels: Object.fromEntries(
			await Promise.all(
				MEADOW_ENTRY_PAINTED_V2_SOURCE_PANELS.map(async (panel) => [
					panel.id,
					await readFile(join(repositoryRoot, panel.normalizedPath))
				])
			)
		),
		panelProvenance: Object.fromEntries(panelProvenance),
		blockedScenery: {
			inserts: Object.fromEntries(blockedSceneryRows.map(([id, row]) => [id, row.bytes])),
			insertProvenance: Object.fromEntries(
				blockedSceneryRows.map(([id, row]) => [id, row.provenance])
			),
			masks: buildMeadowEntryPaintedV2SceneryMaskSet(repositoryRoot)
		},
		controlFingerprint: packageProvenance.controlFingerprint,
		approvedControlFingerprint: packageProvenance.controlFingerprint
	};
}

async function decodedFixturePanels(input: MeadowEntryPaintedV2PilotAssemblyInput) {
	return Promise.all(
		MEADOW_ENTRY_PAINTED_V2_SOURCE_PANELS.map(async (panel) => ({
			panel,
			rgba: await decodeMeadowEntryRgba(input.panels[panel.id]!)
		}))
	);
}

async function enrichedFixturePanels(input: MeadowEntryPaintedV2PilotAssemblyInput) {
	const decodedPanels = await decodedFixturePanels(input);
	const decodedInserts = await Promise.all(
		MEADOW_ENTRY_PAINTED_V2_SCENERY_INSERTS.map(async (insert) =>
			decodeMeadowEntryRgba(input.blockedScenery.inserts[insert.id]!)
		)
	);
	const enriched = enrichMeadowEntryPaintedV2Sources(
		decodedPanels.map(({ panel, rgba }) => ({
			id: panel.id,
			bounds: panel.bounds,
			rgba,
			assemblyPriority: panel.assemblyPriority
		})),
		MEADOW_ENTRY_PAINTED_V2_SCENERY_INSERTS.map((insert, index) => ({
			id: insert.id,
			sceneryClass: insert.sceneryClass,
			owningSourceId: insert.owningSourceId,
			bounds: insert.bounds,
			rgba: decodedInserts[index]!
		})),
		input.blockedScenery.masks
	);
	const enrichedById = new Map(enriched.panels.map((panel) => [panel.id, panel]));
	return decodedPanels.map(({ panel }) => ({
		panel,
		rgba: enrichedById.get(panel.id)!.rgba
	}));
}

async function assembleFixtureUnderlay(
	decodedPanels: Awaited<ReturnType<typeof decodedFixturePanels>>
) {
	const underlays = decodedPanels.filter(({ panel }) => panel.role === 'underlay');
	return assembleMeadowEntryPaintedV2Underlay({
		width: 6400,
		height: 6400,
		panels: underlays.map(({ panel, rgba }) => ({
			id: panel.id,
			bounds: panel.bounds,
			rgba
		})),
		northSouthPairs: [
			{
				northId: 'camera-underlay-sundrop-north',
				southId: 'camera-underlay-sundrop-south',
				bounds: { left: 0, top: 4736, right: 3200, bottom: 4864 }
			},
			{
				northId: 'camera-underlay-crossroads-north',
				southId: 'camera-underlay-crossroads-south',
				bounds: { left: 2368, top: 3776, right: 5568, bottom: 3904 }
			}
		],
		familyHandoff: {
			sundropPanelIds: ['camera-underlay-sundrop-north', 'camera-underlay-sundrop-south'],
			crossroadsPanelIds: ['camera-underlay-crossroads-north', 'camera-underlay-crossroads-south'],
			bounds: { left: 2368, top: 3200, right: 3200, bottom: 5440 }
		}
	});
}

describe('painted-v2 pilot partial master assembler', () => {
	it('requires the sealed blocked-scenery assembly input', async () => {
		const input = await fixture();
		const { blockedScenery: _blockedScenery, ...withoutBlockedScenery } = input;
		await expect(
			assembleMeadowEntryPaintedV2Pilot(
				withoutBlockedScenery as MeadowEntryPaintedV2PilotAssemblyInput
			)
		).rejects.toThrow(/blocked scenery/i);
	});

	it('fails closed for missing, extra, stale, misclassified, cross-owner, and unapproved inserts', async () => {
		const input = await fixture();
		const insertId = MEADOW_ENTRY_PAINTED_V2_SCENERY_INSERTS[0]!.id;
		const insertProvenance = input.blockedScenery.insertProvenance[insertId]!;
		const withoutInsert = Object.fromEntries(
			Object.entries(input.blockedScenery.inserts).filter(([id]) => id !== insertId)
		);
		await expect(
			assembleMeadowEntryPaintedV2Pilot({
				...input,
				blockedScenery: { ...input.blockedScenery, inserts: withoutInsert }
			})
		).rejects.toThrow(/blocked scenery inserts differ/i);
		await expect(
			assembleMeadowEntryPaintedV2Pilot({
				...input,
				blockedScenery: {
					...input.blockedScenery,
					inserts: { ...input.blockedScenery.inserts, 'unexpected-insert': Buffer.from('extra') }
				}
			})
		).rejects.toThrow(/blocked scenery inserts differ/i);
		const withSettings = (settings: Record<string, unknown>) => ({
			...input,
			blockedScenery: {
				...input.blockedScenery,
				insertProvenance: {
					...input.blockedScenery.insertProvenance,
					[insertId]: { ...insertProvenance, settings }
				}
			}
		});
		await expect(
			assembleMeadowEntryPaintedV2Pilot(
				withSettings({ ...insertProvenance.settings, normalizedSha256: '0'.repeat(64) })
			)
		).rejects.toThrow(/normalized hash|stale/i);
		await expect(
			assembleMeadowEntryPaintedV2Pilot(
				withSettings({ ...insertProvenance.settings, sceneryClass: 'woodland' })
			)
		).rejects.toThrow(/class drifted/i);
		await expect(
			assembleMeadowEntryPaintedV2Pilot(
				withSettings({
					...insertProvenance.settings,
					normalizedDimensions: { width: 1, height: 1 }
				})
			)
		).rejects.toThrow(/dimensions.*bounds/i);
		await expect(
			assembleMeadowEntryPaintedV2Pilot(
				withSettings({ ...insertProvenance.settings, owningSourceId: 'crossroads' })
			)
		).rejects.toThrow(/owner drifted/i);
		await expect(
			assembleMeadowEntryPaintedV2Pilot(
				withSettings({
					...insertProvenance.settings,
					approval: {
						...((insertProvenance.settings.approval ?? {}) as Record<string, unknown>),
						status: 'pending'
					}
				})
			)
		).rejects.toThrow(/approval is not approved/i);
	});

	it('ignores force-cast caller rows and keeps the sealed priority contract', async () => {
		const input = await fixture();
		const forgedInput: MeadowEntryPaintedV2PilotAssemblyInput = {
			...input,
			// @ts-expect-error The public assembly contract deliberately rejects caller-owned rows.
			panelSpecs: [...MEADOW_ENTRY_PAINTED_V2_SOURCE_PANELS].reverse().map((panel, index) => ({
				...panel,
				assemblyPriority: (index + 1) * 10
			}))
		};
		const result = await assembleMeadowEntryPaintedV2Pilot(forgedInput);
		expect(createHash('sha256').update(result.masterPng).digest('hex')).toBe(
			'd1dea4230454394e93e660513c5cc4e6af3cd1e62e61a39a162a2e8f48de0c0d'
		);
	});

	it('assembles the sealed panel priorities and leaves outside-pilot pixels transparent', async () => {
		const result = await assembleMeadowEntryPaintedV2Pilot(await fixture());
		const decoded = await decodeMeadowEntryRgba(result.masterPng);
		const masterX = 3000;
		const masterY = 4300;
		const overlapOffset = (masterY * decoded.width + masterX) * 4;
		expect(decoded.data[overlapOffset + 3]).toBe(255);
		const outsideOffset = (100 * decoded.width + 100) * 4;
		expect([...decoded.data.subarray(outsideOffset, outsideOffset + 4)]).toEqual([0, 0, 0, 0]);
	});

	it('applies both sealed pair corrections immediately after each second member', async () => {
		const input = await fixture();
		const result = await assembleMeadowEntryPaintedV2Pilot(input);
		const actual = await decodeMeadowEntryRgba(result.masterPng);
		const enrichedDecodedPanels = await enrichedFixturePanels(input);
		const expected = await assembleFixtureUnderlay(enrichedDecodedPanels);
		const detailPanels = enrichedDecodedPanels
			.filter(({ panel }) => panel.role === 'detail')
			.map(({ panel, rgba }) => ({
				id: panel.id,
				bounds: panel.bounds,
				rgba,
				assemblyPriority: panel.assemblyPriority
			}));
		compositeMeadowEntryDetailPanels(expected, detailPanels);
		expect(actual.data.equals(expected.data)).toBe(true);
		for (const [x, y] of [
			[1_568, 4_992],
			[3_136, 4_624]
		] as const) {
			const offset = (y * actual.width + x) * 4;
			expect(actual.data.subarray(offset, offset + 4), `${x},${y}`).toEqual(
				expected.data.subarray(offset, offset + 4)
			);
		}
	});

	it('fails closed when a panel dimensions or normalized hash drifts', async () => {
		const input = await fixture();
		const panelId = MEADOW_ENTRY_PAINTED_V2_SOURCE_PANELS[0]!.id;
		const wrongDimensions: MeadowEntryPaintedV2PilotAssemblyInput = {
			...input,
			panelProvenance: {
				...input.panelProvenance,
				[panelId]: {
					...input.panelProvenance[panelId]!,
					settings: {
						...input.panelProvenance[panelId]!.settings,
						normalizedDimensions: { width: 2625, height: 1088 }
					}
				}
			}
		};
		await expect(assembleMeadowEntryPaintedV2Pilot(wrongDimensions)).rejects.toThrow(/dimension/i);

		const wrongHash: MeadowEntryPaintedV2PilotAssemblyInput = {
			...input,
			panelProvenance: {
				...input.panelProvenance,
				[panelId]: {
					...input.panelProvenance[panelId]!,
					settings: {
						...input.panelProvenance[panelId]!.settings,
						normalizedSha256: 'b'.repeat(64)
					}
				}
			}
		};
		await expect(assembleMeadowEntryPaintedV2Pilot(wrongHash)).rejects.toThrow(/hash/i);

		const changedBytes = Buffer.from(input.panels[panelId]!);
		changedBytes[changedBytes.length - 1] = changedBytes[changedBytes.length - 1]! ^ 1;
		const wrongBytes: MeadowEntryPaintedV2PilotAssemblyInput = {
			...input,
			panels: { ...input.panels, [panelId]: changedBytes }
		};
		await expect(assembleMeadowEntryPaintedV2Pilot(wrongBytes)).rejects.toThrow(/hash|drift/i);
	});

	it('emits byte-identical master and provenance on repeat runs', async () => {
		const input = await fixture();
		const first = await assembleMeadowEntryPaintedV2Pilot(input);
		const second = await assembleMeadowEntryPaintedV2Pilot(input);
		expect(second.masterPng.equals(first.masterPng)).toBe(true);
		expect(second.provenanceJson.equals(first.provenanceJson)).toBe(true);
		const masterHash = createHash('sha256').update(first.masterPng).digest('hex');
		expect(masterHash).toBe('d1dea4230454394e93e660513c5cc4e6af3cd1e62e61a39a162a2e8f48de0c0d');
	});

	it('keeps every visible registered detail perimeter equal to the pre-detail composite', async () => {
		const input = await fixture();
		const result = await assembleMeadowEntryPaintedV2Pilot(input);
		const decodedMaster = await decodeMeadowEntryRgba(result.masterPng);
		const enrichedPanels = await enrichedFixturePanels(input);
		const underlay = await assembleFixtureUnderlay(enrichedPanels);
		const details = enrichedPanels
			.filter(({ panel }) => panel.role === 'detail')
			.sort((a, b) => a.panel.assemblyPriority - b.panel.assemblyPriority);
		for (const { panel, rgba } of details) {
			const detail: MeadowEntryUnderlayDecodedPanel = { id: panel.id, bounds: panel.bounds, rgba };
			for (let y = panel.bounds.top; y < panel.bounds.bottom; y += 1) {
				for (let x = panel.bounds.left; x < panel.bounds.right; x += 1) {
					const perimeter =
						x === panel.bounds.left ||
						x === panel.bounds.right - 1 ||
						y === panel.bounds.top ||
						y === panel.bounds.bottom - 1;
					if (!perimeter) continue;
					const coveredLater = details.some(
						({ panel: later }) =>
							later.assemblyPriority > panel.assemblyPriority &&
							x >= later.bounds.left &&
							x < later.bounds.right &&
							y >= later.bounds.top &&
							y < later.bounds.bottom
					);
					if (coveredLater) continue;
					const offset = (y * decodedMaster.width + x) * 4;
					expect(decodedMaster.data.subarray(offset, offset + 4), `${panel.id}:${x},${y}`).toEqual(
						underlay.data.subarray(offset, offset + 4)
					);
				}
			}
			compositeMeadowEntryDetailPanel(underlay, detail);
		}
	});

	it('strictly attributes every visible boundary improvement to the feathered compositor', async () => {
		const input = await fixture();
		const result = await assembleMeadowEntryPaintedV2Pilot(input);
		const corrected = await decodeMeadowEntryRgba(result.masterPng);
		const enrichedPanels = await enrichedFixturePanels(input);
		const baseline = await assembleFixtureUnderlay(enrichedPanels);
		const details = enrichedPanels
			.filter(({ panel }) => panel.role === 'detail')
			.sort((first, second) => first.panel.assemblyPriority - second.panel.assemblyPriority);
		for (const { panel, rgba } of details) {
			for (let y = panel.bounds.top; y < panel.bounds.bottom; y += 1) {
				const sourceStart = (y - panel.bounds.top) * rgba.width * 4;
				const targetStart = (y * baseline.width + panel.bounds.left) * 4;
				rgba.data.copy(baseline.data, targetStart, sourceStart, sourceStart + rgba.width * 4);
			}
		}
		const baselinePng = await encodeCanonicalMeadowEntryPng(
			baseline.data,
			baseline.width,
			baseline.height
		);
		expect(createHash('sha256').update(baselinePng).digest('hex')).toBe(
			'8eba8b58e92bcf21870c06e0d27f52fe3dec6793c1ed489011023b544cf02578'
		);

		const metricPanels = details.map(({ panel }) => ({
			id: panel.id,
			bounds: panel.bounds,
			assemblyPriority: panel.assemblyPriority
		}));
		const baselineMetrics = measureMeadowEntryDetailBoundaryMetrics(baseline, metricPanels);
		const correctedMetrics = measureMeadowEntryDetailBoundaryMetrics(corrected, metricPanels);
		expect(correctedMetrics).toHaveLength(19);
		expect(
			correctedMetrics.map(({ panelId, edge, samples, comparisonSamples }) => ({
				panelId,
				edge,
				samples,
				comparisonSamples
			}))
		).toContainEqual({
			panelId: 'sundrop-north',
			edge: 'right',
			samples: 544,
			comparisonSamples: 18_432
		});
		expect(
			correctedMetrics.map(({ panelId, edge, samples, comparisonSamples }) => ({
				panelId,
				edge,
				samples,
				comparisonSamples
			}))
		).toContainEqual({
			panelId: 'village-crossroads-connector',
			edge: 'right',
			samples: 128,
			comparisonSamples: 8_192
		});
		for (const [index, correctedMetric] of correctedMetrics.entries()) {
			const baselineMetric = baselineMetrics[index]!;
			expect(
				{ panelId: correctedMetric.panelId, edge: correctedMetric.edge },
				`metric order ${index}`
			).toEqual({ panelId: baselineMetric.panelId, edge: baselineMetric.edge });
			expect(
				correctedMetric.excess,
				`${correctedMetric.panelId}/${correctedMetric.edge} boundary excess`
			).toBeLessThanOrEqual(baselineMetric.excess * 0.25);
		}
		const heroTop = correctedMetrics.find(
			(metric) => metric.panelId === 'hero-house-frontage' && metric.edge === 'top'
		)!;
		expect(heroTop.edgeP95).toBe(13);
		expect(heroTop.comparisonP95).toBe(14);
		expect(heroTop.p95Ratio).toBeGreaterThan(0.9);
	});

	it('validates prompt-unavailable provenance only for the four approved attempt-3 underlays', async () => {
		const input = await fixture();
		const promptUnavailableIds = Object.entries(input.panelProvenance)
			.filter(([, provenance]) => provenance.settings['promptUnavailable'] === true)
			.map(([id]) => id)
			.sort();
		expect(promptUnavailableIds).toEqual([
			'camera-underlay-crossroads-north',
			'camera-underlay-crossroads-south',
			'camera-underlay-sundrop-north',
			'camera-underlay-sundrop-south'
		]);
		for (const id of promptUnavailableIds) {
			const provenance = input.panelProvenance[id]!;
			expect(provenance.prompt, id).toBeNull();
			expect(provenance.promptSha256, id).toBeNull();
			expect(() => validateMeadowEntryGenerationProvenance(provenance), id).not.toThrow();
		}
	});

	it('keeps the approved overlap contract available for runtime proof checks', () => {
		expect(MEADOW_ENTRY_PAINTED_V2_PILOT_CROPS).toHaveLength(2);
		expect(MEADOW_ENTRY_PAINTED_V2_PILOT_OVERLAPS).toHaveLength(1);
	});

	it('records camera-safe alpha metrics and the sealed blend policy', async () => {
		const input = await fixture();
		const result = await assembleMeadowEntryPaintedV2Pilot(input);
		const provenance = JSON.parse(result.provenanceJson.toString('utf8')) as {
			controls: { fingerprint: string };
			base: {
				alpha: { opaquePixels: number; transparentPixels: number };
			};
			policy: {
				alpha: string;
				underlayAssembly: {
					northSouthLastIndex: number;
					familyHandoffLastIndex: number;
					detailPolicy: string;
					detailFeatherWidthPx: number;
					detailFeatherLastInsetIndex: number;
					detailSourceBytes: string;
					detailPairCorrections: {
						stage: string;
						formulas: Readonly<Record<string, string>>;
						pairs: unknown;
					};
				};
			};
		};
		expect(provenance.controls.fingerprint).toBe(input.controlFingerprint);
		expect(provenance.base.alpha).toEqual({
			opaquePixels: 18_616_320,
			transparentPixels: 22_343_680
		});
		expect(provenance.policy.alpha).toBe('opaque-inside-camera-safe-crop-union');
		expect(provenance.policy.underlayAssembly).toMatchObject({
			northSouthLastIndex: 127,
			familyHandoffLastIndex: 831,
			detailPolicy:
				'ascending-priority-source-over-current-master-with-128px-inset-smoothstep-feather-and-immediate-pair-corrections',
			detailFeatherWidthPx: 128,
			detailFeatherLastInsetIndex: 127,
			detailSourceBytes: 'immutable',
			detailPairCorrections: {
				stage: 'immediately-after-second-member',
				formulas: MEADOW_ENTRY_PAINTED_V2_DETAIL_PAIR_FORMULAS,
				pairs: MEADOW_ENTRY_PAINTED_V2_DETAIL_PAIRS
			}
		});
	});
});
