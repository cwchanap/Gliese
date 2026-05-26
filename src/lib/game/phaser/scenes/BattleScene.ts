import * as Phaser from 'phaser';

import type { BattleStartPayload } from '$lib/game/core/battle';

export class BattleScene extends Phaser.Scene {
	static readonly key = 'battle';
	private payload: BattleStartPayload | null = null;

	constructor() {
		super(BattleScene.key);
	}

	create(payload: BattleStartPayload) {
		this.payload = payload;
		this.cameras.main.setBackgroundColor('#17231f');
	}

	getBattlePayloadForTest() {
		return this.payload;
	}
}
