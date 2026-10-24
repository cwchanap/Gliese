/**
 * Heroic UI presentation metadata keyed by stable dialogue/NPC ids.
 * One neutral bust per NPC — no mood variants.
 */
const DIALOGUE_BUSTS: Record<string, string> = {
	// Stand-in busts until the goblin cast art lands.
	borak: '/game/assets/heroic-ui/busts/guild-master-arlen.png',
	'borak-home': '/game/assets/heroic-ui/busts/guild-master-arlen.png',
	'borak-gate': '/game/assets/heroic-ui/busts/guild-master-arlen.png',
	'lodge-keeper': '/game/assets/heroic-ui/busts/quartermaster-vale.png',
	mira: '/game/assets/heroic-ui/busts/mira.png',
	oren: '/game/assets/heroic-ui/busts/blacksmith-oren.png'
};

export function getDialogueBustPath(npcId: string | null): string | null {
	if (npcId === null) return null;
	return DIALOGUE_BUSTS[npcId] ?? null;
}
