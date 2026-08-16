import type { PixelBounds } from './meadow-entry-authoring-types';

export interface MeadowEntryGenerationProvenance {
	mode: 'generative' | 'manual';
	provider: string | null;
	model: string | null;
	modelVersion: string | null;
	tool: string;
	toolVersion: string;
	settings: Readonly<Record<string, unknown>>;
	seed: number | string | null;
	seedUnavailable: boolean;
	prompt: string | null;
	promptSha256: string | null;
	referenceImageSha256: readonly string[];
	byteReproducibleGeneration: boolean;
}

export interface MeadowEntryPaintedV2SceneryInsertGenerationExpectation {
	readonly id: string;
	readonly sceneryClass: 'hedge' | 'woodland';
	readonly owningSourceId: string;
	readonly owningSourcePriority: number;
	readonly bounds: PixelBounds;
}

export interface MeadowEntryNormalizationTransform {
	native: { width: number; height: number };
	crop: { left: number; top: number; width: number; height: number };
	output: { width: number; height: number };
	scale: number;
}

export interface MeadowEntryRefinementProvenance {
	plane: 'base' | 'foreground';
	sourceRegionIds: readonly string[];
	editMaskSha256: string;
	replacementSha256: string;
	beforeMasterSha256: string;
	afterMasterSha256: string;
	changedBounds: PixelBounds;
	affectedCropIds: readonly string[];
	transform: MeadowEntryNormalizationTransform;
}

const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const BYTE_REPRODUCIBILITY_CAPABILITY_SETTING = 'providerSupportsByteReproducibleGeneration';

function assertNonEmptyString(value: string | null, label: string): asserts value is string {
	if (typeof value !== 'string' || value.length === 0) {
		throw new Error(`Meadow Entry generation provenance requires ${label}`);
	}
}

function assertSha256(value: string, label: string): void {
	if (!SHA256_PATTERN.test(value)) {
		throw new Error(`Meadow Entry generation provenance ${label} must be a lowercase SHA-256 hash`);
	}
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assertStringOrNull(value: unknown, label: string): asserts value is string | null {
	if (value !== null && typeof value !== 'string') {
		throw new Error(`Meadow Entry generation provenance ${label} must be a string or null`);
	}
}

function assertStringArray(value: unknown, label: string): asserts value is string[] {
	if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string')) {
		throw new Error(`Meadow Entry generation provenance ${label} must be an array of strings`);
	}
}

function assertInteger(value: unknown, label: string): asserts value is number {
	if (!Number.isInteger(value)) {
		throw new Error(`Meadow Entry refinement provenance ${label} must be an integer`);
	}
}

function assertFiniteNumber(value: unknown, label: string): asserts value is number {
	if (typeof value !== 'number' || !Number.isFinite(value)) {
		throw new Error(`Meadow Entry refinement provenance ${label} must be a finite number`);
	}
}

function assertPositiveInteger(value: unknown, label: string): asserts value is number {
	if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
		throw new Error(`Meadow Entry scenery insert provenance ${label} must be a positive integer`);
	}
}

function assertSceneryInsertBounds(value: unknown, expected: PixelBounds, label: string): void {
	if (!isPlainObject(value)) {
		throw new Error(`Meadow Entry scenery insert provenance ${label} bounds must be an object`);
	}
	for (const key of ['left', 'top', 'right', 'bottom'] as const) {
		if (value[key] !== expected[key]) {
			throw new Error(
				`Meadow Entry scenery insert provenance ${label} bounds do not match the sealed contract`
			);
		}
	}
}

function assertPixelBounds(value: unknown, label: string): void {
	if (!isPlainObject(value)) {
		throw new Error(`Meadow Entry refinement provenance ${label} must be an object`);
	}
	assertInteger(value.left, `${label} left`);
	assertInteger(value.top, `${label} top`);
	assertInteger(value.right, `${label} right`);
	assertInteger(value.bottom, `${label} bottom`);
	if (value.left < 0 || value.top < 0 || value.right < 0 || value.bottom < 0) {
		throw new Error(`Meadow Entry refinement provenance ${label} coordinates must be non-negative`);
	}
	if (value.right < value.left || value.bottom < value.top) {
		throw new Error(
			`Meadow Entry refinement provenance ${label} right/bottom must not precede left/top`
		);
	}
}

