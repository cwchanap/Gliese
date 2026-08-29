import { describe, expect, it } from 'vitest';

import {
	parseFinalizeMeadowEntryPaintedV2PilotArguments,
	runFinalizeMeadowEntryPaintedV2Pilot
} from '../../../../../tools/finalize-meadow-entry-painted-v2-pilot';

describe('painted-v2 pilot finalizer CLI', () => {
	it('parses only the no-write check flag', () => {
		expect(parseFinalizeMeadowEntryPaintedV2PilotArguments([])).toEqual({ check: false });
		expect(parseFinalizeMeadowEntryPaintedV2PilotArguments(['--check'])).toEqual({ check: true });
		expect(() => parseFinalizeMeadowEntryPaintedV2PilotArguments(['--check', '--check'])).toThrow(
			/duplicate/i
		);
		expect(() =>
			parseFinalizeMeadowEntryPaintedV2PilotArguments(['--output-root', '/tmp'])
		).toThrow(/unknown/i);
	});

	it('fails closed in check mode when the assembled master is absent', async () => {
		await expect(
			runFinalizeMeadowEntryPaintedV2Pilot('/tmp/gliese-painted-v2-pilot-missing-test-root', {
				check: true
			})
		).rejects.toThrow(/missing|stale|master/i);
	});
});
