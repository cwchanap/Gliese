import { describe, expect, it } from 'vitest';

import { createNewSaveState } from '$lib/game/save/save-state';
import { saveGameState } from '$lib/game/save/storage';

describe('save storage', () => {
	it('writes the serialized save to localStorage', () => {
		saveGameState(createNewSaveState());

		expect(localStorage.getItem('gliese.save.v1')).toContain('"mapId":"meadow-entry"');
	});
});
