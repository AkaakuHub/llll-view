import { useCallback, useEffect, useRef, useState } from "react";

type TranscriptionAvailability =
	| "checking"
	| "unsupported"
	| "available"
	| "downloadable"
	| "downloading"
	| "unavailable";

type LanguageModelSession = {
	prompt: (
		messages: Array<{
			role: "user";
			content: Array<
				{ type: "text"; value: string } | { type: "audio"; value: Blob }
			>;
		}>,
	) => Promise<string>;
};

type LanguageModelApi = {
	availability?: () => Promise<
		"available" | "downloadable" | "downloading" | "unavailable"
	>;
	create: (options: {
		expectedInputs: Array<
			{ type: "text"; languages?: string[] } | { type: "audio" }
		>;
		expectedOutputs: Array<{ type: "text"; languages?: string[] }>;
		monitor?: (monitor: {
			addEventListener: (
				type: "downloadprogress",
				listener: (event: { loaded: number }) => void,
			) => void;
		}) => void;
	}) => Promise<LanguageModelSession>;
};

const getLanguageModelApi = () => {
	if (typeof globalThis === "undefined") return null;
	if (!("LanguageModel" in globalThis)) return null;
	return (globalThis as unknown as { LanguageModel: LanguageModelApi })
		.LanguageModel;
};

const useTranscription = () => {
	const [availability, setAvailability] =
		useState<TranscriptionAvailability>("checking");
	const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
	const [isTranscribing, setIsTranscribing] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [transcript, setTranscript] = useState<string>("");
	const inFlightRef = useRef(0);

	useEffect(() => {
		const api = getLanguageModelApi();
		if (!api) {
			console.warn(
				"[useTranscription] LanguageModel API not found on globalThis.",
			);
			setAvailability("unsupported");
			return;
		}
		if (!api.availability) {
			console.warn("[useTranscription] LanguageModel.availability missing.");
			setAvailability("available");
			setDownloadProgress(null);
			return;
		}
		api
			.availability()
			.then((status) => {
				console.log(`[useTranscription] Availability: ${status}`);
				setAvailability(status);
				setDownloadProgress(null);
			})
			.catch((err) => {
				console.warn("[useTranscription] Availability check failed:", err);
				setAvailability("unavailable");
			});
	}, []);

	const transcribeAudio = useCallback(async (audioUrl: string) => {
		const api = getLanguageModelApi();
		if (!api) {
			console.warn(
				"[useTranscription] LanguageModel API not found when transcribing.",
			);
			setAvailability("unsupported");
			return null;
		}
		console.log(`[useTranscription] Fetching audio: ${audioUrl}`);
		setIsTranscribing(true);
		setError(null);
		setDownloadProgress(null);
		inFlightRef.current += 1;
		const requestId = inFlightRef.current;
		try {
			const res = await fetch(audioUrl);
			if (!res.ok) {
				throw new Error(`Failed to fetch audio: ${res.status}`);
			}
			const audioBlob = await res.blob();
			console.log("[useTranscription] Creating LanguageModel session.");
			const session = await api.create({
				expectedInputs: [
					{ type: "text", languages: ["ja"] },
					{ type: "audio" },
				],
				expectedOutputs: [{ type: "text", languages: ["ja"] }],
				monitor(monitor) {
					monitor.addEventListener("downloadprogress", (event) => {
						const percent = Math.round(event.loaded * 100);
						console.log(`[useTranscription] Download progress: ${percent}%`);
						setAvailability("downloading");
						setDownloadProgress(percent);
					});
				},
			});
			const text = await session.prompt([
				{
					role: "user",
					content: [
						{
							type: "text",
							value:
								"次の音声を日本語で正確に文字起こししてください。不要な要約はしないでください。",
						},
						{ type: "audio", value: audioBlob },
					],
				},
			]);
			if (inFlightRef.current === requestId) {
				setTranscript(text.trim());
				setAvailability("available");
				setDownloadProgress(null);
			}
			return text;
		} catch (err) {
			if (inFlightRef.current === requestId) {
				setAvailability("unavailable");
				setError(err instanceof Error ? err.message : "Transcription failed");
			}
			return null;
		} finally {
			if (inFlightRef.current === requestId) {
				setIsTranscribing(false);
			}
		}
	}, []);

	const prepareModel = useCallback(async () => {
		const api = getLanguageModelApi();
		if (!api) {
			setAvailability("unsupported");
			return false;
		}
		if (!api.availability) {
			setAvailability("available");
			return true;
		}
		try {
			const status = await api.availability();
			setAvailability(status);
			if (status !== "downloadable") return status === "available";
			await api.create({
				expectedInputs: [
					{ type: "text", languages: ["ja"] },
					{ type: "audio" },
				],
				expectedOutputs: [{ type: "text", languages: ["ja"] }],
				monitor(monitor) {
					monitor.addEventListener("downloadprogress", (event) => {
						const percent = Math.round(event.loaded * 100);
						console.log(`[useTranscription] Download progress: ${percent}%`);
						setAvailability("downloading");
						setDownloadProgress(percent);
					});
				},
			});
			setAvailability("available");
			setDownloadProgress(null);
			return true;
		} catch (err) {
			setAvailability("unavailable");
			setError(err instanceof Error ? err.message : "Model prepare failed");
			return false;
		}
	}, []);

	const clearTranscript = useCallback(() => {
		setTranscript("");
		setError(null);
	}, []);

	return {
		availability,
		downloadProgress,
		isTranscribing,
		error,
		transcript,
		transcribeAudio,
		prepareModel,
		clearTranscript,
	};
};

export default useTranscription;