function assertNormalizationTransformShape(value: unknown, label: string): void {
	if (!isPlainObject(value)) {
		throw new Error(`Meadow Entry refinement provenance ${label} must be an object`);
	}
	const native = value.native;
	const crop = value.crop;
	const output = value.output;
	if (!isPlainObject(native)) {
		throw new Error(`Meadow Entry refinement provenance ${label} native must be an object`);
	}
	if (!isPlainObject(crop)) {
		throw new Error(`Meadow Entry refinement provenance ${label} crop must be an object`);
	}
	if (!isPlainObject(output)) {
		throw new Error(`Meadow Entry refinement provenance ${label} output must be an object`);
	}
	assertInteger(native.width, `${label} native width`);
	assertInteger(native.height, `${label} native height`);
	assertInteger(crop.left, `${label} crop left`);
	assertInteger(crop.top, `${label} crop top`);
	assertInteger(crop.width, `${label} crop width`);
	assertInteger(crop.height, `${label} crop height`);
	assertInteger(output.width, `${label} output width`);
	assertInteger(output.height, `${label} output height`);
	assertFiniteNumber(value.scale, `${label} scale`);
	if (native.width <= 0 || native.height <= 0) {
		throw new Error(
			`Meadow Entry refinement provenance ${label} native dimensions must be positive`
		);
	}
	if (crop.left < 0 || crop.top < 0) {
		throw new Error(
			`Meadow Entry refinement provenance ${label} crop must begin inside native input`
		);
	}
	if (crop.width <= 0 || crop.height <= 0) {
		throw new Error(`Meadow Entry refinement provenance ${label} crop dimensions must be positive`);
	}
	if (crop.left + crop.width > native.width || crop.top + crop.height > native.height) {
		throw new Error(`Meadow Entry refinement provenance ${label} crop must fit native input`);
	}
	if (output.width <= 0 || output.height <= 0) {
		throw new Error(
			`Meadow Entry refinement provenance ${label} output dimensions must be positive`
		);
	}
}

/**
 * Validates a generation provenance record.
 *
 * @param value - The record to validate, typed as `unknown` so callers can
 *   validate untrusted serialized input before narrowing it.
 * @returns Nothing. On success the value can be treated as a
 *   `MeadowEntryGenerationProvenance`.
 * @throws Error - When the value is not a plain object, a known field has the
 *   wrong type, a mode-specific field combination is invalid, or a hash is not
 *   a canonical SHA-256 hex string.
 */
export function validateMeadowEntryGenerationProvenance(value: unknown): void {
	if (!isPlainObject(value)) {
		throw new Error('Meadow Entry generation provenance must be an object');
	}
	if (value.mode !== 'manual' && value.mode !== 'generative') {
		throw new Error("Meadow Entry generation provenance mode must be 'manual' or 'generative'");
	}
	if (typeof value.tool !== 'string') {
		throw new Error('Meadow Entry generation provenance tool must be a string');
	}
	if (typeof value.toolVersion !== 'string') {
		throw new Error('Meadow Entry generation provenance tool version must be a string');
	}
	if (!isPlainObject(value.settings)) {
		throw new Error('Meadow Entry generation provenance settings must be an object');
	}
	assertStringOrNull(value.provider, 'provider');
	assertStringOrNull(value.model, 'model');
	assertStringOrNull(value.modelVersion, 'model version');
	assertStringOrNull(value.prompt, 'prompt');
	assertStringOrNull(value.promptSha256, 'prompt hash');
	if (value.seed !== null && typeof value.seed !== 'number' && typeof value.seed !== 'string') {
		throw new Error('Meadow Entry generation provenance seed must be a number, string, or null');
	}
	if (typeof value.seedUnavailable !== 'boolean') {
		throw new Error('Meadow Entry generation provenance seedUnavailable must be a boolean');
	}
	if (typeof value.byteReproducibleGeneration !== 'boolean') {
		throw new Error(
			'Meadow Entry generation provenance byteReproducibleGeneration must be a boolean'
		);
	}
	assertStringArray(value.referenceImageSha256, 'reference image hashes');
	for (const hash of value.referenceImageSha256) {
		assertSha256(hash, 'reference image hash');
	}

	assertNonEmptyString(value.tool, 'tool');
	assertNonEmptyString(value.toolVersion, 'tool version');

	if (value.mode === 'manual') {
		if (
			value.provider !== null ||
			value.model !== null ||
			value.modelVersion !== null ||
			value.seed !== null ||
			value.prompt !== null ||
			value.promptSha256 !== null ||
			value.seedUnavailable
		) {
			throw new Error(
				'Manual Meadow Entry generation provenance must not include generation fields'
			);
		}
		return;
	}

	assertNonEmptyString(value.provider, 'provider');
	assertNonEmptyString(value.model, 'model');
	assertNonEmptyString(value.modelVersion, 'model version');
	if (value.seed === null && !value.seedUnavailable) {
		throw new Error('Seedless Meadow Entry generation provenance must declare seedUnavailable');
	}
	if (value.seed !== null && value.seedUnavailable) {
		throw new Error('Seeded Meadow Entry generation provenance cannot declare seedUnavailable');
	}
	const promptUnavailable = value.settings.promptUnavailable === true;
	if (promptUnavailable) {
		if (value.prompt !== null || value.promptSha256 !== null) {
			throw new Error(
				'Meadow Entry generation provenance marked promptUnavailable must omit prompt and prompt hash'
			);
		}
	} else {
		assertNonEmptyString(value.prompt, 'prompt');
		if (value.promptSha256 === null) {
			throw new Error('Meadow Entry generation provenance requires a prompt hash');
		}
		assertSha256(value.promptSha256, 'prompt hash');
	}
	if (value.byteReproducibleGeneration) {
		if (value.seed === null || value.seedUnavailable) {
			throw new Error('Seedless Meadow Entry generation cannot claim byte-reproducible output');
		}
		if (value.settings[BYTE_REPRODUCIBILITY_CAPABILITY_SETTING] !== true) {
			throw new Error(
				'Meadow Entry generation cannot claim byte-reproducible output without a provider capability declaration'
			);
		}
	}
}

