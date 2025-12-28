import type React from "react";
import AudioConverter from "../components/page/AudioConverterPage/AudioConverter";

const AudioConverterPage: React.FC = () => {
	return (
		<div className="min-h-screen-safe bg-surface p-6 transition-colors duration-300">
			<div className="max-w-6xl mx-auto">
				<div className="mb-8">
					<h1 className="text-3xl font-bold text-text mb-2">Audio Converter</h1>
				</div>

				<AudioConverter />
			</div>
		</div>
	);
};

export default AudioConverterPage;
