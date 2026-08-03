import { spawnSync } from 'node:child_process';

import { MEADOW_ENTRY_CONTROLS_TEST_FILES } from './meadow-entry-art-test-files';

const result = spawnSync(
	'bun',
	['run', 'test:unit', '--', '--run', ...MEADOW_ENTRY_CONTROLS_TEST_FILES],
	{ stdio: 'inherit' }
);
process.exit(result.status ?? 1);
