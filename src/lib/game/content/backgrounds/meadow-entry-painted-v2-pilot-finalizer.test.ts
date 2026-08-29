import { expect, it } from 'vitest';

import {
	MEADOW_ENTRY_PAINTED_V2_PILOT_CROPS,
	MEADOW_ENTRY_PAINTED_V2_PILOT_OVERLAPS
} from './meadow-entry-painted-v2-crop-manifest';

it('keeps the approved overlap contract available for runtime proof checks', () => {
	expect(MEADOW_ENTRY_PAINTED_V2_PILOT_CROPS).toHaveLength(2);
	expect(MEADOW_ENTRY_PAINTED_V2_PILOT_OVERLAPS).toHaveLength(1);
});
