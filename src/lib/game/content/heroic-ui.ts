/**
 * Heroic UI presentation metadata keyed by stable dialogue/NPC ids.
 * One neutral bust per NPC — no mood variants.
 */
const bust = (name: string) => `/game/assets/heroic-ui/busts/${name}.png`;

const DIALOGUE_BUSTS: Record<string, string> = {
	borak: bust('borak'),
	'borak-home': bust('borak'),
	'borak-gate': bust('borak'),
	'drogg-home': bust('drogg'),
	'drogg-lodge': bust('drogg'),
	'drogg-north-gate': bust('drogg'),
	'drogg-falls': bust('drogg'),
	'drogg-well': bust('drogg'),
	'mott-hearth': bust('mott'),
	'mott-shrine': bust('mott'),
	'tikka-home': bust('tikka'),
	'tikka-captive': bust('tikka'),
	'lirra-herb-hut': bust('lirra'),
	'lirra-forest': bust('lirra'),
	'lirra-mistfen': bust('lirra'),
	'lirra-captive': bust('lirra'),
	mira: bust('shopkeeper'),
	'lodge-keeper': bust('quartermaster'),
	oren: bust('smith')
};

export function getDialogueBustPath(npcId: string | null): string | null {
	if (npcId === null) return null;
	return DIALOGUE_BUSTS[npcId] ?? null;
}
