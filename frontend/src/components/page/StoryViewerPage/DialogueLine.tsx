import { ArrowDownToLine, Download, Pause, Play } from "lucide-react";
import type React from "react";
import Button from "../../ui/Button";

type DialogueLineProps = {
	dialogue: {
		character: string;
		text: string;
		voiceFile?: string;
	};
	displayName: string;
	displayText: string;
	isPlaceholder: boolean;
	index: number;
	storyScriptId: number | null;
	isPlayingVoice: string | null;
	availableVoices: Set<string>;
	_seEvents: Array<{
		action: "play" | "stop";
		name: string;
		volume: number;
	}>;
	isConverting: boolean;
	onDialogueIndexChange: (value: number) => void;
	onVoicePlay: (
		voiceFile: string,
		storyId: number,
		dialogueIndex: number,
	) => void;
	onVoiceDownload: (voiceFile: string, storyId: number) => void;
	onStoryVoiceConversion: (storyId: number) => void;
};

const DialogueLine: React.FC<DialogueLineProps> = ({
	dialogue,
	index,
	storyScriptId,
	isPlayingVoice,
	availableVoices,
	isConverting,
	onDialogueIndexChange,
	onVoicePlay,
	onVoiceDownload,
	onStoryVoiceConversion,
	displayName,
	displayText,
	isPlaceholder,
}) => {
	const lines = displayText.split("\n");

	return (
		<div className="flex items-center space-x-3 p-3 bg-surface rounded-lg shadow-sm">
			<Button
				onClick={() => onDialogueIndexChange(index)}
				variant="ghost"
				tone="text"
				size="sm"
				className="flex-1 justify-start items-start text-left p-0 hover:bg-transparent"
			>
				<div className="flex items-center gap-3 w-full">
					<div className="w-20 shrink-0 text-sm font-medium text-saya">
						{displayName}
					</div>
					<div className="text-text text-sm">
						{lines.map((line, lineIndex) => (
							<span
								key={`${dialogue.character}-${dialogue.voiceFile ?? "no-voice"}-${line}`}
								className={isPlaceholder ? "text-muted italic" : undefined}
							>
								{line}
								{lineIndex < lines.length - 1 && <br />}
							</span>
						))}
					</div>
				</div>
			</Button>
			{storyScriptId && dialogue.voiceFile && (
				<div className="flex-shrink-0">
					{(() => {
						const voiceFile = dialogue.voiceFile;
						const scriptId = storyScriptId;
						if (!voiceFile || !scriptId) return null;

						return availableVoices.has(voiceFile) ? (
							<div className="flex items-center gap-2">
								<Button
									onClick={() => onVoicePlay(voiceFile, scriptId, index)}
									tone="saya"
									size="icon"
									className="rounded-full shadow-md hover:bg-megu"
									title={`Play: ${voiceFile}`}
								>
									{isPlayingVoice === voiceFile ? (
										<Pause className="w-4 h-4" fill="currentColor" />
									) : (
										<Play className="w-4 h-4" fill="currentColor" />
									)}
								</Button>
								<Button
									onClick={() => onVoiceDownload(voiceFile, scriptId)}
									variant="soft"
									tone="megu"
									size="icon"
									className="rounded-full shadow-md hover:bg-surface"
									title={`Download: ${voiceFile}`}
								>
									<Download className="w-4 h-4" />
								</Button>
							</div>
						) : (
							<Button
								onClick={() => onStoryVoiceConversion(scriptId)}
								disabled={isConverting}
								variant="soft"
								tone="megu"
								size="icon"
								className="rounded-full shadow-md hover:bg-surface disabled:bg-border"
								title="Conversion required"
							>
								<ArrowDownToLine className="w-4 h-4" />
							</Button>
						);
					})()}
				</div>
			)}
		</div>
	);
};

export default DialogueLine;
