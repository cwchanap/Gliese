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
		system: 'システム',
		systemTitle: '表示とテキスト',
		systemLanguageHint: 'インターフェースと会話',
		railDisplay: '表示',
		railAudio: '音声',
		railInput: '入力',
		textSpeed: 'テキスト速度',
		textSpeedHint: '会話の表示速度',
		speedSlow: 'ゆっくり',
		speedNormal: 'ふつう',
		speedInstant: '即時',
		hudDensity: 'HUD表示量',
		hudDensityHint: 'フィールドの表示範囲',
		densityQuiet: '簡素',
		densityFull: '詳細',
		densityFullUnavailable: '詳細表示はまだ利用できません。',
		motion: 'モーション',
		motionHint: '光の演出やアニメーション',
		motionOn: 'オン',
		motionReduced: '控えめ',
		prompts: '操作表示',
		promptsHint: '表示するボタンの種類',
		promptAuto: '自動',
		promptPad: 'パッド',
		promptKeys: 'キーボード',
		sound: 'サウンド',
		soundHint: '効果音と環境音',
		soundOn: 'オン',
		soundOff: 'オフ',
		quests: '依頼',
		map: '地図',
		areaMap: 'エリア地図',
		areaMapDialog: '{{areaName}}の地図',
		regionSubline: '緑の地方 / 3日目',
		unexplored: '未探索',
		currentPosition: '現在位置',
		areaMapSelectedMarker: '選択中: {{name}}',
		heroName: 'Grik',
		goldSuffix: 'G',
		activeQuest: '進行中の依頼',
		shop: '店',
		inventory: '持ち物',
		saveGame: 'セーブ',
		useHeal: '回復を使う',
		fieldCmds: {
			bag: 'バッグ',
			gear: '装備',
			quest: '依頼',
			map: '地図',
			skill: 'スキル',
			rest: '回復',
			save: 'セーブ',
			system: 'システム'
		},
		titleChapterPill: '翠緑地方・第一章',
		chapterLabel: '第一章',
		titleNewRun: 'ニューゲーム',
		titleNewRunSub: '第一章',
		titleSystemSub: '言語・オーディオ',
		titleNoSaveData: 'セーブデータなし',
		titleHintSelect: '決定',
		titleHintEnter: '進む',
		titleNewRunConfirm: '新しい冒険をはじめますか？オートセーブは上書きされます。',
		saveScreen: 'セーブ',
		loadScreen: 'ロード',
		waystone: 'ウェイストーン',
		slotAutosave: 'オートセーブ',
		slotManual: '手動',
		slotEmpty: '記録なし',
		saveHere: 'ここに保存',
		overwriteTitle: 'このセーブを上書きしますか？',
		confirmOverwrite: '上書きする',
		today: '今日',
		yesterday: '昨日',
		battleSummary: 'バトル結果',
		battleVictory: '勝利',
		battleDefeat: '敗北',
		battleHud: 'バトル',
		battleTurn: 'ターン',
		battleAuto: 'オート',
		battleTargeted: 'ターゲット',
		battleWaiting: '待機',
		battleFeed: 'バトルログ',
		battleFeedHit: '{{name}} に−{{amount}}',
		battleFeedHurt: '{{name}} が−{{amount}}',
		battleFeedHeal: '+{{amount}} {{name}}',
		battleFeedDefeat: '{{name}} を倒した',
		battleHeal: '回復',
		battleItem: '道具',
		battleFlee: 'にげる',
		battleOneCharge: '回復1回',
		battleCharges: '回復{{count}}回',
		battleItemsInBag: 'バッグに{{count}}個',
		battleStatXp: 'XP',
		battleStatCoins: 'コイン',
		battleStatDrop: 'ドロップ',
		battleStatFoes: '敵',
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
		fieldPack: '携行品',
		bagCategories: {
			potions: 'ポーション',
			gear: '装備',
			key: '鍵',
			loot: '戦利品'
		},
		bagWorn: '装備中',
		bagUseItem: '飲む',
		bagEquipItem: '装備',
		bagSelectHint: 'アイテムを選択して確認。',
		bagPaperDollAlt: 'グリクの全身',
		equipped: '装備中',
		empty: '空',
		key: 'キー',
		remove: '外す',
		fieldJournal: 'フィールド手帳',
		questLog: '依頼手帳',
		main: 'メイン',
		questDone: '完了',
		questRewards: '報酬',
		questTurnedInBy: '報告先',
		questChapterProgress: '章の進行状況',
		questMapContext: 'マップ情報',
		questJournalEmpty: 'まだ依頼はありません。',
		rewardCoins: 'コイン',
		rewardItem: 'アイテム',
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
		questTracker: '依頼トラッカー',
		playerStatus: 'プレイヤー状態',
		merchant: '商人',
		loadGameShellError: 'ゲームシェルを起動できませんでした。',
		levelAbbrev: 'LV',
		level: 'レベル{{level}}',
		hp: 'HP',
		maxHp: '最大HP',
		xp: 'XP',
		attack: 'ATK',
		defense: 'DEF',
		heals: '回復',
		accept: '受ける',
		back: '戻る',
		noSkillsYet: 'まだスキルを覚えていない',
		quantity: 'x{{quantity}}',
		statModifier: '{{stat}} +{{value}}',
		shopBuyMeta: '{{price}}コイン / {{stock}}',
		shopDimmedHint: '暗表示＝購入不可',
		shopPurse: '所持金',
		shopPurseAfter: '購入後の所持金',
		shopNotEnough: 'コインが足りない',
		soldOut: '売り切れ',
		shopReplaces: '{{slot}}を置き換え · {{current}}',
		shopEmptySlot: '空き',
		shopOwned: '所持 x{{quantity}}',
		shopSelectHint: '商品を選ぶと詳しく見られます。',
		shopBustAlt: '{{merchant}}の商人ポートレート',
		dialogueBustAlt: '{{npc}}の会話ポートレート',
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
		itemCannotBeEquipped: '装備できません',
		equippedItem: '装備した',
		unequippedItem: '外した',
		noShopNearby: '近くに店がありません',
		shopOpened: '店を開いた',
		shopClosed: '店を閉じた',
		boughtItem: '{{itemName}}を購入した',
		soldItem: '{{itemName}}を売却した',
		questComplete: '依頼達成: {{questTitle}}',
		questStarted: '新しい依頼: {{questTitle}}',
		notEnoughCoins: 'コインが足りません',
		itemOutOfStock: '在庫切れです',
		itemCannotBeBought: '購入できません',
		equippedItemCannotBeSold: '装備中のアイテムは売れません',
		itemNotOwned: '持っていません',
		itemCannotBeSold: '売れません',
		noDialogueOpen: '会話が開いていません',
		noOneNearby: '近くに誰もいません',
		dialogueClosed: '会話を閉じた',
		dialogueUpdated: '会話を更新した',
		saved: 'セーブした',
		savedWithoutThumbnail: 'プレビュー画像なしでセーブしました',
		saveFailed: 'セーブできませんでした',
		saveResumed: 'セーブを再開した',
		enteredArea: 'エリアに入った',
		newRun: '新しい冒険',
		shopOutOfReach: '店に届きません',
		bossEnraged: 'ボスが激怒',
		heroDown: '主人公が倒れた',
		enemyStruckFirst: '敵の先制攻撃',
		foundItem: '{{itemName}}を見つけた',
		npcNearby: '{{npcName}}が近くにいる'
	},
	content: {
		enemies: {
			'forest-wolf': {
				name: '森オオカミ'
			},
			'thornback-boar': {
				name: 'トゲセイノシシ'
			},
			'mist-toad': {
				name: '霧沼ガマ'
			},
			'boar-king': {
				name: 'イノシシ王'
			},
			'human-soldier': {
				name: '人間の兵士'
			},
			'sun-crest-captain': {
				name: '日章の隊長'
			},
			'tunnel-crawler': {
				name: 'トンネル這い'
			}
		},
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
			},
			'practice-spear': {
				name: '練習用の短槍',
				description: '初めての狩りのための軽い短槍。'
			},
			'hunters-knife': {
				name: '狩人のナイフ',
				description: 'サンドロップの新しい狩人へ、ボラクからの贈り物。'
			},
			'ancestral-amulet': {
				name: '祖先の護符',
				description: '古くから受け継がれてきた。身を守ってくれる。'
			},
			moonmoss: {
				name: '月光苔',
				description: '霧沼の奥に生える淡い苔。冬の蓄え用。'
			},
			'sun-stamped-arrow': {
				name: '太陽の刻印の矢',
				description: '矢羽に太陽の印がある折れた鉄の矢。ゴブリンの矢ではない。'
			}
		},
		shops: {
			'miras-item-shop': {
				name: 'ミラの薬草小屋',
				merchantName: 'ミラ',
				description: '狩りのための薬草と薬。'
			},
			'guild-quartermaster': {
				name: '集会所の倉庫',
				merchantName: '集会所の倉番',
				description: '集会所の倉庫にある狩りの装備。'
			},
			'sundrop-forge': {
				name: 'サンドロップ鍛冶場',
				merchantName: 'オレン',
				description: 'サンドロップで鍛えた骨鉄の装備。'
			}
		},
		quests: {
			'prologue-proving-morning': {
				title: '試練の朝',
				description: '今日はグリクの試練の狩り。装備を揃えて、狩人の集会所へ向かう。',
				objectives: {
					'talk-to-mott': {
						description: '炉端のモット爺と話す。',
						progressLabel: 'モット爺と話した'
					},
					'collect-practice-spear': {
						description: '鍛冶場でオレンから短槍を受け取る。',
						progressLabel: '短槍を受け取った'
					},
					'collect-herb-pouch': {
						description: '薬草小屋でミラから薬草袋を受け取る。',
						progressLabel: '薬草袋を受け取った'
					},
					'report-to-borak': {
						description: '集会所でボラクに報告する。',
						progressLabel: 'ボラクに報告した'
					}
				}
			},
			'prologue-trial-tracks': {
				title: '第一の試練：足跡',
				description: '大地を読む。リラと共に野林でイノシシを追う。',
				objectives: {
					'meet-lirra-forest': {
						description: '野林の入口でリラと合流する。',
						progressLabel: 'リラと合流した'
					},
					'read-boar-signs': {
						description: '野林でイノシシの痕跡を調べる。',
						progressLabel: '調べた痕跡'
					},
					'defeat-thornback-boar': {
						description: 'トゲセイノシシを仕留める。',
						progressLabel: 'トゲセイノシシを倒した'
					},
					'report-first-trial': {
						description: '集会所でボラクに報告する。',
						progressLabel: 'ボラクに報告した'
					}
				}
			},
			'prologue-trial-mistfen': {
				title: '第二の試練：霧沼',
				description: '村を養う。ミラの冬の蓄えのため、霧沼の奥で月光苔を集める。',
				objectives: {
					'ask-mira-about-stores': {
						description: 'ミラに冬の蓄えのことを聞く。',
						progressLabel: 'ミラと話した'
					},
					'meet-lirra-mistfen': {
						description: '霧沼の橋でリラと合流する。',
						progressLabel: 'リラと合流した'
					},
					'gather-moonmoss': {
						description: '霧沼で月光苔を集める。',
						progressLabel: '集めた月光苔'
					},
					'rest-at-the-pond': {
						description: '霧沼の奥の池で休む。',
						progressLabel: '池で休んだ'
					},
					'deliver-moonmoss': {
						description: '月光苔をミラに届ける。',
						progressLabel: '月光苔を届けた'
					}
				}
			},
			'prologue-trial-boar-king': {
				title: '第三の試練：イノシシ王',
				description: '獣の王に挑む。ドロッグと共に銀松林でイノシシ王を狩る。',
				objectives: {
					'meet-drogg-crossroads': {
						description: '辻の道標でドロッグと合流する。',
						progressLabel: 'ドロッグと合流した'
					},
					'track-the-boar-king': {
						description: '銀松林へ続くイノシシ王の足跡を探す。',
						progressLabel: '足跡を見つけた'
					},
					'talk-to-drogg-falls': {
						description: '銀松の滝でドロッグと話す。',
						progressLabel: 'ドロッグと話した'
					},
					'defeat-boar-king': {
						description: '銀松林の高台でイノシシ王を倒す。',
						progressLabel: 'イノシシ王を倒した'
					}
				}
			},
			'prologue-hunters-name': {
				title: '狩人の名',
				description: 'グリクは三つの試練を越えた。今夜、サンドロップは祝う。',
				objectives: {
					'report-boar-king': {
						description: '集会所でボラクに報告する。',
						progressLabel: 'ボラクに報告した'
					},
					'share-the-dinner': {
						description: '家に帰り、食卓の家族と話す。',
						progressLabel: '話した家族'
					},
					'hear-motts-tale': {
						description: 'モット爺の昔話を聞く。',
						progressLabel: '昔話を聞いた'
					},
					'walk-lirra-home': {
						description: 'リラを薬草小屋まで送る。',
						progressLabel: 'リラを送った'
					},
					'go-to-sleep': {
						description: '家に帰って眠る。',
						progressLabel: '眠った'
					}
				}
			},
			'prologue-raid': {
				title: '炎の朝',
				description: 'サンドロップが燃えている。家族を探せ。',
				objectives: {
					'heed-mott': {
						description: 'モット爺と話す。',
						progressLabel: 'モット爺と話した'
					},
					'repel-the-soldiers': {
						description: '村に入り込んだ兵士を撃退する。',
						progressLabel: '倒した兵士'
					},
					'reach-the-gate': {
						description: '村の門にいる父のもとへ急ぐ。',
						progressLabel: '門にたどり着いた'
					},
					'find-drogg': {
						description: 'サンドロップの井戸でドロッグを見つける。',
						progressLabel: 'ドロッグを見つけた'
					},
					'charge-the-captain': {
						description: '広場へ突入する。',
						progressLabel: '広場へ突入した'
					}
				}
			},
			'prologue-escape': {
				title: '古いトンネル',
				description: '社の下のトンネルから逃げる。生き延びろ。',
				objectives: {
					'wake-in-the-shrine': {
						description: '社でモット爺と話す。',
						progressLabel: 'モット爺と話した'
					},
					'climb-to-the-ridge': {
						description: 'トンネルを抜け、洞窟の上の尾根へ登る。',
						progressLabel: '尾根に着いた'
					}
				}
			}
		},
		dialogue: {
			actions: {
				shop: '店',
				close: '閉じる'
			},
			speakers: {
				traveler: '旅人'
			},
			system: {
				noDialogueAvailable: '会話はありません。',
				optionNotAvailable: 'その選択肢はありません。',
				noDialogueOpen: '会話は開いていません。',
				noOneNearby: '近くに誰もいません。',
				shopOutOfReach: '店に届きません。'
			}
		},
		maps: {
			landmarks: {
				'hero-house-exterior': { label: 'グリクの家' },
				'guild-hall-exterior': { label: '狩人の集会所' },
				'item-shop-exterior': { label: '薬草小屋' },
				'villager-house-1-exterior': { label: '民家' },
				'villager-house-2-exterior': { label: '民家' },
				'villager-house-3-exterior': { label: '民家' },
				'sundrop-well': { label: 'サンドロップの井戸' },
				'whispering-cave': { label: 'ささやきの洞窟' },
				blacksmith: { label: '鍛冶屋' },
				'shrine-of-aurora': { label: 'オーロラの社' },
				'witchwood-gate': { label: '魔女の森の門' },
				'silver-shrine-gate': { label: '白銀神殿の門' },
				'ferry-crossing': { label: '渡し場' },
				'castle-gate': { label: '封印された城門' },
				'crossroads-waystone': { label: '辻の道標' }
			},
			discoveries: {
				'crossroads-waystone-sign': {
					label: '古い道標',
					description: '刻まれた矢印が四方を指す——北に社、南に海岸、西に湿地、東に洞窟。'
				},
				'castle-gate-warning': {
					label: '城門の告示',
					description: '王道は勅命により封じられている。祭が終わるまで白線を越える者はいない。'
				},
				'ferry-shrine-lore': {
					label: '渡し場の祠',
					description: '夕暮れに鐘を鳴らせば渡し守が答える——潮と戦の許す限りにおいて。'
				},
				'coast-jetty-foreshadow': {
					label: '桟橋の突端',
					description: '板は開けた水面で途絶える。まだ舟は待っていない。'
				},
				'witchwood-poison-warning': {
					label: '魔女の森の標石',
					description: '門を過ぎたら浅く息をせよ。この花は毒の霧を流す。'
				},
				'silverpine-amulet-foreshadow': {
					label: '護符の棚',
					description: '巡礼者が護符を吊るし、社より古い誓いを結ぶ。'
				},
				'wildwood-cave-danger': {
					label: '洞窟への警告',
					description: '爪で引き裂かれた樹皮。ささやきの洞窟に棲む何かは眠っていない。'
				},
				'boar-sign-hoofprints': { label: '蹄の跡' },
				'boar-sign-sapling': { label: '折れた若木' },
				'boar-sign-tusk-scrape': { label: '牙の傷跡' },
				'mistfen-pond-rest': { label: '静かな池' },
				'boar-king-trail': { label: '巨大な足跡' },
				'ridge-overlook': { label: '尾根の見晴らし' },
				'grik-bed': { label: 'グリクのベッド' },
				'threshold-relief': {
					label: '壁の浮き彫り',
					description:
						'ゴブリン、オーク、エルフ、魔族が一つの長い食卓を囲む。皆を知る手が刻んだものだ。'
				},
				'core-relief': {
					label: 'すり減った浮き彫り',
					description: 'ゴブリンと魔族が一本の松明を共に掲げている。周りの石は焼け焦げている。'
				}
			},
			npcs: {
				borak: { name: 'ボラク' },
				'lodge-keeper': { name: '集会所の倉番' },
				mira: { name: 'ミラ' },
				oren: { name: 'オレン' },
				mott: { name: 'モット爺' },
				tikka: { name: 'ティカ' },
				drogg: { name: 'ドロッグ' },
				lirra: { name: 'リラ' },
				'villager-lynn': { name: 'リン' },
				'villager-toma': { name: 'トマ' },
				'villager-io': { name: 'イオ' }
			},
			areas: {
				'meadow-entry': 'サンドロップ草原',
				'hero-house': 'グリクの家',
				'guild-hall': '狩人の集会所',
				'item-shop': '薬草小屋',
				'blacksmith-interior': 'サンドロップ鍛冶場',
				'villager-house-1': '民家',
				'villager-house-2': '民家',
				'villager-house-3': '民家',
				'shrine-of-aurora-interior': 'オーロラの社',
				'ruins-threshold': '古いトンネル',
				'ruins-core': '古いトンネルの奥',
				overworld: '荒野'
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
