export type DialogueMode = 'conversation' | 'choice' | 'system';

export type DialogueIntent = { type: 'openShop'; shopId: string } | { type: 'close' };

export type DialogueChoice = {
	id: string;
	label: string;
	intent: DialogueIntent;
};

/** One spoken line; narration has an empty speaker. */
export type DialogueLine = {
	speaker: string;
	text: string;
};

export type DialogueSession = {
	id: string;
	/** Dialogue id of the NPC being spoken to; null for scenes and notices. */
	npcId: string | null;
	/** Speaker and text of the current line, as the HUD shows them. */
	speaker: string;
	line: string;
	lines: DialogueLine[];
	lineIndex: number;
	lineCount: number;
	mode: DialogueMode;
	choices: DialogueChoice[];
	canClose: boolean;
};

export type DialogueChoiceResult = {
	session: DialogueSession | null;
	intent: DialogueIntent | null;
};

export function createDialogueSession({
	id,
	npcId = null,
	lines,
	choices = [],
	mode
}: {
	id: string;
	npcId?: string | null;
	lines: DialogueLine[];
	choices?: DialogueChoice[];
	mode?: DialogueMode;
}): DialogueSession {
	const first = lines[0] ?? { speaker: '', text: '' };

	return {
		id,
		npcId,
		speaker: first.speaker,
		line: first.text,
		lines,
		lineIndex: 0,
		lineCount: lines.length,
		mode: mode ?? (lines.length <= 1 && choices.length > 0 ? 'choice' : 'conversation'),
		choices,
		canClose: true
	};
}

export function advanceDialogue(session: DialogueSession): DialogueSession {
	if (session.lineIndex + 1 < session.lineCount) {
		const lineIndex = session.lineIndex + 1;
		const line = session.lines[lineIndex]!;

		return {
			...session,
			lineIndex,
			speaker: line.speaker,
			line: line.text,
			mode: session.mode === 'system' ? 'system' : 'conversation'
		};
	}

	return {
		...session,
		mode: session.choices.length > 0 ? 'choice' : session.mode
	};
}

export function chooseDialogueOption({
	session,
	choiceId,
	fallbackLine
}: {
	session: DialogueSession;
	choiceId: string;
	/** Shown when the choice no longer exists. */
	fallbackLine: string;
}): DialogueChoiceResult {
	const choice = session.choices.find((candidate) => candidate.id === choiceId);
	if (!choice) {
		return { session: buildDialogueFallback(session.speaker, fallbackLine), intent: null };
	}

	return { session: null, intent: choice.intent };
}

export function buildDialogueFallback(speaker: string, line: string): DialogueSession {
	return createDialogueSession({
		id: `fallback:${speaker}:${line}`,
		lines: [{ speaker, text: line }],
		mode: 'system'
	});
}
