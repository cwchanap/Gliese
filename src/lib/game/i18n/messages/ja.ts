import type { EnglishMessages } from '$lib/game/i18n/messages/en';
import type { DeepPartial } from '$lib/game/i18n/messages/types';

export const ja = {
	ui: {
		menu: 'メニュー',
		systemMenu: 'システムメニュー',
		command: 'コマンド',
		fieldStatus: 'フィールド状態',
		settings: '設定',
		language: '言語',
		quests: '依頼',
		map: '地図',
		areaMap: 'エリア地図',
		areaMapDialog: '{{areaName}}の地図',
		regionSubline: '緑の地方 / 3日目',
		unexplored: '未探索',
		currentPosition: '現在位置',
		areaMapSelectedMarker: '選択中: {{name}}',
		heroName: 'LIAM',
		goldSuffix: 'G',
		activeQuest: '進行中の依頼',
		shop: '店',
		inventory: '持ち物',
		resumeSave: 'セーブ再開',
		saveGame: 'セーブ',
		useHeal: '回復を使う',
		battleSummary: 'バトル結果',
		battleVictory: '勝利',
		battleDefeat: '敗北',
		enemiesDefeated: '倒した敵: {{count}}',
		xpGained: '獲得XP: {{xp}}',
		coinsGained: '獲得コイン: {{coins}}',
		levelUp: 'レベルアップ',
		noDrops: 'アイテムドロップなし',
		continue: '続ける',
		questProgressUpdate: '{{progressLabel}}: {{currentProgress}}/{{target}}',
		defeatReturnedToVillage: '報酬はありません。社へ戻りました。',
		close: '閉じる',
		next: '次へ',
		mainQuest: 'メインクエスト',
		sideActive: 'サブ依頼{{count}}件',
		fieldPack: '携行品',
		consumables: '消耗品',
		equipment: '装備',
		keyItems: 'キーアイテム',
		stats: 'ステータス',
		equipped: '装備中',
		empty: '空',
		key: 'キー',
		keyItem: 'キーアイテム',
		remove: '外す',
		fieldJournal: 'フィールド手帳',
		questLog: '依頼手帳',
		main: 'メイン',
		side: 'サブ',
		availableFromGuildMaster: 'ギルドマスターから受注可能',
		noSideQuestsActive: '進行中のサブ依頼はありません。',
		coins: 'コイン: {{coins}}',
		buy: '買う',
		sell: '売る',
		noStockAvailable: '在庫がありません。',
		noSellableItems: '売れるアイテムがありません。',
		buyFor: '{{meta}}で購入',
		sellFor: '{{meta}}で売却',
		unlimited: '無制限',
		stockLeft: '残り{{count}}',
		emptyInventorySlot: '空の所持枠{{index}}',
		shopSections: '店の区分',
		inventorySections: '持ち物の区分',
		questTracker: '依頼トラッカー',
		playerStatus: 'プレイヤー状態',
		merchant: '商人',
		loadGameShellError: 'ゲームシェルを起動できませんでした。',
		levelAbbrev: 'LV',
		level: 'レベル{{level}}',
		hp: 'HP',
		xp: 'XP',
		attack: 'ATK',
		defense: 'DEF',
		heals: '回復',
		accept: '受ける',
		back: '戻る',
		reward: '報酬: {{rewardSummary}}',
		quantity: 'x{{quantity}}',
		keyQuantity: 'キーx{{quantity}}',
		statModifier: '{{stat}} +{{value}}',
		inventoryMetaWithModifiers: '{{slot}} / {{modifiers}}',
		shopBuyMeta: '{{price}}コイン / {{stock}}',
		shopSellMeta: '{{price}}コイン',
		shopSellMetaWithQuantity: '{{price}}コイン / x{{quantity}}',
		priceBadge: '{{price}}c',
		inventorySlotsLabel: '{{section}}の所持枠',
		equipmentSlots: {
			weapon: '武器',
			head: '頭',
			body: '体',
			hands: '手',
			accessory: 'アクセサリー'
		},
		itemKinds: {
			consumable: '消耗品',
			equipment: '装備'
		}
	},
	status: {
		loadingGame: 'ゲームを読み込み中',
		battleStarted: 'バトル開始',
		battleActive: 'バトル進行中',
		battleVictory: 'バトル勝利',
		battleDefeat: 'バトル敗北',
		battleReturned: 'バトルから帰還',
		battleLocked: 'バトル中は実行できません',
		noHealCharges: '回復回数がありません',
		itemCannotBeUsed: 'そのアイテムは使えません',
		hpAlreadyFull: 'HPは満タンです',
		recoveredHp: 'HPを回復した',
		strikeLanded: '攻撃が命中',
		enemyDefeated: '敵を倒した',
		victoryRuinsCleared: '勝利: 遺跡を制圧',
		itemCannotBeEquipped: '装備できません',
		equippedItem: '装備した',
		unequippedItem: '外した',
		noShopNearby: '近くに店がありません',
		shopOpened: '店を開いた',
		shopClosed: '店を閉じた',
		boughtItem: '{{itemName}}を購入した',
		soldItem: '{{itemName}}を売却した',
		noGuildQuestAvailable: '受けられるギルド依頼がありません',
		questAccepted: '依頼を受けた',
		questComplete: '依頼達成: {{questTitle}}',
		questAlreadyActive: 'すでに依頼中です',
		questAlreadyComplete: 'すでに達成済みです',
		questNotAvailable: 'その依頼は受けられません',
		questCannotBeAccepted: 'その依頼は受けられません',
		notEnoughCoins: 'コインが足りません',
		itemOutOfStock: '在庫切れです',
		itemCannotBeBought: '購入できません',
		equippedItemCannotBeSold: '装備中のアイテムは売れません',
		itemNotOwned: '持っていません',
		itemCannotBeSold: '売れません',
		noDialogueOpen: '会話が開いていません',
		noOneNearby: '近くに誰もいません',
		ruinsRouteUnlocked: '遺跡への道が開いた',
		dialogueClosed: '会話を閉じた',
		dialogueUpdated: '会話を更新した',
		noSaveFound: 'セーブがありません',
		saved: 'セーブした',
		saveResumed: 'セーブを再開した',
		enteredArea: 'エリアに入った',
		invalidSaveReset: '不正なセーブをリセット',
		newRun: '新しい冒険',
		reportToGuildMasterFirst: '先にギルドマスターへ報告してください',
		shopOutOfReach: '店に届きません',
		bossEnraged: 'ボスが激怒',
		heroDown: '主人公が倒れた',
		enemyStruckFirst: '敵の先制攻撃',
		foundItem: '{{itemName}}を見つけた',
		npcNearby: '{{npcName}}が近くにいる'
	},
	content: {
		items: {
			'field-potion': {
				name: 'フィールドポーション',
				description: 'HPを8回復する。'
			},
			'greater-field-potion': {
				name: '上級フィールドポーション',
				description: 'HPを14回復する。'
			},
			'ember-tonic': {
				name: 'エンバートニック',
				description: 'HPを5回復する。'
			},
			'ruin-draught': {
				name: '遺跡の妙薬',
				description: 'HPを10回復する。'
			},
			'sunleaf-salve': {
				name: '陽葉軟膏',
				description: 'HPを6回復する。'
			},
			'training-sword': {
				name: '訓練用の剣',
				description: '頼れる入門用の刃。'
			},
			'ruin-blade': {
				name: '遺跡の刃',
				description: '欠けた刃身に古い熱が宿る剣。'
			},
			'iron-cap': {
				name: '鉄兜',
				description: '危険な遺跡に備える簡素な防具。'
			},
			'warden-crown': {
				name: '守護者の冠',
				description: '遺跡の中心部から見つかった割れた兜。'
			},
			'traveler-vest': {
				name: '旅人のベスト',
				description: '長い道のりに向いた軽装。'
			},
			'stone-mail': {
				name: '石鎧',
				description: '遺跡の石を削り出した重い鎧。'
			},
			'grip-wraps': {
				name: '手甲巻き',
				description: '一撃ごとに手元を安定させる布巻き。'
			},
			'meadow-charm': {
				name: '草原のお守り',
				description: '草原の道で拾った小さなお守り。'
			},
			'meadow-token': {
				name: '草原の証',
				description: '入り口の草原でもらった記念品。'
			},
			'threshold-rune': {
				name: '境界のルーン',
				description: '遺跡の境界で刻まれた印。'
			},
			'warden-sigil': {
				name: '守護者の紋章',
				description: '遺跡の守護者を倒した証。'
			}
		},
		shops: {
			'miras-item-shop': {
				name: 'ミラの道具屋',
				merchantName: 'ミラ',
				description: '東の道へ出る旅人に、頼れる補給品を。'
			},
			'guild-quartermaster': {
				name: 'ギルド補給係',
				merchantName: '補給係ヴェイル',
				description: '新しい遺跡任務向けの、ギルド公認装備。'
			}
		},
		quests: {
			'investigate-the-ruins': {
				title: '遺跡を調査せよ',
				description: 'ギルドマスターに報告し、その後で遺跡の守護者を倒す。',
				objectives: {
					'talk-to-guild-master': {
						description: 'ギルドホールでギルドマスターと話す。',
						progressLabel: 'ギルドマスターに話した'
					},
					'defeat-ruins-warden': {
						description: '遺跡の中心部で守護者を倒す。',
						progressLabel: '遺跡の守護者を倒した'
					}
				}
			},
			'thin-village-slimes': {
				title: '村道のスライム掃討',
				description: '村へ続く道に集まったスライムを一掃する。',
				objectives: {
					'defeat-village-slimes': {
						description: '村の近くでスライムを倒す。',
						progressLabel: '村のスライムを倒した'
					}
				}
			},
			'thin-ruins-slimes': {
				title: '遺跡のスライム掃討',
				description: '遺跡の境界内にいるスライムを減らす。',
				objectives: {
					'defeat-ruins-slimes': {
						description: '遺跡でスライムを倒す。',
						progressLabel: '遺跡のスライムを倒した'
					}
				}
			},
			'recover-ruins-relics': {
				title: '遺跡の遺物回収',
				description: '古い遺跡から役立つ品を持ち帰る。',
				objectives: {
					'collect-ruins-items': {
						description: '遺跡の境界と中心部で遺跡の品を集める。',
						progressLabel: '遺跡の品を回収した'
					}
				}
			}
		},
		dialogue: {
			actions: {
				quest: '依頼',
				shop: '店',
				accept: '受ける',
				back: '戻る',
				close: '閉じる'
			},
			speakers: {
				traveler: '旅人',
				guildNotice: 'ギルド掲示'
			},
			system: {
				noDialogueAvailable: '会話はありません。',
				optionNotAvailable: 'その選択肢はありません。',
				chooseGuildWork: '確認したいギルド仕事を選んでください。',
				noNewGuildWork: '今は新しいギルド仕事がありません。',
				guildWorkUnavailable: 'そのギルド仕事はもう受けられません。',
				noDialogueOpen: '会話は開いていません。',
				noOneNearby: '近くに誰もいません。',
				noGuildQuestAvailableHere: 'ここで受けられるギルド依頼はありません。',
				shopOutOfReach: '店に届きません。',
				questDetailNotice: '{{questTitle}}: {{objectiveDescription}} 報酬: {{rewardSummary}}。',
				questCompleteNotice: '依頼達成: {{questTitle}}。報酬: {{rewardSummary}}。'
			}
		},
		maps: {
			landmarks: {
				'hero-house-exterior': { label: '主人公の家' },
				'guild-hall-exterior': { label: 'ギルド' },
				'item-shop-exterior': { label: '道具屋' },
				'villager-house-1-exterior': { label: '民家' },
				'villager-house-2-exterior': { label: '民家' },
				'villager-house-3-exterior': { label: '民家' },
				'sundrop-well': { label: 'サンドロップの井戸' },
				'whispering-cave': { label: 'ささやきの洞窟' },
				blacksmith: { label: '鍛冶屋' },
				'shrine-of-aurora': { label: 'オーロラの社' },
				'witchwood-gate': { label: '魔樹の門' },
				'silver-shrine-gate': { label: '銀の社の門' },
				'ferry-crossing': { label: '渡し場' }
			},
			npcs: {
				'guild-master': { name: 'ギルドマスター・アーレン' },
				'guild-quartermaster': { name: '補給係ヴェイル' },
				'shopkeeper-mira': { name: 'ミラ' },
				'villager-lynn': { name: 'リン' },
				'villager-toma': { name: 'トマ' },
				'villager-io': { name: 'イオ' }
			},
			areas: {
				'meadow-entry': 'サンドロップ草原',
				'hero-house': '主人公の家',
				'guild-hall': 'ギルドホール',
				'item-shop': '道具屋',
				'villager-house-1': '民家',
				'villager-house-2': '民家',
				'villager-house-3': '民家',
				'shrine-of-aurora-interior': 'オーロラの社',
				'ruins-threshold': '遺跡の境界',
				'ruins-core': '遺跡の中心'
			}
		},
		rewards: {
			xp: '{{xp}}XP',
			coins: '{{coins}}コイン',
			oneItem: '{{count}}個',
			itemCount: '{{count}}個',
			separator: ' / '
		}
	}
} satisfies DeepPartial<EnglishMessages>;
