import { AnimatePresence, motion } from "framer-motion";
import {
	BookOpen,
	Download,
	FileText,
	Image,
	List,
	MessageCircle,
	Music,
	Pause,
	Play,
	X,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import useTranslation from "../../../hooks/useTranslation";
import {
	getCharacterTranslation,
	type LanguageCode,
} from "../../../lib/characterTranslations";
import { VITE_BACKEND_URL } from "../../../lib/const";
import Button from "../../ui/Button";
import Range from "../../ui/Range";
import TranslationToolbar from "../../ui/TranslationToolbar";
import DialogueLine from "./DialogueLine";
import SeLine from "./SeLine";
import StoryBackgroundCanvas from "./StoryBackgroundCanvas";
import type { DetailedStoryResult, StoryResult } from "./types";

type SeEvent = {
	action: "play" | "stop";
	name: string;
	volume: number;
};

interface SelectedStoryDetailsSectionProps {
	selectedStory: DetailedStoryResult;
	formatStoryTime: (value?: string) => string;
	onClose: () => void;
	isConverting: boolean;
	isConvertingBackgrounds: boolean;
	isConvertingBgm: boolean;
	isRevertingBgm: boolean;
	isConvertingSe: boolean;
	seEventsByDialogue: SeEvent[][];
	autoPlayEnabled: boolean;
	currentVoiceFile: string | null;
	currentBgmName: string | null;
	voiceVolume: number;
	bgmVolume: number;
	seVolume: number;
	onVoiceVolumeChange: (value: number) => void;
	onBgmVolumeChange: (value: number) => void;
	onSeVolumeChange: (value: number) => void;
	availableVoices: Set<string>;
	requiredVoiceFiles: Set<string>;
	availableBgms: Set<string>;
	requiredBgms: Set<string>;
	availableSes: Set<string>;
	requiredSes: Set<string>;
	playingSe: string | null;
	bgmList: string[];
	backgroundConversionMessage: string;
	bgmConversionMessage: string;
	seConversionMessage: string;
	bgmReconversionMessage: string;
	realtimeProgress: { current: number; total: number; storyId: string } | null;
	playableVoices: Array<{ voiceFile: string; index: number }>;
	contentTab: "parsed" | "raw";
	onContentTabChange: (value: "parsed" | "raw") => void;
	displayedBackground: string | null;
	currentBackgroundUrl: string | null;
	availableBackgrounds: Set<string>;
	assetReloadToken: number;
	currentSpeaker: string;
	currentDialogueIndex: number;
	onDialogueIndexChange: (value: number) => void;
	isPlayingVoice: string | null;
	onVoicePlay: (
		voiceFile: string,
		storyId: number,
		dialogueIndex: number,
	) => void;
	onVoiceDownload: (voiceFile: string, storyId: number) => void;
	onStoryVoiceConversion: (storyId: number) => void;
	onStoryBackgroundConversion: (storyId: number) => void;
	onStoryBgmAction: (storyId: number) => void;
	onStorySeConversion: (storyId: number) => void;
	onSePlay: (name: string) => void;
	onSeDownload: (name: string) => void;
	onStoryAssetReload: () => void;
	onToggleAutoPlay: () => void;
	onRelatedStorySelect: (story: StoryResult) => void;
}

const SelectedStoryDetailsSection: React.FC<
	SelectedStoryDetailsSectionProps
> = ({
	selectedStory,
	formatStoryTime,
	onClose,
	isConverting,
	isConvertingBackgrounds,
	isConvertingBgm,
	isRevertingBgm,
	isConvertingSe,
	seEventsByDialogue,
	autoPlayEnabled,
	currentVoiceFile,
	currentBgmName,
	voiceVolume,
	bgmVolume,
	seVolume,
	onVoiceVolumeChange,
	onBgmVolumeChange,
	onSeVolumeChange,
	availableVoices,
	requiredVoiceFiles,
	availableBgms,
	requiredBgms,
	availableSes,
	requiredSes,
	playingSe,
	bgmList,
	backgroundConversionMessage,
	bgmConversionMessage,
	seConversionMessage,
	bgmReconversionMessage,
	realtimeProgress,
	playableVoices,
	contentTab,
	onContentTabChange,
	displayedBackground,
	currentBackgroundUrl,
	availableBackgrounds,
	assetReloadToken,
	currentSpeaker,
	currentDialogueIndex,
	onDialogueIndexChange,
	isPlayingVoice,
	onVoicePlay,
	onVoiceDownload,
	onStoryVoiceConversion,
	onStoryBackgroundConversion,
	onStoryBgmAction,
	onStorySeConversion,
	onSePlay,
	onSeDownload,
	onStoryAssetReload,
	onToggleAutoPlay,
	onRelatedStorySelect,
}) => {
	const storyScriptId = selectedStory.story.ScriptId;
	const [previewBackground, setPreviewBackground] = useState<{
		name: string;
		url: string;
	} | null>(null);
	const dialogueRefs = useRef<Array<HTMLDivElement | null>>([]);
	const dialogueListRef = useRef<HTMLDivElement | null>(null);
	const requiredBackgroundCount =
		selectedStory.storyText?.content?.metadata?.backgrounds?.length ?? 0;
	const uniqueBackgrounds = selectedStory.storyText?.content?.metadata
		?.backgrounds
		? Array.from(new Set(selectedStory.storyText.content.metadata.backgrounds))
		: [];
	const [selectedLanguage, setSelectedLanguage] = useState<LanguageCode>("ja");
	const [translationsByLanguage, setTranslationsByLanguage] = useState<
		Partial<Record<LanguageCode, Record<number, string>>>
	>({});
	const [nameTranslationsByLanguage, setNameTranslationsByLanguage] = useState<
		Partial<Record<LanguageCode, Record<string, string>>>
	>({});
	const [isBatchTranslating, setIsBatchTranslating] = useState(false);
	const isTranslationActive = selectedLanguage !== "ja";
	const {
		availability,
		downloadProgress,
		error: translationError,
		isTranslating,
		translateText,
		prepareTranslator,
		clearError,
	} = useTranslation({
		sourceLanguage: "ja",
		targetLanguage: selectedLanguage,
		enabled: isTranslationActive,
	});
	const canTranslate =
		availability === "available" || availability === "downloadable";
	const dialogueList = selectedStory.storyText?.content?.dialogue ?? [];
	const translatableCount = dialogueList.filter((dialogue) =>
		dialogue.text.trim(),
	).length;
	const currentTranslations = translationsByLanguage[selectedLanguage] ?? {};
	const currentNameTranslations =
		nameTranslationsByLanguage[selectedLanguage] ?? {};
	const translatedCount = Object.keys(currentTranslations).length;
	const languageOptions: Array<{
		value: LanguageCode;
		label: string;
		subtitle: string;
	}> = [
		{ value: "ja", label: "日本語", subtitle: "Original" },
		{ value: "en", label: "English", subtitle: "Translate" },
		{ value: "zh", label: "中文", subtitle: "Translate" },
		{ value: "ko", label: "한국어", subtitle: "Translate" },
	];

	useEffect(() => {
		if (!autoPlayEnabled) return;
		const container = dialogueListRef.current;
		const target = dialogueRefs.current[currentDialogueIndex];
		if (container && target) {
			const containerRect = container.getBoundingClientRect();
			const targetRect = target.getBoundingClientRect();
			const currentScrollTop = container.scrollTop;
			const targetTop = currentScrollTop + (targetRect.top - containerRect.top);
			const centeredTop =
				targetTop - (container.clientHeight / 2 - targetRect.height / 2);
			const offsetY = -80;
			container.scrollTo({
				top: Math.max(centeredTop - offsetY, 0),
				behavior: "smooth",
			});
		}
	}, [autoPlayEnabled, currentDialogueIndex]);

	useEffect(() => {
		const storyId = selectedStory.story.Id;
		setSelectedLanguage("ja");
		setTranslationsByLanguage({});
		setNameTranslationsByLanguage({});
		setIsBatchTranslating(false);
		clearError();
		if (!storyId) {
			return;
		}
	}, [selectedStory.story.Id, clearError]);
	const handleAssetDownload = async (url: string, filename: string) => {
		try {
			const response = await fetch(url);
			if (!response.ok) {
				throw new Error(`Download failed: ${response.status}`);
			}
			const blob = await response.blob();
			const objectUrl = window.URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = objectUrl;
			a.download = filename;
			document.body.appendChild(a);
			a.click();
			a.remove();
			window.URL.revokeObjectURL(objectUrl);
		} catch (error) {
			console.error("Asset download error:", error);
		}
	};

	const handleTranslateAll = useCallback(async () => {
		if (!isTranslationActive || !canTranslate || isBatchTranslating) return;
		setIsBatchTranslating(true);
		const nextTranslations = { ...currentTranslations };
		try {
			for (let index = 0; index < dialogueList.length; index += 1) {
				const text = dialogueList[index]?.text ?? "";
				if (!text.trim() || nextTranslations[index]) continue;
				const translated = await translateText(text);
				if (translated) {
					nextTranslations[index] = translated;
				}
			}
			setTranslationsByLanguage((prev) => ({
				...prev,
				[selectedLanguage]: nextTranslations,
			}));
		} finally {
			setIsBatchTranslating(false);
		}
	}, [
		canTranslate,
		currentTranslations,
		dialogueList,
		isBatchTranslating,
		isTranslationActive,
		selectedLanguage,
		translateText,
	]);

	const ensureNameTranslations = useCallback(async () => {
		if (!isTranslationActive || !canTranslate) return;
		const names = new Set<string>();
		for (const dialogue of dialogueList) {
			if (dialogue.character?.trim()) names.add(dialogue.character.trim());
		}
		const metadataNames =
			selectedStory.storyText?.content?.metadata?.characters ?? [];
		for (const name of metadataNames) {
			if (name?.trim()) names.add(name.trim());
		}
		if (names.size === 0) return;

		const nextTranslations = { ...currentNameTranslations };
		let didUpdate = false;

		for (const name of names) {
			const staticName = getCharacterTranslation(name, selectedLanguage);
			if (staticName) {
				if (!nextTranslations[name]) {
					nextTranslations[name] = staticName;
					didUpdate = true;
				}
				continue;
			}
			if (nextTranslations[name]) continue;
			const translated = await translateText(name);
			if (translated) {
				nextTranslations[name] = translated;
				didUpdate = true;
			}
		}

		if (didUpdate) {
			setNameTranslationsByLanguage((prev) => ({
				...prev,
				[selectedLanguage]: nextTranslations,
			}));
		}
	}, [
		canTranslate,
		currentNameTranslations,
		dialogueList,
		isTranslationActive,
		selectedLanguage,
		selectedStory.storyText?.content?.metadata?.characters,
		translateText,
	]);

	const getDisplayText = useCallback(
		(text: string, index: number) => {
			if (!isTranslationActive) {
				return { text, isPlaceholder: false };
			}
			const translated = currentTranslations[index];
			if (translated) {
				return { text: translated, isPlaceholder: false };
			}
			if (isBatchTranslating || isTranslating) {
				return { text: "Translating...", isPlaceholder: true };
			}
			return { text: "Translation not ready", isPlaceholder: true };
		},
		[
			currentTranslations,
			isBatchTranslating,
			isTranslating,
			isTranslationActive,
		],
	);

	const getDisplayName = useCallback(
		(name: string) => {
			if (!isTranslationActive) return name;
			return (
				currentNameTranslations[name] ??
				getCharacterTranslation(name, selectedLanguage) ??
				name
			);
		},
		[currentNameTranslations, isTranslationActive, selectedLanguage],
	);

	useEffect(() => {
		if (!isTranslationActive || !canTranslate) return;
		if (isBatchTranslating) return;
		if (translatedCount > 0) return;
		void handleTranslateAll();
	}, [
		canTranslate,
		handleTranslateAll,
		isBatchTranslating,
		isTranslationActive,
		translatedCount,
	]);

	useEffect(() => {
		void ensureNameTranslations();
	}, [ensureNameTranslations]);

	const currentDialogueText = dialogueList[currentDialogueIndex]?.text ?? "";
	const displayQuote = getDisplayText(
		currentDialogueText,
		currentDialogueIndex,
	).text;
	const displaySpeaker = getDisplayName(currentSpeaker);

	return (
		<div className="bg-surface rounded-lg p-6 border border-border">
			<div className="flex items-start justify-between mb-4">
				<h3 className="text-xl font-bold text-saya flex items-center gap-2">
					<BookOpen className="w-5 h-5" />
					{selectedStory.story.Name}
				</h3>
				<Button
					onClick={onClose}
					variant="ghost"
					tone="megu"
					size="icon"
					className="text-muted hover:text-text"
				>
					<X className="h-4 w-4" />
				</Button>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 p-4 bg-border rounded-lg">
				<div>
					<span className="font-medium text-text">Description:</span>
					<span className="ml-2 text-text">
						{selectedStory.story.Description}
					</span>
				</div>
				<div>
					<span className="font-medium text-text">Story ID:</span>
					<span className="ml-2 text-text">{selectedStory.story.Id}</span>
				</div>
				<div>
					<span className="font-medium text-text">Script ID:</span>
					<span className="ml-2 text-text">
						{selectedStory.story.ScriptId ?? "-"}
					</span>
				</div>
				<div>
					<span className="font-medium text-text">Type:</span>
					<span className="ml-2 text-text">{selectedStory.storyType}</span>
				</div>
				<div>
					<span className="font-medium text-text">Start:</span>
					<span className="ml-2 text-text">
						{formatStoryTime(selectedStory.story.StartTime)}
					</span>
				</div>
				<div>
					<span className="font-medium text-text">End:</span>
					<span className="ml-2 text-text">
						{formatStoryTime(selectedStory.story.EndTime)}
					</span>
				</div>
			</div>

			{selectedStory.story.ScriptId && (
				<div className="mb-6 p-4 bg-saya/10 border border-saya/40 rounded-lg">
					<h4 className="text-lg font-medium text-saya mb-3 flex items-center gap-2">
						<Music className="w-5 h-5 text-saya" />
						Voice Conversion
					</h4>
					<div className="flex flex-wrap items-center gap-3">
						<Button
							onClick={() => {
								if (!storyScriptId) return;
								onStoryVoiceConversion(storyScriptId);
							}}
							disabled={isConverting || requiredVoiceFiles.size === 0}
							tone="saya"
							size="md"
							className={`${
								availableVoices.size > 0
									? "bg-surface text-text border border-border hover:bg-border disabled:opacity-50"
									: "bg-saya hover:bg-megu text-text disabled:bg-muted"
							}`}
						>
							{isConverting
								? "Converting..."
								: availableVoices.size > 0
									? "Reconvert story voices"
									: "Convert story voices"}
						</Button>
						<Button
							onClick={() => {
								if (!storyScriptId) return;
								onStoryBackgroundConversion(storyScriptId);
							}}
							disabled={
								isConvertingBackgrounds || requiredBackgroundCount === 0
							}
							tone="saya"
							size="md"
							className={`${
								availableBackgrounds.size > 0
									? "bg-surface text-text border border-border hover:bg-border disabled:opacity-50"
									: "bg-saya hover:bg-megu text-text disabled:bg-muted"
							}`}
						>
							{isConvertingBackgrounds
								? "Converting backgrounds..."
								: availableBackgrounds.size > 0
									? "Reconvert backgrounds"
									: "Convert backgrounds"}
						</Button>
						<Button
							onClick={() => {
								if (!storyScriptId) return;
								onStoryBgmAction(storyScriptId);
							}}
							disabled={
								isConvertingBgm || isRevertingBgm || requiredBgms.size === 0
							}
							tone="saya"
							size="md"
							className={`${
								availableBgms.size > 0
									? "bg-surface text-text border border-border hover:bg-border disabled:opacity-50"
									: "bg-saya hover:bg-megu text-text disabled:bg-muted"
							}`}
						>
							{isConvertingBgm || isRevertingBgm
								? "Converting BGM..."
								: availableBgms.size > 0
									? "Reconvert BGM"
									: "Convert BGM"}
						</Button>
						<Button
							onClick={() => {
								if (!storyScriptId) return;
								onStorySeConversion(storyScriptId);
							}}
							disabled={isConvertingSe || requiredSes.size === 0}
							tone="saya"
							size="md"
							className={`${
								availableSes.size > 0
									? "bg-surface text-text border border-border hover:bg-border disabled:opacity-50"
									: "bg-saya hover:bg-megu text-text disabled:bg-muted"
							}`}
						>
							{isConvertingSe
								? "Converting SE..."
								: availableSes.size > 0
									? "Reconvert SE"
									: "Convert SE"}
						</Button>
						<div className="text-sm text-muted">
							{availableVoices.size}/{requiredVoiceFiles.size} ready
						</div>
						<div className="text-sm text-muted">
							{availableBgms.size}/{requiredBgms.size} BGM ready
						</div>
						<div className="text-sm text-muted">
							{availableSes.size}/{requiredSes.size} SE ready
						</div>
					</div>
					{realtimeProgress &&
						selectedStory.story.ScriptId &&
						realtimeProgress.storyId ===
							selectedStory.story.ScriptId.toString() && (
							<div className="mt-3 space-y-2">
								<div className="h-2 w-full rounded-full bg-saya/40 overflow-hidden">
									<div
										className="h-full bg-saya transition-all"
										style={{
											width: `${Math.min(
												100,
												(realtimeProgress.current / realtimeProgress.total) *
													100,
											)}%`,
										}}
									/>
								</div>
								<div className="text-xs text-saya">
									Converting {realtimeProgress.current}/{realtimeProgress.total}{" "}
									streams...
								</div>
							</div>
						)}
					{backgroundConversionMessage && (
						<div className="mt-3 text-sm text-text">
							{backgroundConversionMessage}
						</div>
					)}
					{bgmConversionMessage && (
						<div className="mt-2 text-sm text-text">{bgmConversionMessage}</div>
					)}
					{bgmReconversionMessage && (
						<div className="mt-2 text-sm text-text">
							{bgmReconversionMessage}
						</div>
					)}
					{seConversionMessage && (
						<div className="mt-2 text-sm text-text">{seConversionMessage}</div>
					)}
					<div className="mt-4">
						<Button
							onClick={onStoryAssetReload}
							variant="solid"
							tone="saya"
							size="sm"
							className="rounded-md text-sm hover:bg-saya/80"
						>
							Reload assets
						</Button>
					</div>
				</div>
			)}

			{selectedStory.storyText?.found && selectedStory.storyText.content && (
				<div>
					<div className="flex items-center gap-3 mb-2 flex-nowrap">
						<div className="flex items-center gap-3 flex-1 min-w-0">
							<h4 className="text-lg font-medium text-text flex items-center gap-2">
								<MessageCircle className="w-5 h-5 text-saya" />
								Story Content
							</h4>
							<Button
								onClick={onToggleAutoPlay}
								disabled={playableVoices.length === 0}
								variant="solid"
								tone="saya"
								size="md"
								className={`${
									playableVoices.length === 0
										? "opacity-50 cursor-not-allowed"
										: "hover:bg-saya/80"
								}`}
							>
								<span className="flex items-center gap-2">
									{autoPlayEnabled ? (
										<Pause className="w-4 h-4" />
									) : (
										<Play className="w-4 h-4" />
									)}
									{autoPlayEnabled ? "Auto Playing" : "Auto Play"}
								</span>
							</Button>
						</div>
						<div className="flex items-center bg-border rounded-lg p-1 text-sm shrink-0">
							<Button
								onClick={() => onContentTabChange("parsed")}
								variant="soft"
								tone="megu"
								size="sm"
								className={`rounded-md ${
									contentTab === "parsed"
										? "bg-surface text-text shadow-sm"
										: "bg-transparent text-muted hover:text-text"
								}`}
							>
								Parsed
							</Button>
							<Button
								onClick={() => onContentTabChange("raw")}
								variant="soft"
								tone="megu"
								size="sm"
								className={`rounded-md flex items-center gap-1 ${
									contentTab === "raw"
										? "bg-surface text-text shadow-sm"
										: "bg-transparent text-muted hover:text-text"
								}`}
							>
								<FileText className="w-4 h-4" />
								Raw
							</Button>
						</div>
					</div>
					<TranslationToolbar
						languages={languageOptions}
						selectedLanguage={selectedLanguage}
						onSelectLanguage={setSelectedLanguage}
						isTranslationActive={isTranslationActive}
						availability={availability}
						downloadProgress={downloadProgress}
						isTranslating={isTranslating}
						isBatchTranslating={isBatchTranslating}
						translatedCount={translatedCount}
						totalCount={translatableCount}
						errorMessage={translationError}
						onPrepareDownload={() => {
							void prepareTranslator();
						}}
						onTranslateAll={handleTranslateAll}
					/>

					<div className="mb-4">
						<div className="text-sm text-muted mb-2">Current Background</div>
						<div className="relative w-full overflow-hidden rounded-lg border border-border bg-surface">
							<div className="w-full aspect-video">
								{displayedBackground &&
								currentBackgroundUrl &&
								availableBackgrounds.has(displayedBackground) ? (
									<StoryBackgroundCanvas
										baseImageUrl={currentBackgroundUrl}
										quote={displayQuote}
										name={displaySpeaker}
									/>
								) : (
									<div className="w-full h-full flex items-center justify-center text-sm text-muted">
										No background image
									</div>
								)}
							</div>
						</div>
					</div>

					{contentTab === "parsed" ? (
						<>
							{selectedStory.storyText.content.dialogue.length > 0 && (
								<div className="mb-4">
									<div className="text-sm text-muted mb-3">
										Dialogue ({selectedStory.storyText.content.dialogue.length}
										lines):
									</div>
									<div
										ref={dialogueListRef}
										className="space-y-3 max-h-96 overflow-y-auto bg-border p-4 rounded-lg border border-border"
									>
										{selectedStory.storyText.content.dialogue.map(
											(
												dialogue: {
													character: string;
													text: string;
													voiceFile?: string;
												},
												index: number,
											) => {
												const display = getDisplayText(dialogue.text, index);
												const displayName = getDisplayName(dialogue.character);
												const seEvents = seEventsByDialogue[index] ?? [];
												return (
													<div
														key={`${dialogue.character}-${dialogue.voiceFile ?? "no-voice"}-${dialogue.text}`}
														ref={(node) => {
															dialogueRefs.current[index] = node;
														}}
														className="space-y-3"
													>
														{seEvents.length > 0 && (
															<SeLine
																events={seEvents}
																availableSes={availableSes}
																playingSe={playingSe}
																onSePlay={onSePlay}
																onSeDownload={onSeDownload}
															/>
														)}
														<DialogueLine
															dialogue={dialogue}
															displayName={displayName}
															displayText={display.text}
															isPlaceholder={display.isPlaceholder}
															index={index}
															storyScriptId={storyScriptId ?? null}
															isPlayingVoice={isPlayingVoice}
															availableVoices={availableVoices}
															_seEvents={seEvents}
															isConverting={isConverting}
															onDialogueIndexChange={onDialogueIndexChange}
															onVoicePlay={onVoicePlay}
															onVoiceDownload={onVoiceDownload}
															onStoryVoiceConversion={onStoryVoiceConversion}
														/>
													</div>
												);
											},
										)}
									</div>
									<div className="my-3 p-3 bg-surface rounded-lg border border-border space-y-2">
										<div className="text-sm text-text">
											Now Playing Voice:{" "}
											<span className="font-medium">
												{currentVoiceFile ?? "-"}
											</span>
										</div>
										<div className="text-sm text-text">
											Now Playing BGM:{" "}
											<span className="font-medium">
												{currentBgmName ?? "-"}
											</span>
										</div>
										<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
											<div className="text-sm text-text flex items-center gap-3">
												Voice Volume
												<Range
													value={voiceVolume}
													min={0}
													max={1}
													step={0.01}
													onChange={(event) =>
														onVoiceVolumeChange(Number(event.target.value))
													}
													size="sm"
													className="flex-1"
													aria-label="Voice volume"
												/>
												<span className="w-10 text-right">
													{Math.round(voiceVolume * 100)}
												</span>
											</div>
											<div className="text-sm text-text flex items-center gap-3">
												BGM Volume
												<Range
													value={bgmVolume}
													min={0}
													max={1}
													step={0.01}
													onChange={(event) =>
														onBgmVolumeChange(Number(event.target.value))
													}
													size="sm"
													className="flex-1"
													aria-label="BGM volume"
												/>
												<span className="w-10 text-right">
													{Math.round(bgmVolume * 100)}
												</span>
											</div>
											<div className="text-sm text-text flex items-center gap-3">
												SE Volume
												<Range
													value={seVolume}
													min={0}
													max={1}
													step={0.01}
													onChange={(event) =>
														onSeVolumeChange(Number(event.target.value))
													}
													size="sm"
													className="flex-1"
													aria-label="SE volume"
												/>
												<span className="w-10 text-right">
													{Math.round(seVolume * 100)}
												</span>
											</div>
										</div>
									</div>
								</div>
							)}

							{selectedStory.storyText.content.metadata.characters.length >
								0 && (
								<div className="mb-4">
									<div className="text-sm text-muted mb-2">Characters:</div>
									<div className="flex flex-wrap gap-2">
										{selectedStory.storyText.content.metadata.characters.map(
											(char: string) => (
												<span
													key={char}
													className="px-3 py-1 bg-saya text-text text-sm rounded-full"
												>
													{getDisplayName(char)}
												</span>
											),
										)}
									</div>
								</div>
							)}

							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								{bgmList.length > 0 && (
									<div className="p-3 bg-kaho/10 rounded-lg">
										<div className="text-sm font-medium text-kaho mb-2 flex items-center gap-2">
											<Music className="w-4 h-4 text-kaho" />
											BGM:
										</div>
										<div className="space-y-1">
											{bgmList.map((bgm) => (
												<div
													key={bgm}
													className="flex items-center justify-between gap-2 text-sm text-kaho"
												>
													<span className="truncate">{bgm}</span>
													<Button
														onClick={() =>
															handleAssetDownload(
																`${VITE_BACKEND_URL}/assets/bgm/${bgm}.m4a`,
																`${bgm}.m4a`,
															)
														}
														variant="soft"
														tone="kaho"
														size="icon"
														className="rounded-full w-8 h-8 hover:bg-kaho/20"
														title="Download BGM"
													>
														<Download className="w-4 h-4" />
													</Button>
												</div>
											))}
										</div>
									</div>
								)}

								{uniqueBackgrounds.length > 0 && (
									<div className="p-3 bg-kozu/10 rounded-lg">
										<div className="text-sm font-medium text-kozu mb-2 flex items-center gap-2">
											<Image className="w-4 h-4 text-kozu" />
											Backgrounds:
										</div>
										<div
											className="grid grid-cols-1 md:grid-cols-2 gap-4"
											key={assetReloadToken}
										>
											{uniqueBackgrounds.map((bgItem: string) => (
												<div
													key={bgItem}
													className="bg-surface/80 border border-kozu/40 rounded-lg overflow-hidden"
												>
													<Button
														onClick={() =>
															setPreviewBackground({
																name: bgItem,
																url: `${VITE_BACKEND_URL}/assets/story/backgrounds/${bgItem}.png?v=${assetReloadToken}`,
															})
														}
														variant="ghost"
														tone="text"
														size="sm"
														className="aspect-video w-full text-left bg-kozu/10 p-0 min-h-[140px]"
													>
														<img
															src={`${VITE_BACKEND_URL}/assets/story/backgrounds/${bgItem}.png?v=${assetReloadToken}`}
															alt={bgItem}
															className="w-full h-full object-cover"
															loading="lazy"
														/>
													</Button>
													<div className="flex items-center justify-between gap-2 px-2 py-1.5 text-xs text-kozu">
														<span className="truncate">{bgItem}</span>
														<Button
															onClick={() =>
																handleAssetDownload(
																	`${VITE_BACKEND_URL}/assets/story/backgrounds/${bgItem}.png`,
																	`${bgItem}.png`,
																)
															}
															variant="soft"
															tone="kozu"
															size="icon"
															className="rounded-full w-7 h-7 hover:bg-kozu/20"
															title="Download background"
														>
															<Download className="w-3.5 h-3.5" />
														</Button>
													</div>
												</div>
											))}
										</div>
									</div>
								)}
							</div>
						</>
					) : (
						<div className="bg-surface text-text rounded-lg border border-border p-4 max-h-96 overflow-y-auto">
							<pre className="whitespace-pre-wrap text-sm leading-6 font-mono">
								{selectedStory.storyText.rawContent || "No raw content found."}
							</pre>
						</div>
					)}
				</div>
			)}

			{selectedStory.relatedStories &&
				selectedStory.relatedStories.length > 0 && (
					<div className="mt-6 p-4 bg-hime/10 rounded-lg">
						<h4 className="text-lg font-medium text-hime mb-3 flex items-center gap-2">
							<List className="w-5 h-5 text-hime" />
							Related Stories
						</h4>
						<div className="grid gap-2">
							{selectedStory.relatedStories.map((relatedStory) => (
								<Button
									key={relatedStory.Id}
									onClick={() =>
										onRelatedStorySelect({
											table: "AdvDatas",
											Id: relatedStory.Id,
											Name: relatedStory.Name,
											Description: relatedStory.Description,
											ScriptId: relatedStory.ScriptId,
											storyType: "Adventure Story",
										})
									}
									variant="soft"
									tone="megu"
									size="sm"
									className="p-2 w-full justify-start text-left bg-surface hover:bg-border border border-border"
								>
									<div className="font-medium text-hime">
										Episode {relatedStory.OrderId}: {relatedStory.Name}
									</div>
									<div className="text-hime">{relatedStory.Description}</div>
								</Button>
							))}
						</div>
					</div>
				)}

			{selectedStory.storyText && !selectedStory.storyText.found && (
				<div className="mt-4 p-3 bg-kaho/20 border border-kaho/50 text-kaho rounded">
					Story text file not found: {selectedStory.storyText.error}
				</div>
			)}

			<AnimatePresence>
				{previewBackground && (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						className="fixed inset-0 bg-surface/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4"
						onClick={() => setPreviewBackground(null)}
					>
						<motion.div
							initial={{ scale: 0.96, opacity: 0 }}
							animate={{ scale: 1, opacity: 1 }}
							exit={{ scale: 0.96, opacity: 0 }}
							className="bg-surface/95 rounded-2xl border border-border/50/10 max-w-5xl w-full max-h-[85vh] overflow-hidden"
							onClick={(event) => event.stopPropagation()}
						>
							<div className="flex items-center justify-between p-4 border-b border-border">
								<div className="text-sm font-medium text-text truncate">
									{previewBackground.name}
								</div>
								<Button
									onClick={() => setPreviewBackground(null)}
									variant="soft"
									tone="megu"
									size="icon"
									className="rounded-full hover:bg-border/70"
								>
									<X className="w-5 h-5 text-text" />
								</Button>
							</div>
							<div className="p-4 bg-surface/5">
								<img
									src={previewBackground.url}
									alt={previewBackground.name}
									className="w-full h-full max-h-[70vh] object-contain rounded-lg"
								/>
							</div>
						</motion.div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
};

export default SelectedStoryDetailsSection;