/**
 * Validates the provenance binding that lets the production forest bake trust
 * an insert as the exact approved row from the scenery registry.
 */
export function validateMeadowEntryPaintedV2SceneryInsertGenerationProvenance(
	value: unknown,
	expected: MeadowEntryPaintedV2SceneryInsertGenerationExpectation
): void {
	validateMeadowEntryGenerationProvenance(value);
	if (!isPlainObject(value))
		throw new Error('Meadow Entry scenery insert provenance must be an object');
	const settings = value.settings;
	if (!isPlainObject(settings)) {
		throw new Error('Meadow Entry scenery insert provenance settings must be an object');
	}
	if (settings.insertId !== expected.id) {
		throw new Error(`Meadow Entry scenery insert provenance id drifted: ${expected.id}`);
	}
	if (settings.sceneryClass !== expected.sceneryClass) {
		throw new Error(`Meadow Entry scenery insert class drifted: ${expected.id}`);
	}
	if (settings.owningSourceId !== expected.owningSourceId) {
		throw new Error(`Meadow Entry scenery insert owner drifted: ${expected.id}`);
	}
	if (settings.owningSourcePriority !== expected.owningSourcePriority) {
		throw new Error(`Meadow Entry scenery insert priority drifted: ${expected.id}`);
	}
	assertSceneryInsertBounds(settings.bounds, expected.bounds, expected.id);
	for (const key of ['rawSha256', 'normalizedSha256', 'provenanceSha256'] as const) {
		if (typeof settings[key] !== 'string') {
			throw new Error(`Meadow Entry scenery insert ${expected.id} requires ${key}`);
		}
		assertSha256(settings[key] as string, `${expected.id} ${key}`);
	}
	assertPositiveInteger(settings.rawBytes, `${expected.id} rawBytes`);
	assertPositiveInteger(settings.normalizedBytes, `${expected.id} normalizedBytes`);
	if (!isPlainObject(settings.rawDimensions) || !isPlainObject(settings.normalizedDimensions)) {
		throw new Error(`Meadow Entry scenery insert ${expected.id} dimensions are invalid`);
	}
	assertPositiveInteger(settings.rawDimensions.width, `${expected.id} raw width`);
	assertPositiveInteger(settings.rawDimensions.height, `${expected.id} raw height`);
	assertPositiveInteger(settings.normalizedDimensions.width, `${expected.id} normalized width`);
	assertPositiveInteger(settings.normalizedDimensions.height, `${expected.id} normalized height`);
	assertPositiveInteger(settings.attempt, `${expected.id} attempt`);
	if (!Array.isArray(settings.attemptHistory)) {
		throw new Error(`Meadow Entry scenery insert ${expected.id} attempt history is invalid`);
	}
	const approval = settings.approval;
	if (!isPlainObject(approval)) {
		throw new Error(`Meadow Entry scenery insert ${expected.id} approval is missing`);
	}
	if (
		approval.status !== 'approved-explicit-interim-gate' &&
		approval.status !== 'approved-explicit-final-source-gate'
	) {
		throw new Error(`Meadow Entry scenery insert ${expected.id} approval is not approved`);
	}
	if (approval.answer !== 'yes') {
		throw new Error(`Meadow Entry scenery insert ${expected.id} approval answer is not yes`);
	}
	assertNonEmptyString(approval.approvedAtUtc as string, `${expected.id} approval timestamp`);
	assertNonEmptyString(approval.scope as string, `${expected.id} approval scope`);
	for (const key of ['candidateSha256', 'evidenceManifestSha256'] as const) {
		if (typeof approval[key] !== 'string') {
			throw new Error(`Meadow Entry scenery insert ${expected.id} approval requires ${key}`);
		}
		assertSha256(approval[key] as string, `${expected.id} approval ${key}`);
	}
	if (
		approval.evidenceFileCount !== null &&
		(!Number.isInteger(approval.evidenceFileCount) || (approval.evidenceFileCount as number) < 0)
	) {
		throw new Error(
			`Meadow Entry scenery insert ${expected.id} approval evidence count is invalid`
		);
	}
	if (approval.reviewer !== null && typeof approval.reviewer !== 'string') {
		throw new Error(`Meadow Entry scenery insert ${expected.id} reviewer is invalid`);
	}
	if (approval.runtimePermission !== false) {
		throw new Error(`Meadow Entry scenery insert ${expected.id} has runtime permission`);
	}
}

