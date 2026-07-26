import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('$lib/game/content/generated/sundrop-village-art-control', () => ({
	SUNDROP_VILLAGE_ART_CONTROL_FINGERPRINT: 'deadbeef'.repeat(8)
}));

const { retouchSundropVillagePng, SUNDROP_VILLAGE_RETOUCH_INPUT_PATH } =
	await import('./sundrop-village-retouch');

const INPUT_PATH = join(process.cwd(), SUNDROP_VILLAGE_RETOUCH_INPUT_PATH);

let inputPng: Buffer;

beforeAll(async () => {
	inputPng = await readFile(INPUT_PATH);
});

describe('Sundrop Village retouch generated-fingerprint guard', () => {
	it('rejects when the generated art-control fingerprint constant drifts from the computed geometry', async () => {
		await expect(retouchSundropVillagePng(inputPng)).rejects.toThrow(
			/Sundrop Village generated control fingerprint must match current geometry.*deadbeef/
		);
	});
});
