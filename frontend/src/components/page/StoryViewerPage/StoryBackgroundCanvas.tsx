import type React from "react";
import { useEffect, useRef } from "react";

interface StoryBackgroundCanvasProps {
	baseImageUrl: string;
	quote: string;
	name: string;
	onRendering?: (isRendering: boolean) => void;
}

const imageCache = new Map<string, HTMLImageElement>();

const StoryBackgroundCanvas: React.FC<StoryBackgroundCanvasProps> = ({
	baseImageUrl,
	quote,
	name,
	onRendering,
}) => {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const abortControllerRef = useRef<AbortController | null>(null);
	const lastRenderKeyRef = useRef<string | null>(null);

	useEffect(() => {
		const generateImage = async () => {
			if (canvasRef.current === null) {
				return;
			}

			const canvas = canvasRef.current;
			const context = canvas.getContext("2d");
			if (!context) {
				return;
			}

			if (abortControllerRef.current) {
				abortControllerRef.current.abort();
			}

			const abortController = new AbortController();
			abortControllerRef.current = abortController;

			if (baseImageUrl === "" || quote === "") {
				return;
			}

			const renderKey = `${baseImageUrl}::${quote}::${name}`;
			if (lastRenderKeyRef.current === renderKey) {
				return;
			}

			onRendering?.(true);

			let baseImage = imageCache.get(baseImageUrl);
			if (!baseImage) {
				baseImage = new Image();
				baseImage.src = baseImageUrl;
				baseImage.crossOrigin = "anonymous";
				imageCache.set(baseImageUrl, baseImage);
			}

			const render = () => {
				if (abortController.signal.aborted) {
					return;
				}

				context.clearRect(0, 0, canvas.width, canvas.height);
				context.drawImage(baseImage, 0, 0, 1920, 1080);

				context.font = "52px Klee One";
				context.fillStyle = "#e6e6e6";
				context.textAlign = "center";

				const textX: number = canvas.width / 2;
				let nameY: number = 0;

				const renderTextShadow = (text: string, x: number, y: number) => {
					const sizes = [3, 2.5, 2, 1.5, 1, 0.5];
					sizes.forEach((size) => {
						context.shadowColor = "#121311";
						[...Array(16)].forEach((_, i) => {
							const angle = i * (Math.PI / 8);
							const shadowX = (Math.cos(angle) * size).toFixed(2);
							const shadowY = (Math.sin(angle) * size).toFixed(2);
							context.shadowOffsetX = parseFloat(shadowX);
							context.shadowOffsetY = parseFloat(shadowY);
							context.fillText(text, x, y);
						});
					});
					context.shadowOffsetX = 0;
					context.shadowOffsetY = 0;
				};

				if (!quote.includes("\n")) {
					const textY = canvas.height * 0.855;
					renderTextShadow(quote, textX, textY);
					context.fillText(quote, textX, textY);
				} else {
					const [line1, line2] = quote.split("\n");
					const textY1 = canvas.height * 0.8;
					const textY2 = canvas.height * 0.856;
					renderTextShadow(line1, textX, textY1);
					context.fillText(line1, textX, textY1);
					renderTextShadow(line2, textX, textY2);
					context.fillText(line2, textX, textY2);
				}

				context.font = "38px Klee One";
				nameY = canvas.height * 0.932;
				renderTextShadow(`[${name}]`, textX, nameY);
				context.fillText(`[${name}]`, textX, nameY);

				lastRenderKeyRef.current = renderKey;
				onRendering?.(false);
			};

			const waitForImage = () =>
				new Promise<void>((resolve, reject) => {
					if (baseImage.complete && baseImage.naturalWidth > 0) {
						resolve();
						return;
					}
					baseImage.onload = () => resolve();
					baseImage.onerror = () => reject(new Error("Image load failed"));
				});

			try {
				await Promise.all([
					waitForImage(),
					document.fonts.load(`52px "Klee One"`, `${quote}${name}`),
					document.fonts.load(`38px "Klee One"`, `${quote}${name}`),
				]);
				if (!abortController.signal.aborted) {
					render();
				}
			} catch {
				if (!abortController.signal.aborted) {
					onRendering?.(false);
				}
			}
		};

		void generateImage();
	}, [baseImageUrl, quote, name, onRendering]);

	return (
		<canvas
			ref={canvasRef}
			width="1920"
			height="1080"
			className="w-full h-full"
		/>
	);
};

export default StoryBackgroundCanvas;