/**
 * Validates a refinement provenance record.
 *
 * @param value - The record to validate, typed as `unknown` so callers can
 *   validate untrusted serialized input before narrowing it.
 * @returns Nothing. On success the value can be treated as a
 *   `MeadowEntryRefinementProvenance`.
 * @throws Error - When the value is not a plain object, a known field has the
 *   wrong type, a hash is not a canonical SHA-256 hex string, the changed
 *   bounds are invalid, or the normalization transform shape is invalid.
 */
export function validateMeadowEntryRefinementProvenance(value: unknown): void {
	if (!isPlainObject(value)) {
		throw new Error('Meadow Entry refinement provenance must be an object');
	}
	if (value.plane !== 'base' && value.plane !== 'foreground') {
		throw new Error("Meadow Entry refinement provenance plane must be 'base' or 'foreground'");
	}
	assertStringArray(value.sourceRegionIds, 'source region ids');
	assertStringArray(value.affectedCropIds, 'affected crop ids');
	if (typeof value.editMaskSha256 !== 'string') {
		throw new Error('Meadow Entry refinement provenance editMaskSha256 must be a string');
	}
	if (typeof value.replacementSha256 !== 'string') {
		throw new Error('Meadow Entry refinement provenance replacementSha256 must be a string');
	}
	if (typeof value.beforeMasterSha256 !== 'string') {
		throw new Error('Meadow Entry refinement provenance beforeMasterSha256 must be a string');
	}
	if (typeof value.afterMasterSha256 !== 'string') {
		throw new Error('Meadow Entry refinement provenance afterMasterSha256 must be a string');
	}
	assertSha256(value.editMaskSha256, 'edit mask hash');
	assertSha256(value.replacementSha256, 'replacement hash');
	assertSha256(value.beforeMasterSha256, 'before master hash');
	assertSha256(value.afterMasterSha256, 'after master hash');
	assertPixelBounds(value.changedBounds, 'changed bounds');
	assertNormalizationTransformShape(value.transform, 'transform');
}

/**
 * Asserts that each refinement links to its predecessor by master hash.
 *
 * @param refinements - Ordered refinement records for one plane.
 * @param plane - Plane label used in the error messages.
 * @returns Nothing.
 * @throws Error - If any refinement's `plane` does not match, or any
 *   `beforeMasterSha256` does not match the previous `afterMasterSha256`.
 */
export function assertMeadowEntryRefinementChain(
	refinements: readonly MeadowEntryRefinementProvenance[],
	plane: 'base' | 'foreground'
): void {
	for (let index = 0; index < refinements.length; index += 1) {
		if (refinements[index]!.plane !== plane) {
			throw new Error(
				`Meadow Entry refinement ${index} declared plane ${refinements[index]!.plane} but expected ${plane}`
			);
		}
	}
	for (let index = 0; index < refinements.length - 1; index += 1) {
		const current = refinements[index]!;
		const next = refinements[index + 1]!;
		if (current.afterMasterSha256 !== next.beforeMasterSha256) {
			throw new Error(
				`Meadow Entry ${plane} refinement ${index + 1} beforeMasterSha256 does not match refinement ${index} afterMasterSha256`
			);
		}
	}
}

/**
 * Asserts that the final refinement's `afterMasterSha256` matches the approved
 * master hash, binding the tail of the refinement chain to the published plane.
 *
 * The chain-link helper {@link assertMeadowEntryRefinementChain} only verifies
 * adjacency between refinement records; it does not know the approved master
 * hash. This helper closes the gap so that a hand-edited or independently
 * assembled provenance chain cannot end at an unrelated hash while still
 * passing package validation.
 *
 * @param refinements - Ordered refinement records for one plane.
 * @param plane - Plane label used in the error messages.
 * @param masterSha256 - The approved plane master sha256 that the final
 *   refinement must produce.
 * @returns Nothing.
 * @throws Error - When refinements are present and the last record's
 *   `afterMasterSha256` does not match `masterSha256`.
 */
export function assertMeadowEntryRefinementChainTerminal(
	refinements: readonly MeadowEntryRefinementProvenance[],
	plane: 'base' | 'foreground',
	masterSha256: string
): void {
	if (refinements.length === 0) return;
	const lastRefinement = refinements.at(-1)!;
	if (lastRefinement.afterMasterSha256 !== masterSha256) {
		throw new Error(`Meadow Entry ${plane} final refinement does not match the approved master`);
	}
}
