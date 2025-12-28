import { useCallback, useEffect, useRef, useState } from "react";

type TranslatorAvailability =
	| "checking"
	| "unsupported"
	| "available"
	| "downloadable"
	| "unavailable";

type TranslatorStatus = "available" | "downloadable" | "unavailable";

type TranslatorMonitor = {
	addEventListener: (
		type: "downloadprogress",
		listener: (event: { loaded: number }) => void,
	) => void;
};

type TranslatorInstance = {
	ready: Promise<void>;
	translate: (text: string) => Promise<string>;
};

type TranslatorApi = {
	availability: (options: {
		sourceLanguage: string;
		targetLanguage: string;
	}) => Promise<TranslatorStatus>;
	create: (options: {
		sourceLanguage: string;
		targetLanguage: string;
		monitor?: (monitor: TranslatorMonitor) => void;
	}) => Promise<TranslatorInstance>;
};

type UseTranslationOptions = {
	sourceLanguage: string;
	targetLanguage: string;
	enabled?: boolean;
};

type TranslatorRef = {
	sourceLanguage: string;
	targetLanguage: string;
	instance: TranslatorInstance;
};

const getTranslatorApi = () => {
	if (typeof globalThis === "undefined") return null;
	if (!("Translator" in globalThis)) return null;
	return (globalThis as unknown as { Translator: TranslatorApi }).Translator;
};

const useTranslation = ({
	sourceLanguage,
	targetLanguage,
	enabled = true,
}: UseTranslationOptions) => {
	const translatorRef = useRef<TranslatorRef | null>(null);
	const [availability, setAvailability] =
		useState<TranslatorAvailability>("checking");
	const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [isTranslating, setIsTranslating] = useState(false);

	useEffect(() => {
		let isMounted = true;

		const checkAvailability = async () => {
			if (!enabled) {
				if (isMounted) {
					setAvailability("unsupported");
					setDownloadProgress(null);
				}
				return;
			}
			const translatorApi = getTranslatorApi();
			if (!translatorApi) {
				console.warn(
					"[useTranslation] Translator API not found on globalThis. " +
						"Chrome built-in Translator may be unsupported in this environment.",
				);
				if (isMounted) {
					setAvailability("unsupported");
				}
				return;
			}
			try {
				const status = await translatorApi.availability({
					sourceLanguage,
					targetLanguage,
				});
				if (isMounted) {
					setAvailability(status);
					console.log(
						`[useTranslation] Availability: ${status} for ${sourceLanguage} -> ${targetLanguage}`,
					);
				}
			} catch (err) {
				if (isMounted) {
					setAvailability("unavailable");
					setError(
						err instanceof Error ? err.message : "Translator check failed",
					);
					console.warn("[useTranslation] Availability check failed:", err);
				}
			}
		};

		void checkAvailability();

		return () => {
			isMounted = false;
		};
	}, [sourceLanguage, targetLanguage, enabled]);

	const translateText = useCallback(
		async (text: string) => {
			if (!text.trim()) return null;
			if (!enabled) return null;

			const translatorApi = getTranslatorApi();
			if (!translatorApi) {
				setAvailability("unsupported");
				return null;
			}

			if (availability === "unavailable") return null;

			setIsTranslating(true);
			setError(null);

			try {
				if (
					!translatorRef.current ||
					translatorRef.current.sourceLanguage !== sourceLanguage ||
					translatorRef.current.targetLanguage !== targetLanguage
				) {
					const instance = await translatorApi.create({
						sourceLanguage,
						targetLanguage,
						monitor(monitor) {
							monitor.addEventListener("downloadprogress", (event) => {
								setDownloadProgress(Math.round(event.loaded * 100));
								console.log(
									`[useTranslation] Download progress: ${Math.round(event.loaded * 100)}%`,
								);
							});
						},
					});
					await instance.ready;
					translatorRef.current = {
						sourceLanguage,
						targetLanguage,
						instance,
					};
				}

				const translated = await translatorRef.current.instance.translate(text);
				return translated;
			} catch (err) {
				setError(err instanceof Error ? err.message : "Translation failed");
				return null;
			} finally {
				setIsTranslating(false);
			}
		},
		[availability, sourceLanguage, targetLanguage, enabled],
	);

	const prepareTranslator = useCallback(async () => {
		if (!enabled) return false;
		const translatorApi = getTranslatorApi();
		if (!translatorApi) {
			setAvailability("unsupported");
			return false;
		}
		if (availability === "unavailable") return false;
		setError(null);
		try {
			if (
				!translatorRef.current ||
				translatorRef.current.sourceLanguage !== sourceLanguage ||
				translatorRef.current.targetLanguage !== targetLanguage
			) {
				const instance = await translatorApi.create({
					sourceLanguage,
					targetLanguage,
					monitor(monitor) {
						monitor.addEventListener("downloadprogress", (event) => {
							setDownloadProgress(Math.round(event.loaded * 100));
							console.log(
								`[useTranslation] Download progress: ${Math.round(event.loaded * 100)}%`,
							);
						});
					},
				});
				await instance.ready;
				translatorRef.current = {
					sourceLanguage,
					targetLanguage,
					instance,
				};
			}
			setAvailability("available");
			return true;
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "Translator prepare failed",
			);
			return false;
		}
	}, [availability, sourceLanguage, targetLanguage, enabled]);

	const clearError = useCallback(() => {
		setError(null);
	}, []);

	return {
		availability,
		downloadProgress,
		error,
		isTranslating,
		translateText,
		prepareTranslator,
		clearError,
	};
};

export type { TranslatorAvailability };
export default useTranslation;
