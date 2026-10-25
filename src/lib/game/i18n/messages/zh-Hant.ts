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
		system: '系統',
		systemTitle: '顯示與文字',
		systemLanguageHint: '介面與對話',
		railDisplay: '顯示',
		railAudio: '音效',
		railInput: '輸入',
		textSpeed: '文字速度',
		textSpeedHint: '對話顯示速度',
		speedSlow: '慢速',
		speedNormal: '普通',
		speedInstant: '即時',
		hudDensity: 'HUD 資訊量',
		hudDensityHint: '畫面顯示的資訊量',
		densityQuiet: '簡潔',
		densityFull: '完整',
		densityFullUnavailable: '完整資訊量尚未開放。',
		motion: '動態效果',
		motionHint: '光效、掃過與脈動',
		motionOn: '開啟',
		motionReduced: '減少',
		prompts: '操作提示',
		promptsHint: '要顯示的按鍵圖示類型',
		promptAuto: '自動',
		promptPad: '手把',
		promptKeys: '鍵盤',
		sound: '音效',
		soundHint: '效果音與環境音',
		soundOn: '開啟',
		soundOff: '關閉',
		quests: '任務',
		map: '地圖',
		areaMap: '區域地圖',
		areaMapDialog: '{{areaName}}地圖',
		regionSubline: '翠綠地區 / 第 3 日',
		unexplored: '未探索',
		currentPosition: '目前位置',
		areaMapSelectedMarker: '已選擇：{{name}}',
		heroName: 'Grik',
		goldSuffix: 'G',
		activeQuest: '進行中任務',
		shop: '商店',
		inventory: '背包',
		saveGame: '儲存遊戲',
		useHeal: '使用治療',
		fieldCmds: {
			bag: '背包',
			gear: '裝備',
			quest: '任務',
			map: '地圖',
			skill: '技能',
			rest: '回復',
			save: '儲存',
			system: '系統'
		},
		titleChapterPill: '翠綠之地・第一章',
		chapterLabel: '第一章',
		titleNewRun: '新的旅程',
		titleNewRunSub: '第一章',
		titleSystemSub: '語言・音訊',
		titleNoSaveData: '沒有儲存資料',
		titleHintSelect: '選擇',
		titleHintEnter: '確認',
		titleNewRunConfirm: '開始新的旅程？自動儲存將被覆寫。',
		saveScreen: '儲存',
		loadScreen: '讀取',
		waystone: '路石',
		slotAutosave: '自動儲存',
		slotManual: '手動',
		slotEmpty: '無記錄',
		saveHere: '儲存於此',
		overwriteTitle: '要覆寫這個存檔嗎？',
		confirmOverwrite: '覆寫',
		today: '今天',
		yesterday: '昨天',
		battleSummary: '戰鬥結算',
		battleVictory: '勝利',
		battleDefeat: '敗北',
		battleHud: '戰鬥',
		battleTurn: '回合',
		battleAuto: '自動',
		battleTargeted: '目標',
		battleWaiting: '待機',
		battleFeed: '戰鬥記錄',
		battleFeedHit: '{{name}} −{{amount}}',
		battleFeedHurt: '{{name}} 受到−{{amount}}',
		battleFeedHeal: '+{{amount}} {{name}}',
		battleFeedDefeat: '擊敗{{name}}',
		battleHeal: '回復',
		battleItem: '道具',
		battleFlee: '逃跑',
		battleOneCharge: '回復1次',
		battleCharges: '回復{{count}}次',
		battleItemsInBag: '背包有{{count}}個',
		battleStatXp: 'XP',
		battleStatCoins: '金幣',
		battleStatDrop: '掉落',
		battleStatFoes: '敵人',
		enemiesDefeated: '擊敗敵人：{{count}}',
		xpGained: '獲得 XP：{{xp}}',
		coinsGained: '獲得金幣：{{coins}}',
		levelUp: '升級',
		noDrops: '沒有道具掉落',
		continue: '繼續',
		questProgressUpdate: '{{progressLabel}}：{{currentProgress}}/{{target}}',
		defeatReturnedToVillage: '沒有獲得獎勵。已返回神社。',
		close: '關閉',
		next: '下一步',
		mainQuest: '主線任務',
		fieldPack: '野外包',
		bagCategories: {
			potions: '藥水',
			gear: '裝備',
			key: '鑰匙',
			loot: '戰利品'
		},
		bagWorn: '已裝備',
		bagUseItem: '飲用',
		bagEquipItem: '裝備',
		bagSelectHint: '選擇物品以查看詳情。',
		bagPaperDollAlt: '格里克全身立繪',
		equipped: '已裝備',
		empty: '空',
		key: '鍵',
		remove: '移除',
		fieldJournal: '野外手冊',
		questLog: '任務日誌',
		main: '主線',
		questDone: '已完成',
		questRewards: '獎勵',
		questTurnedInBy: '回報對象',
		questChapterProgress: '章節進度',
		questMapContext: '地圖資訊',
		questJournalEmpty: '日誌中尚無任務。',
		rewardCoins: '金幣',
		rewardItem: '道具',
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
		questTracker: '任務追蹤',
		playerStatus: '玩家狀態',
		merchant: '商人',
		loadGameShellError: '無法啟動遊戲外殼。',
		levelAbbrev: 'LV',
		level: '等級 {{level}}',
		hp: 'HP',
		maxHp: '最大HP',
		xp: 'XP',
		attack: 'ATK',
		defense: 'DEF',
		heals: '治療',
		accept: '接受',
		back: '返回',
		noSkillsYet: '尚未學會任何技能',
		quantity: 'x{{quantity}}',
		statModifier: '{{stat}} +{{value}}',
		shopBuyMeta: '{{price}} 金幣 / {{stock}}',
		shopDimmedHint: '暗色＝金額不足',
		shopPurse: '錢包',
		shopPurseAfter: '購買後錢包',
		shopNotEnough: '金額不足',
		soldOut: '已售罄',
		shopReplaces: '取代{{slot}} · {{current}}',
		shopEmptySlot: '空位',
		shopOwned: '持有 x{{quantity}}',
		shopSelectHint: '選擇商品即可查看詳情。',
		shopBustAlt: '{{merchant}}的商家立繪',
		dialogueBustAlt: '{{npc}}的對話立繪',
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
		itemCannotBeEquipped: '物品無法裝備',
		equippedItem: '已裝備物品',
		unequippedItem: '已卸下物品',
		noShopNearby: '附近沒有商店',
		shopOpened: '商店已開啟',
		shopClosed: '商店已關閉',
		boughtItem: '已購買 {{itemName}}',
		soldItem: '已出售 {{itemName}}',
		questComplete: '任務完成：{{questTitle}}',
		questStarted: '新任務：{{questTitle}}',
		notEnoughCoins: '金幣不足',
		itemOutOfStock: '物品缺貨',
		itemCannotBeBought: '此物品無法購買',
		equippedItemCannotBeSold: '已裝備物品無法出售',
		itemNotOwned: '未持有此物品',
		itemCannotBeSold: '此物品無法出售',
		noDialogueOpen: '沒有開啟對話',
		noOneNearby: '附近沒有任何人',
		dialogueClosed: '對話已關閉',
		dialogueUpdated: '對話已更新',
		saved: '已存檔',
		savedWithoutThumbnail: '已存檔（無預覽圖）',
		saveFailed: '無法存檔',
		saveResumed: '已讀取存檔',
		enteredArea: '已進入區域',
		newRun: '新旅程',
		shopOutOfReach: '商店距離過遠',
		bossEnraged: '首領暴怒',
		heroDown: '角色倒下',
		enemyStruckFirst: '敵人先手',
		foundItem: '發現 {{itemName}}',
		npcNearby: '{{npcName}} 在附近'
	},
	content: {
		enemies: {
			'forest-wolf': {
				name: '林狼'
			},
			'thornback-boar': {
				name: '棘背野豬'
			},
			'mist-toad': {
				name: '霧沼蟾蜍'
			},
			'boar-king': {
				name: '野豬王'
			},
			'human-soldier': {
				name: '人類士兵'
			},
			'sun-crest-captain': {
				name: '日徽隊長'
			},
			'tunnel-crawler': {
				name: '隧道生物'
			}
		},
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
			},
			'practice-spear': {
				name: '練習用短矛',
				description: '第一次狩獵用的輕短矛。'
			},
			'hunters-knife': {
				name: '獵刀',
				description: '波拉克送給晴滴新獵人的禮物。'
			},
			'ancestral-amulet': {
				name: '祖傳護符',
				description: '從古時候傳下來的，保佑你。'
			},
			moonmoss: {
				name: '月光苔',
				description: '霧沼深處的淡色苔蘚，冬季存糧用。'
			},
			'sun-stamped-arrow': {
				name: '太陽印記的箭',
				description: '折斷的鐵箭，箭羽上有太陽印記。哥布林不會做這種箭。'
			}
		},
		shops: {
			'miras-item-shop': {
				name: '米拉的採藥小屋',
				merchantName: '米拉',
				description: '狩獵用的藥草和藥品。'
			},
			'guild-quartermaster': {
				name: '會所倉庫',
				merchantName: '會所倉管',
				description: '會所倉庫裡的狩獵裝備。'
			},
			'sundrop-forge': {
				name: '晴滴鐵匠鋪',
				merchantName: '歐倫',
				description: '晴滴打造的骨鐵裝備。'
			}
		},
		quests: {
			'prologue-proving-morning': {
				title: '試煉之晨',
				description: '今天是格里克的試煉狩獵。領齊裝備，到狩獵會所報到。',
				objectives: {
					'talk-to-mott': {
						description: '和爐火邊的老莫特說話。',
						progressLabel: '已和老莫特說話'
					},
					'collect-practice-spear': {
						description: '到鐵匠鋪向歐倫領短矛。',
						progressLabel: '已領短矛'
					},
					'collect-herb-pouch': {
						description: '到採藥小屋向米拉領藥草袋。',
						progressLabel: '已領藥草袋'
					},
					'report-to-borak': {
						description: '到狩獵會所向波拉克報到。',
						progressLabel: '已向波拉克報到'
					}
				}
			},
			'prologue-trial-tracks': {
				title: '第一試：足跡',
				description: '讀懂土地。和莉拉一起在野林追蹤野豬。',
				objectives: {
					'meet-lirra-forest': {
						description: '到野林入口與莉拉會合。',
						progressLabel: '已與莉拉會合'
					},
					'read-boar-signs': {
						description: '調查野豬留下的痕跡。',
						progressLabel: '已調查痕跡'
					},
					'defeat-thornback-boar': {
						description: '擊倒棘背野豬。',
						progressLabel: '已擊倒棘背野豬'
					},
					'report-first-trial': {
						description: '到狩獵會所向波拉克報到。',
						progressLabel: '已向波拉克報到'
					}
				}
			},
			'prologue-trial-mistfen': {
				title: '第二試：霧沼',
				description: '餵養村子。為米拉的冬季存糧到霧沼深處採月光苔。',
				objectives: {
					'ask-mira-about-stores': {
						description: '和米拉談冬季存糧。',
						progressLabel: '已和米拉談過'
					},
					'meet-lirra-mistfen': {
						description: '在霧沼橋與莉拉會合。',
						progressLabel: '已與莉拉會合'
					},
					'gather-moonmoss': {
						description: '採集月光苔。',
						progressLabel: '已採集月光苔'
					},
					'rest-at-the-pond': {
						description: '在沼中水塘休息。',
						progressLabel: '已在水塘休息'
					},
					'deliver-moonmoss': {
						description: '把月光苔交給米拉。',
						progressLabel: '已交給米拉'
					}
				}
			},
			'prologue-trial-boar-king': {
				title: '第三試：野豬王',
				description: '面對野獸之王。和德洛格一起到銀松林獵殺野豬王。',
				objectives: {
					'meet-drogg-crossroads': {
						description: '在十字路道標與德洛格會合。',
						progressLabel: '已與德洛格會合'
					},
					'track-the-boar-king': {
						description: '找到野豬王往銀松林的足跡。',
						progressLabel: '已找到足跡'
					},
					'talk-to-drogg-falls': {
						description: '在銀松瀑布與德洛格談話。',
						progressLabel: '已和德洛格談話'
					},
					'defeat-boar-king': {
						description: '在銀松林高台擊倒野豬王。',
						progressLabel: '已擊倒野豬王'
					}
				}
			},
			'prologue-hunters-name': {
				title: '獵人之名',
				description: '格里克通過了三試。今晚，晴滴為他慶祝。',
				objectives: {
					'report-boar-king': {
						description: '到狩獵會所向波拉克報到。',
						progressLabel: '已向波拉克報到'
					},
					'share-the-dinner': {
						description: '回家吃晚餐，和餐桌旁的家人說話。',
						progressLabel: '已和家人說話'
					},
					'hear-motts-tale': {
						description: '聽老莫特說故事。',
						progressLabel: '已聽完故事'
					},
					'walk-lirra-home': {
						description: '送莉拉回採藥小屋。',
						progressLabel: '已送莉拉回家'
					},
					'go-to-sleep': {
						description: '回家睡覺。',
						progressLabel: '已入睡'
					}
				}
			},
			'prologue-raid': {
				title: '烈火之晨',
				description: '晴滴燒起來了。找到你的家人。',
				objectives: {
					'heed-mott': {
						description: '和老莫特說話。',
						progressLabel: '已和老莫特說話'
					},
					'repel-the-soldiers': {
						description: '擊退闖進村子的士兵。',
						progressLabel: '已擊退士兵'
					},
					'reach-the-gate': {
						description: '趕到村門找父親。',
						progressLabel: '已趕到村門'
					},
					'find-drogg': {
						description: '在晴滴之井找到德洛格。',
						progressLabel: '已找到德洛格'
					},
					'charge-the-captain': {
						description: '衝進廣場。',
						progressLabel: '已衝進廣場'
					}
				}
			},
			'prologue-escape': {
				title: '古老隧道',
				description: '從神社底下的隧道逃走。活下去。',
				objectives: {
					'wake-in-the-shrine': {
						description: '在神社和老莫特說話。',
						progressLabel: '已和老莫特說話'
					},
					'climb-to-the-ridge': {
						description: '走出隧道，登上洞口的山脊。',
						progressLabel: '已登上山脊'
					}
				}
			}
		},
		dialogue: {
			actions: {
				shop: '商店',
				close: '關閉'
			},
			speakers: {
				traveler: '旅人'
			},
			system: {
				noDialogueAvailable: '目前沒有可用對話。',
				optionNotAvailable: '該選項目前不可用。',
				noDialogueOpen: '目前沒有開啟對話。',
				noOneNearby: '附近沒有人。',
				shopOutOfReach: '商店距離過遠。'
			}
		},
		maps: {
			landmarks: {
				'hero-house-exterior': { label: '格里克的家' },
				'guild-hall-exterior': { label: '狩獵會所' },
				'item-shop-exterior': { label: '採藥小屋' },
				'villager-house-1-exterior': { label: '村民住家' },
				'villager-house-2-exterior': { label: '村民住家' },
				'villager-house-3-exterior': { label: '村民住家' },
				'sundrop-well': { label: '晴滴之井' },
				'whispering-cave': { label: '低語洞穴' },
				blacksmith: { label: '鐵匠鋪' },
				'shrine-of-aurora': { label: '極光神社' },
				'witchwood-gate': { label: '魔女森之門' },
				'silver-shrine-gate': { label: '白銀神殿之門' },
				'ferry-crossing': { label: '渡口' },
				'castle-gate': { label: '封印城門' },
				'crossroads-waystone': { label: '十字路道標' }
			},
			discoveries: {
				'crossroads-waystone-sign': {
					label: '磨損的道標',
					description: '刻鑿的箭頭向四方延伸——北往神社、南往海岸、西往沼澤、東往洞穴。'
				},
				'castle-gate-warning': {
					label: '城門告示',
					description: '王道已依詔封閉。節慶結束前，無人得越過白線。'
				},
				'ferry-shrine-lore': {
					label: '渡口神龕',
					description: '黃昏時敲鐘，渡夫便會應答——只要潮汐與戰事允許。'
				},
				'coast-jetty-foreshadow': {
					label: '棧橋盡頭',
					description: '木板在開闊水面前終止。此處尚無船隻等候。'
				},
				'witchwood-poison-warning': {
					label: '魔女森標石',
					description: '過了門要淺呼吸。此處的花朵滲出毒霧。'
				},
				'silverpine-amulet-foreshadow': {
					label: '護符架',
					description: '朝聖者懸掛護符，締結一個比神社更古老的盟約。'
				},
				'wildwood-cave-danger': {
					label: '洞穴警告',
					description: '樹皮上有爪痕。棲息於低語洞穴中的某物並未沉眠。'
				},
				'boar-sign-hoofprints': { label: '蹄印' },
				'boar-sign-sapling': { label: '斷掉的樹苗' },
				'boar-sign-tusk-scrape': { label: '獠牙刮痕' },
				'mistfen-pond-rest': { label: '沼中水塘' },
				'boar-king-trail': { label: '巨大的足跡' },
				'ridge-overlook': { label: '山脊' },
				'grik-bed': { label: '格里克的床' },
				'threshold-relief': {
					label: '牆上的浮雕',
					description: '哥布林、獸人、精靈與魔族同坐一張長桌，刻下它們的手認得每一個族群。'
				},
				'core-relief': {
					label: '磨損的浮雕',
					description: '一個哥布林和一個魔族共同舉著一支火把。周圍的石頭有燒焦的痕跡。'
				}
			},
			npcs: {
				borak: { name: '波拉克' },
				'lodge-keeper': { name: '會所倉管' },
				mira: { name: '米拉' },
				oren: { name: '歐倫' },
				mott: { name: '老莫特' },
				tikka: { name: '蒂卡' },
				drogg: { name: '德洛格' },
				lirra: { name: '莉拉' },
				'villager-lynn': { name: '琳恩' },
				'villager-toma': { name: '托馬' },
				'villager-io': { name: '伊歐' }
			},
			areas: {
				'meadow-entry': '晴滴草原',
				'hero-house': '格里克的家',
				'guild-hall': '狩獵會所',
				'item-shop': '採藥小屋',
				'blacksmith-interior': '晴滴鍛造坊',
				'villager-house-1': '村民家',
				'villager-house-2': '村民家',
				'villager-house-3': '村民家',
				'shrine-of-aurora-interior': '極光神社',
				'ruins-threshold': '古老隧道',
				'ruins-core': '古老隧道深處'
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
