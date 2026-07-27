export function parseFlagPairs(allowedFlags: string[], args: string[]): Map<string, string> {
	const allowed = new Set(allowedFlags.map((flag) => flag.replace(/^--/, '')));
	const result = new Map<string, string>();
	const normalizedArgs = args[0] === '--' ? args.slice(1) : [...args];
	for (const arg of normalizedArgs) {
		if (!arg.startsWith('--')) {
			throw new Error(`Malformed flag pair: ${arg} (expected --name=value)`);
		}
		const stripped = arg.replace(/^--/, '');
		const equalsIndex = stripped.indexOf('=');
		if (equalsIndex === -1) {
			throw new Error(`Malformed flag pair: ${arg} (expected --name=value)`);
		}
		const name = stripped.slice(0, equalsIndex);
		const value = stripped.slice(equalsIndex + 1);
		if (!allowed.has(name)) {
			throw new Error(`Unknown argument --${name}`);
		}
		if (result.has(name)) {
			throw new Error(`Duplicate argument --${name}`);
		}
		result.set(name, value);
	}
	return result;
}
