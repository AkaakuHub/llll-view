import { DownloadCloud, Languages } from "lucide-react";
import type React from "react";
import type { TranslatorAvailability } from "../../hooks/useTranslation";
import type { LanguageCode } from "../../lib/characterTranslations";
import Button from "./Button";

type LanguageOption = {
	value: LanguageCode;
	label: string;
	subtitle: string;
};

type TranslationToolbarProps = {
	languages: LanguageOption[];
	selectedLanguage: LanguageCode;
	onSelectLanguage: (value: LanguageCode) => void;
	isTranslationActive: boolean;
	availability: TranslatorAvailability;
	downloadProgress: number | null;
	isTranslating: boolean;
	isBatchTranslating: boolean;
	translatedCount: number;
	totalCount: number;
	errorMessage: string | null;
	onPrepareDownload: () => void;
	onTranslateAll: () => void;
};

const TranslationToolbar: React.FC<TranslationToolbarProps> = ({
	languages,
	selectedLanguage,
	onSelectLanguage,
	isTranslationActive,
	availability,
	downloadProgress,
	isTranslating,
	isBatchTranslating,
	translatedCount,
	totalCount,
	errorMessage,
	onPrepareDownload,
	onTranslateAll,
}) => {
	const canTranslate =
		availability === "available" || availability === "downloadable";
	const canDownload = availability === "downloadable";
	const statusLabel = isTranslationActive
		? (() => {
				switch (availability) {
					case "available":
						return "Chrome Translator: available";
					case "downloadable":
						return "Chrome Translator: downloadable";
					case "unsupported":
						return "Chrome Translator: unsupported";
					case "unavailable":
						return "Chrome Translator: unavailable";
					default:
						return "Chrome Translator: checking";
				}
			})()
		: "Original (no translation)";

	return (
		<div className="rounded-xl border border-border bg-surface/90 px-3 py-2">
			<div className="flex items-center gap-3 flex-nowrap overflow-x-auto py-1">
				<div className="flex items-center gap-2 shrink-0">
					<span className="text-xs font-semibold uppercase tracking-wide text-muted whitespace-nowrap">
						Language
					</span>
					<div className="flex items-center gap-1 rounded-full bg-border/70 p-1">
						{languages.map((lang) => (
							<Button
								key={lang.value}
								onClick={() => onSelectLanguage(lang.value)}
								variant={selectedLanguage === lang.value ? "solid" : "ghost"}
								tone={selectedLanguage === lang.value ? "saya" : "text"}
								size="sm"
								className="rounded-full px-3"
								title={`${lang.label} · ${lang.subtitle}`}
							>
								{lang.label}
							</Button>
						))}
					</div>
				</div>
				{isTranslationActive && (
					<div className="flex items-center gap-2 shrink-0">
						{canDownload && (
							<Button
								onClick={onPrepareDownload}
								variant="soft"
								tone="kozu"
								size="sm"
								className="rounded-full whitespace-nowrap"
							>
								<DownloadCloud className="w-4 h-4" />
								Download model
							</Button>
						)}
						<Button
							onClick={onTranslateAll}
							variant="soft"
							tone="saya"
							size="sm"
							disabled={!canTranslate || isTranslating || isBatchTranslating}
							className="rounded-full whitespace-nowrap"
						>
							<Languages className="w-4 h-4" />
							{isBatchTranslating ? "Translating..." : "Translate now"}
						</Button>
					</div>
				)}
				<div className="ml-auto flex items-center gap-2 text-xs text-muted whitespace-nowrap">
					<span>{statusLabel}</span>
					{isTranslationActive && (
						<span>
							{translatedCount}/{totalCount} lines
						</span>
					)}
					{downloadProgress !== null && <span>DL {downloadProgress}%</span>}
					{errorMessage && <span className="text-tuzu">{errorMessage}</span>}
				</div>
			</div>
		</div>
	);
};

export default TranslationToolbar;
