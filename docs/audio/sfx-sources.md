# Sound effect sources

Every file in `public/game/audio/` was generated with ElevenLabs Sound Effects
(`eleven_text_to_sound_v2`, prompt influence 0.3 unless noted). The best take was
trimmed of leading/trailing silence and loudness-levelled with ffmpeg `loudnorm`
(one-shots I=-16, loops I=-20, left untrimmed so they stay seamless), then encoded
as 128 kbps MP3. Keys and playback hooks live in `src/lib/game/content/audio.ts`.

| Key | Prompt | Length | Loop |
| --- | --- | --- | --- |
| `ui-select` | Crisp wooden click, single short tap of a wooden bead on a table, close-mic (prompt influence 0.6, cut to 0.25 s) | 1 s |  |
| `hero-swing` | Quick whoosh of a wooden spear swung through the air | 0.6 s |  |
| `hit` | Meaty blunt impact thud on a beast's hide, punchy | 0.6 s |  |
| `hero-hurt` | Small goblin grunt of pain with a soft body thud | 0.8 s |  |
| `enemy-defeat` | Beast collapsing to the ground with a dull thud and a fading whimper | 1.2 s |  |
| `battle-start` | Tense tribal war drum double hit with a short low brass stab | 1.5 s |  |
| `victory` | Short triumphant tribal jingle, hand drums and wooden flute rising, game victory | 3 s |  |
| `defeat` | Low somber horn note fading out, game over sting | 3 s |  |
| `pickup` | Bright short sparkle chime, item collected | 1 s |  |
| `coins` | Handful of small coins jingling into a leather pouch | 1 s |  |
| `heal` | Gulp of a potion followed by a soft magical shimmer | 1.5 s |  |
| `door` | Old wooden door creaking open with a latch click | 1.2 s |  |
| `save` | Soft warm bell chime, gentle and reassuring | 1.5 s |  |
| `quest-complete` | Rising tribal marimba and chime flourish, quest complete | 2.5 s |  |
| `boss-roar` | Huge wild boar enraged squealing roar, deep and loud | 2 s |  |
| `war-horn` | Distant human war horn blowing over a valley at night | 4 s |  |
| `flee` | Quick light footsteps scurrying away on dirt | 1.2 s |  |
| `amb-village` | Peaceful forest village daytime ambience, songbirds, light wind in leaves, distant creek | 20 s | yes |
| `amb-raid` | Burning village at night, crackling fire, distant shouting and clashing metal | 20 s | yes |
| `amb-tunnel` | Dark cave tunnel ambience, slow water drips, low hollow wind | 20 s | yes |
