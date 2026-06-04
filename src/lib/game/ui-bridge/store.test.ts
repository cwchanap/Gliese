import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('$lib/game/save/storage', () => ({
	loadStoredSaveResult: vi.fn().mockReturnValue({ status: 'new' }),
	getSaveStorage: vi.fn().mockReturnValue(null)
}));

vi.mock('$lib/game/i18n/store', () => ({
	getActiveLocale: vi.fn().mockReturnValue('en')
}));

vi.mock('$lib/game/ui-bridge/events', async () => {
	const actual = await vi.importActual<typeof import('$lib/game/ui-bridge/events')>(
		'$lib/game/ui-bridge/events'
	);
	return {
		...actual,
		emitHudCommand: vi.fn()
	};
});

import {
	requestAcceptQuest,
	requestBuyShopItem,
	requestCloseShop,
	requestDialogueAdvance,
	requestDialogueChoice,
	requestDialogueClose,
	requestDismissBattleSummary,
	requestEquipItem,
	requestHeal,
	requestOpenShop,
	requestPauseGame,
	requestResume,
	requestResumeGame,
	requestSave,
	requestSellInventoryItem,
	requestUnequipSlot,
	requestUseItem
} from '$lib/game/ui-bridge/store';
import { emitHudCommand } from '$lib/game/ui-bridge/events';

const mockedEmit = vi.mocked(emitHudCommand);

describe('ui-bridge store request helpers', () => {
	beforeEach(() => {
		mockedEmit.mockClear();
	});

	it('requestSave emits a save command', () => {
		requestSave();
		expect(mockedEmit).toHaveBeenCalledWith({ type: 'save' });
	});

	it('requestResume emits a resume-save command', () => {
		requestResume();
		expect(mockedEmit).toHaveBeenCalledWith({ type: 'resume-save' });
	});

	it('requestHeal emits a heal command', () => {
		requestHeal();
		expect(mockedEmit).toHaveBeenCalledWith({ type: 'heal' });
	});

	it('requestPauseGame emits a pause-game command', () => {
		requestPauseGame();
		expect(mockedEmit).toHaveBeenCalledWith({ type: 'pause-game' });
	});

	it('requestResumeGame emits a resume-game command', () => {
		requestResumeGame();
		expect(mockedEmit).toHaveBeenCalledWith({ type: 'resume-game' });
	});

	it('requestUseItem emits a use-item command with the item id', () => {
		requestUseItem('field-potion');
		expect(mockedEmit).toHaveBeenCalledWith({ type: 'use-item', itemId: 'field-potion' });
	});

	it('requestEquipItem emits an equip-item command with the item id', () => {
		requestEquipItem('iron-cap');
		expect(mockedEmit).toHaveBeenCalledWith({ type: 'equip-item', itemId: 'iron-cap' });
	});

	it('requestUnequipSlot emits an unequip-slot command with the slot', () => {
		requestUnequipSlot('head');
		expect(mockedEmit).toHaveBeenCalledWith({ type: 'unequip-slot', slot: 'head' });
	});

	it('requestOpenShop emits an open-shop command with the shop id', () => {
		requestOpenShop('miras-item-shop');
		expect(mockedEmit).toHaveBeenCalledWith({ type: 'open-shop', shopId: 'miras-item-shop' });
	});

	it('requestCloseShop emits a close-shop command', () => {
		requestCloseShop();
		expect(mockedEmit).toHaveBeenCalledWith({ type: 'close-shop' });
	});

	it('requestBuyShopItem emits a buy-shop-item command with shop and stock ids', () => {
		requestBuyShopItem('guild-quartermaster', 'iron-cap');
		expect(mockedEmit).toHaveBeenCalledWith({
			type: 'buy-shop-item',
			shopId: 'guild-quartermaster',
			stockId: 'iron-cap'
		});
	});

	it('requestSellInventoryItem emits a sell-inventory-item command with the item id', () => {
		requestSellInventoryItem('field-potion');
		expect(mockedEmit).toHaveBeenCalledWith({
			type: 'sell-inventory-item',
			itemId: 'field-potion'
		});
	});

	it('requestAcceptQuest emits an accept-quest command with the quest id', () => {
		requestAcceptQuest('thin-village-slimes');
		expect(mockedEmit).toHaveBeenCalledWith({
			type: 'accept-quest',
			questId: 'thin-village-slimes'
		});
	});

	it('requestDialogueAdvance emits a dialogue-advance command', () => {
		requestDialogueAdvance();
		expect(mockedEmit).toHaveBeenCalledWith({ type: 'dialogue-advance' });
	});

	it('requestDialogueClose emits a dialogue-close command', () => {
		requestDialogueClose();
		expect(mockedEmit).toHaveBeenCalledWith({ type: 'dialogue-close' });
	});

	it('requestDialogueChoice emits a dialogue-choose command with the choice id', () => {
		requestDialogueChoice('quest');
		expect(mockedEmit).toHaveBeenCalledWith({ type: 'dialogue-choose', choiceId: 'quest' });
	});

	it('requestDismissBattleSummary emits a dismiss-battle-summary command', () => {
		requestDismissBattleSummary();
		expect(mockedEmit).toHaveBeenCalledWith({ type: 'dismiss-battle-summary' });
	});
});
