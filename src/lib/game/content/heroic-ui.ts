/**
 * Heroic UI presentation metadata keyed by stable dialogue/NPC ids.
 * One neutral bust per NPC — no mood variants.
 */
const DIALOGUE_BUSTS: Record<string, string> = {
	liam: '/game/assets/heroic-ui/busts/liam.png',
	'guild-master': '/game/assets/heroic-ui/busts/guild-master-arlen.png',
	'guild-quartermaster': '/game/assets/heroic-ui/busts/quartermaster-vale.png',
	'shopkeeper-mira': '/game/assets/heroic-ui/busts/mira.png',
	'blacksmith-oren': '/game/assets/heroic-ui/busts/blacksmith-oren.png'
};

export function getDialogueBustPath(npcId: string | null): string | null {
	if (npcId === null) return null;
	return DIALOGUE_BUSTS[npcId] ?? null;
}
