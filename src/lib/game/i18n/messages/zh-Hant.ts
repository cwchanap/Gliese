import type { EnglishMessages } from '$lib/game/i18n/messages/en';
import type { DeepPartial } from '$lib/game/i18n/messages/types';

export const zhHant = {
	ui: {
		menu: '選單',
		systemMenu: '系統選單',
		command: '指令',
		fieldStatus: '場地狀態',
		settings: '設定',
		language: '語言',
		quests: '任務',
		map: '地圖',
		areaMap: '區域地圖',
		areaMapDialog: '{{areaName}}地圖',
		regionSubline: '翠綠地區 / 第 3 日',
		unexplored: '未探索',
		currentPosition: '目前位置',
		heroName: 'LIAM',
		goldSuffix: 'G',
		activeQuest: '進行中任務',
		shop: '商店',
		inventory: '背包',
		resumeSave: '繼續存檔',
		saveGame: '儲存遊戲',
		useHeal: '使用治療',
		battleSummary: '戰鬥結算',
		battleVictory: '勝利',
		battleDefeat: '敗北',
		enemiesDefeated: '擊敗敵人：{{count}}',
		xpGained: '獲得 XP：{{xp}}',
		coinsGained: '獲得金幣：{{coins}}',
		levelUp: '升級',
		noDrops: '沒有道具掉落',
		continue: '繼續',
		defeatReturnedToVillage: '沒有獲得獎勵。已返回村莊。',
		close: '關閉',
		next: '下一步',
		mainQuest: '主線任務',
		sideActive: '{{count}} 個支線進行中',
		fieldPack: '野外包',
		consumables: '消耗品',
		equipment: '裝備',
		keyItems: '關鍵道具',
		stats: '能力值',
		equipped: '已裝備',
		empty: '空',
		key: '鍵',
		keyItem: '關鍵道具',
		remove: '移除',
		fieldJournal: '野外手冊',
		questLog: '任務日誌',
		main: '主線',
		side: '支線',
		availableFromGuildMaster: '可向公會會長取得',
		noSideQuestsActive: '目前沒有進行中的支線任務。',
		coins: '金幣：{{coins}}',
		buy: '購買',
		sell: '出售',
		noStockAvailable: '目前沒有庫存。',
		noSellableItems: '沒有可出售的物品。',
		buyFor: '用{{meta}}購買',
		sellFor: '以{{meta}}出售',
		unlimited: '無限',
		stockLeft: '剩餘{{count}}個',
		emptyInventorySlot: '背包欄位 {{index}} 為空',
		shopSections: '商店欄位',
		inventorySections: '背包欄位',
		questTracker: '任務追蹤',
		playerStatus: '玩家狀態',
		merchant: '商人',
		loadGameShellError: '無法啟動遊戲外殼。',
		levelAbbrev: 'LV',
		level: '等級 {{level}}',
		hp: 'HP',
		xp: 'XP',
		attack: 'ATK',
		defense: 'DEF',
		heals: '治療',
		accept: '接受',
		back: '返回',
		reward: '獎勵：{{rewardSummary}}',
		quantity: 'x{{quantity}}',
		keyQuantity: '關鍵道具 x{{quantity}}',
		statModifier: '{{stat}} +{{value}}',
		inventoryMetaWithModifiers: '{{slot}} / {{modifiers}}',
		shopBuyMeta: '{{price}} 金幣 / {{stock}}',
		shopSellMeta: '{{price}} 金幣',
		shopSellMetaWithQuantity: '{{price}} 金幣 / x{{quantity}}',
		priceBadge: '{{price}}c',
		inventorySlotsLabel: '{{section}} 背包欄位',
		equipmentSlots: {
			weapon: '武器',
			head: '頭部',
			body: '身體',
			hands: '雙手',
			accessory: '飾品'
		},
		itemKinds: {
			consumable: '消耗品',
			equipment: '裝備'
		}
	},
	status: {
		loadingGame: '遊戲載入中',
		battleStarted: '戰鬥開始',
		battleActive: '戰鬥進行中',
		battleVictory: '戰鬥勝利',
		battleDefeat: '戰鬥敗北',
		battleReturned: '已從戰鬥返回',
		battleLocked: '戰鬥中無法執行',
		noHealCharges: '治療次數已用盡',
		itemCannotBeUsed: '此道具無法使用',
		hpAlreadyFull: 'HP 已滿',
		recoveredHp: '生命值回復',
		strikeLanded: '命中',
		enemyDefeated: '敵人擊敗',
		victoryRuinsCleared: '勝利：廢墟已清除',
		itemCannotBeEquipped: '物品無法裝備',
		equippedItem: '已裝備物品',
		unequippedItem: '已卸下物品',
		noShopNearby: '附近沒有商店',
		shopOpened: '商店已開啟',
		shopClosed: '商店已關閉',
		boughtItem: '已購買 {{itemName}}',
		soldItem: '已出售 {{itemName}}',
		noGuildQuestAvailable: '目前沒有公會任務可接',
		questAccepted: '任務已接受',
		questComplete: '任務完成：{{questTitle}}',
		questAlreadyActive: '任務已在進行中',
		questAlreadyComplete: '任務已完成',
		questNotAvailable: '任務不可用',
		questCannotBeAccepted: '無法接受任務',
		notEnoughCoins: '金幣不足',
		itemOutOfStock: '物品缺貨',
		itemCannotBeBought: '此物品無法購買',
		equippedItemCannotBeSold: '已裝備物品無法出售',
		itemNotOwned: '未持有此物品',
		itemCannotBeSold: '此物品無法出售',
		noDialogueOpen: '沒有開啟對話',
		noOneNearby: '附近沒有任何人',
		ruinsRouteUnlocked: '廢墟路線已解鎖',
		dialogueClosed: '對話已關閉',
		dialogueUpdated: '對話已更新',
		noSaveFound: '找不到存檔',
		saved: '已存檔',
		saveResumed: '已讀取存檔',
		enteredArea: '已進入區域',
		invalidSaveReset: '無效存檔已重置',
		newRun: '新旅程',
		reportToGuildMasterFirst: '請先向公會會長報告',
		shopOutOfReach: '商店距離過遠',
		bossEnraged: '首領暴怒',
		heroDown: '角色倒下',
		enemyStruckFirst: '敵人先手',
		foundItem: '發現 {{itemName}}',
		npcNearby: '{{npcName}} 在附近'
	},
	content: {
		items: {
			'field-potion': {
				name: '野外藥水',
				description: '恢復 8 點 HP。'
			},
			'greater-field-potion': {
				name: '強效野外藥水',
				description: '恢復 14 點 HP。'
			},
			'ember-tonic': {
				name: '餘燼靈藥',
				description: '恢復 5 點 HP。'
			},
			'ruin-draught': {
				name: '廢墟藥液',
				description: '恢復 10 點 HP。'
			},
			'sunleaf-salve': {
				name: '日葉藥膏',
				description: '恢復 6 點 HP。'
			},
			'training-sword': {
				name: '訓練劍',
				description: '可靠的新手劍。'
			},
			'ruin-blade': {
				name: '廢墟之刃',
				description: '帶著舊日餘溫的缺口長劍。'
			},
			'iron-cap': {
				name: '鐵盔',
				description: '為危險廢墟準備的簡單防護。'
			},
			'warden-crown': {
				name: '看守者王冠',
				description: '來自廢墟核心的破裂頭盔。'
			},
			'traveler-vest': {
				name: '旅人背心',
				description: '適合長途跋涉的輕甲。'
			},
			'stone-mail': {
				name: '石鎧',
				description: '以廢墟石材雕成的厚重板甲。'
			},
			'grip-wraps': {
				name: '握柄纏布',
				description: '能讓每一擊更穩的布纏。'
			},
			'meadow-charm': {
				name: '草地護符',
				description: '來自草地小徑的護符。'
			},
			'meadow-token': {
				name: '草地信物',
				description: '來自入口草地的紀念品。'
			},
			'threshold-rune': {
				name: '入口符文',
				description: '刻在廢墟入口的標記。'
			},
			'warden-sigil': {
				name: '看守者印記',
				description: '證明廢墟看守者已倒下。'
			}
		},
		shops: {
			'miras-item-shop': {
				name: '米拉的道具店',
				merchantName: '米拉',
				description: '供東方道路使用的可靠野外補給。'
			},
			'guild-quartermaster': {
				name: '公會補給官',
				merchantName: '補給官維爾',
				description: '供新進廢墟委託使用的公會認證裝備。'
			}
		},
		quests: {
			'investigate-the-ruins': {
				title: '調查廢墟',
				description: '先向公會會長報告，再擊敗廢墟看守者。',
				objectives: {
					'talk-to-guild-master': {
						description: '在公會大廳與公會會長交談。',
						progressLabel: '已與公會會長交談'
					},
					'defeat-ruins-warden': {
						description: '在廢墟核心擊敗看守者。',
						progressLabel: '已擊敗廢墟看守者'
					}
				}
			},
			'thin-village-slimes': {
				title: '清剿村路史萊姆',
				description: '清除聚集在村道上的史萊姆。',
				objectives: {
					'defeat-village-slimes': {
						description: '擊敗村莊附近的史萊姆。',
						progressLabel: '已擊敗村路史萊姆'
					}
				}
			},
			'thin-ruins-slimes': {
				title: '清剿廢墟史萊姆',
				description: '減少廢墟入口內的史萊姆數量。',
				objectives: {
					'defeat-ruins-slimes': {
						description: '擊敗廢墟中的史萊姆。',
						progressLabel: '已擊敗廢墟史萊姆'
					}
				}
			},
			'recover-ruins-relics': {
				title: '回收廢墟遺物',
				description: '把舊廢墟裡有用的道具帶回來。',
				objectives: {
					'collect-ruins-items': {
						description: '收集入口與核心中的廢墟道具。',
						progressLabel: '已回收廢墟道具'
					}
				}
			}
		},
		dialogue: {
			'guild-master': {
				speaker: '公會會長阿倫',
				lines: {
					mainQuestNeedsGuildBriefing1: '你來得正好。東方廢墟又有動靜，村道已經不安全了。',
					mainQuestNeedsGuildBriefing2: '走森林小徑，前往舊核心，在它驚動更多東西前擊敗看守者。',
					hasActiveSideQuest1: '公會公告板上的任務任你挑，但別忘了看守者。',
					hasActiveSideQuest2: '進度記在你的手冊裡回報。我會把新的委託留在櫃檯這裡。',
					hasCompletedQuest: '幹得好。當獵手清出道路，村子都看得見。',
					guildBriefingComplete: '廢墟路線已開。進入核心前，先把心神穩住。',
					always: '公會一直看守著舊路。直說，然後選你的委託。'
				}
			},
			'guild-quartermaster': {
				speaker: '補給官維爾',
				lines: {
					guildBriefingComplete: '如果你要去廢墟，就先買些能撐住的裝備。',
					always: '進廢墟前還缺野外裝備嗎？公會存貨不多，但都很耐用。'
				}
			},
			'shopkeeper-mira': {
				speaker: '米拉',
				lines: {
					guildBriefingComplete: '從公會回來了？森林小徑可不好走，先帶幾瓶靈藥吧。',
					always: '新鮮靈藥都在架上。公會今天已經把你的野外補給備好了。'
				}
			},
			actions: {
				talk: '對話',
				quest: '任務',
				shop: '商店',
				accept: '接受',
				back: '返回',
				close: '關閉'
			},
			speakers: {
				traveler: '旅人',
				guildNotice: '公會公告'
			},
			system: {
				noDialogueAvailable: '目前沒有可用對話。',
				optionNotAvailable: '該選項目前不可用。',
				chooseGuildWork: '選擇你要查看的公會委託。',
				noNewGuildWork: '目前沒有新的公會委託。',
				guildWorkUnavailable: '該公會委託已不再可用。',
				noDialogueOpen: '目前沒有開啟對話。',
				noOneNearby: '附近沒有人。',
				noGuildQuestAvailableHere: '這裡沒有可接的公會任務。',
				shopOutOfReach: '商店距離過遠。',
				questDetailNotice: '{{questTitle}}：{{objectiveDescription}} 獎勵：{{rewardSummary}}。',
				questCompleteNotice: '任務完成：{{questTitle}}。獎勵：{{rewardSummary}}。'
			}
		},
		maps: {
			landmarks: {
				'hero-house-exterior': { label: '英雄之家' },
				'guild-hall-exterior': { label: '公會' },
				'item-shop-exterior': { label: '道具店' },
				'villager-house-1-exterior': { label: '村民住家' },
				'villager-house-2-exterior': { label: '村民住家' },
				'villager-house-3-exterior': { label: '村民住家' },
				'sundrop-well': { label: '晴滴之井' },
				'whispering-cave': { label: '低語洞穴' },
				blacksmith: { label: '鐵匠鋪' },
				'shrine-of-aurora': { label: '極光神社' }
			},
			npcs: {
				'guild-master': { name: '公會會長阿倫' },
				'guild-quartermaster': { name: '補給官維爾' },
				'shopkeeper-mira': { name: '米拉' }
			},
			areas: {
				'meadow-entry': '晴滴草原',
				'hero-house': '英雄之家',
				'guild-hall': '公會大廳',
				'item-shop': '道具店',
				'villager-house-1': '村民家',
				'villager-house-2': '村民家',
				'villager-house-3': '村民家',
				'ruins-threshold': '廢墟入口',
				'ruins-core': '廢墟核心'
			}
		},
		rewards: {
			xp: '{{xp}} 經驗值',
			coins: '{{coins}} 金幣',
			oneItem: '{{count}} 件物品',
			itemCount: '{{count}} 件物品',
			separator: ' / '
		}
	}
} satisfies DeepPartial<EnglishMessages>;
