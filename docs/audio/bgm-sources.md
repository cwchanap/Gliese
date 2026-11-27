# Background music sources

Every `bgm-*.mp3` in `public/game/audio/` was generated with ElevenLabs Music
(`music_v2_5`, `pcm_44100`, `force_instrumental`), one take per track. Each prompt
ends with the same loop clause:

> Loopable video game background music: it starts right away at full groove with no intro, keeps one steady tempo and energy the whole way through, and never builds to a finale, slows down, or fades out.

The raw take was then cut into a seamless loop: the tempo is beat-tracked, the loop
spans a whole number of bars, the seam gets a one-bar equal-power crossfade, and the
loop is levelled to -18 LUFS before it is encoded as a 128 kbps MP3. Each file is the
loop itself, so the game simply repeats the whole file. Keys and the rules that pick
a track live in `src/lib/game/content/audio.ts`.

The lossless loop masters, the raw takes, and the loop tool (`make_loop.py`) are kept
outside the repo with the project's art and audio sources.

| Key | Name | Plays | BPM | Loop | Prompt |
| --- | --- | --- | --- | --- | --- |
| `bgm-title` | Song of Sundrop | Title screen and the Chapter One card after the vow | 80 | 16 bars, 48.0 s | Instrumental folk fantasy RPG title theme for a peaceful goblin hunter village in the forest. Warm, nostalgic and gently sad. A lyrical wooden flute melody over kalimba arpeggios, a soft frame drum pulse and low sustained strings. D Dorian, 80 BPM, 4/4. |
| `bgm-day` | Hunter's Day | The proving day, indoors and out (the village and the wilds) | 100 | 24 bars, 57.6 s | Instrumental folk fantasy RPG exploration theme for a young goblin hunter's day in a sunny forest village and the wild woods around it. Bright, pastoral and adventurous with a light bounce. Plucked lute and marimba melody, bamboo flute answers, hand drum and shaker groove, warm upright bass. G major, 100 BPM, 4/4. |
| `bgm-hearth` | Hearth Night | The evening: dinner, Mott's tale, walking Lirra home | 70 | 16 bars, 54.9 s | Instrumental folk fantasy RPG night theme for a goblin family's dinner around the hearth. Tender, intimate and quietly happy, with a trace of farewell. Solo wooden flute melody, soft kalimba and harp, a warm low drone, no drums. F major, 70 BPM, 4/4. |
| `bgm-raid` | Sundrop Burns | The raid | 128 | 24 bars, 45.0 s | Instrumental dark fantasy RPG theme for a goblin village burning during a dawn raid by armored human soldiers. Urgent, frightening and desperate. Pounding war drums, low brass stabs, tremolo strings, a distant war horn motif. C minor, 128 BPM, 4/4. |
| `bgm-tunnel` | Ancestors' Tunnel | The ruins, and the escape from the tunnel to the vow on the ridge | 60 | 16 bars, 64.0 s | Instrumental dark ambient fantasy RPG theme for a lone young goblin escaping through an ancient ancestral tunnel after losing his family. Grieving, hushed and mysterious. A deep low drone, sparse marimba notes, a breathy wooden flute line, soft bowed cello, no drums. A minor, 60 BPM, 4/4. |
| `bgm-battle` | Snare, Flank, Loose | Every normal fight | 140 | 32 bars, 54.9 s | Instrumental tribal fantasy RPG battle theme for a goblin hunter fighting wild beasts with a spear and a snare rope. Driving and tense but fun and nimble. Fast tribal drums and taiko, a staccato string ostinato, bone flute riffs, plucked bass. E minor, 140 BPM, 4/4. |
| `bgm-boss` | Boar King | The boss fight | 150 | 32 bars, 51.2 s | Instrumental tribal fantasy RPG boss battle theme against a giant enraged boar king. Heavy, ferocious and epic. Deep taiko and war drums, low horns and trombones, aggressive staccato strings, shrieking bone flute. D minor, 150 BPM, 4/4. |
