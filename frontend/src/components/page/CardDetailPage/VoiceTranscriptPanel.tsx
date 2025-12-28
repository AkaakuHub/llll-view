import { FileText } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import useTranscription from "../../../hooks/useTranscription";
import useTranslation from "../../../hooks/useTranslation";
import type { LanguageCode } from "../../../lib/characterTranslations";
import { VITE_BACKEND_URL } from "../../../lib/const";
import Button from "../../ui/Button";
import TranslationToolbar from "../../ui/TranslationToolbar";
import type { VoiceFile } from "./types";

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

type VoiceTranscriptPanelProps = {
	currentVoiceFile: VoiceFile | null;
	onConvert: (voiceFile: VoiceFile) => Promise<void>;
};

const VoiceTranscriptPanel: React.FC<VoiceTranscriptPanelProps> = ({
	currentVoiceFile,
	onConvert,
}) => {
	const [selectedLanguage, setSelectedLanguage] = useState<LanguageCode>("ja");
	const [translationsByLanguage, setTranslationsByLanguage] = useState<
		Partial<Record<LanguageCode, string>>
	>({});
	const [isPreparing, setIsPreparing] = useState(false);
	const isTranslationActive = selectedLanguage !== "ja";
	const {
		availability: transcriptionAvailability,
		downloadProgress: transcriptionDownloadProgress,
		isTranscribing,
		error: transcriptionError,
		transcript,
		transcribeAudio,
		prepareModel,
		clearTranscript,
	} = useTranscription();
	const {
		availability: translationAvailability,
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

	const translatedText = translationsByLanguage[selectedLanguage] ?? "";
	const totalCount = transcript ? 1 : 0;
	const translatedCount = translatedText ? 1 : 0;

	useEffect(() => {
		const voiceType = currentVoiceFile?.type;
		clearTranscript();
		setTranslationsByLanguage({});
		setSelectedLanguage("ja");
		clearError();
		if (!voiceType) {
			return;
		}
	}, [currentVoiceFile?.type, clearTranscript, clearError]);

	const handleTranslate = useCallback(async () => {
		if (!isTranslationActive || !transcript.trim()) return;
		if (translatedText) return;
		const translated = await translateText(transcript);
		if (translated) {
			setTranslationsByLanguage((prev) => ({
				...prev,
				[selectedLanguage]: translated,
			}));
		}
	}, [
		isTranslationActive,
		selectedLanguage,
		transcript,
		translateText,
		translatedText,
	]);

	useEffect(() => {
		if (!isTranslationActive || !transcript.trim()) return;
		if (translatedText) return;
		if (isTranslating) return;
		void handleTranslate();
	}, [
		handleTranslate,
		isTranslationActive,
		isTranslating,
		transcript,
		translatedText,
	]);

	const displayedText = useMemo(() => {
		if (!transcript) return "";
		if (!isTranslationActive) return transcript;
		if (translatedText) return translatedText;
		if (isTranslating) return "Translating...";
		return "Translation not ready";
	}, [isTranslationActive, isTranslating, transcript, translatedText]);

	const transcriptionStatus = (() => {
		switch (transcriptionAvailability) {
			case "available":
				return "Chrome Prompt: available";
			case "downloadable":
				return "Chrome Prompt: downloadable";
			case "downloading":
				return "Chrome Prompt: downloading";
			case "unsupported":
				return "Chrome Prompt: unsupported";
			case "unavailable":
				return "Chrome Prompt: unavailable";
			default:
				return "Chrome Prompt: checking";
		}
	})();

	const handleTranscribe = async () => {
		if (!currentVoiceFile) return;
		if (!currentVoiceFile.converted) {
			setIsPreparing(true);
			await onConvert(currentVoiceFile);
			setIsPreparing(false);
		}
		const audioUrl = `${VITE_BACKEND_URL}${currentVoiceFile.url}`;
		await transcribeAudio(audioUrl);
	};

	if (!currentVoiceFile) {
		return (
			<div className="bg-border/60 rounded-lg p-4 text-sm text-muted">
				Select a voice to transcribe
			</div>
		);
	}

	return (
		<div className="bg-surface rounded-lg p-4 border border-border">
			<div className="flex flex-wrap items-center justify-between gap-3 mb-3">
				<div className="flex items-center gap-2">
					<FileText className="h-5 w-5 text-muted" />
					<h3 className="text-base font-semibold text-text">Transcript</h3>
				</div>
				{transcriptionAvailability === "downloadable" && (
					<Button
						onClick={() => {
							void prepareModel();
						}}
						variant="soft"
						tone="kozu"
						size="sm"
						className="cursor-pointer"
					>
						Download model
					</Button>
				)}
				<Button
					onClick={handleTranscribe}
					disabled={isTranscribing || isPreparing}
					variant="solid"
					tone="saya"
					size="sm"
					className="cursor-pointer shadow-sm hover:bg-saya/80"
				>
					{isPreparing
						? "Preparing..."
						: isTranscribing
							? "Transcribing..."
							: transcript
								? "Re-transcribe"
								: "Transcribe"}
				</Button>
			</div>

			<TranslationToolbar
				languages={languageOptions}
				selectedLanguage={selectedLanguage}
				onSelectLanguage={setSelectedLanguage}
				isTranslationActive={isTranslationActive}
				availability={translationAvailability}
				downloadProgress={downloadProgress}
				isTranslating={isTranslating}
				isBatchTranslating={false}
				translatedCount={translatedCount}
				totalCount={totalCount}
				errorMessage={translationError}
				onPrepareDownload={() => {
					void prepareTranslator();
				}}
				onTranslateAll={handleTranslate}
			/>

			<div className="mt-3 rounded-lg border border-border bg-border/40 p-3">
				{transcript ? (
					<p className="text-sm text-text whitespace-pre-wrap leading-6">
						{displayedText}
					</p>
				) : (
					<p className="text-sm text-muted">
						No transcript yet. Click Transcribe to generate Japanese text.
					</p>
				)}
			</div>

			<div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
				<span>{transcriptionStatus}</span>
				{transcriptionDownloadProgress !== null && (
					<span>Download {transcriptionDownloadProgress}%</span>
				)}
				{transcriptionError && (
					<span className="text-tuzu">{transcriptionError}</span>
				)}
			</div>
		</div>
	);
};

export default VoiceTranscriptPanel;
