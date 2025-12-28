import { useVirtualizer } from "@tanstack/react-virtual";
import type React from "react";
import { useEffect, useMemo, useRef } from "react";

interface VirtualLogViewerProps {
	logText: string;
	isStreaming?: boolean;
	className?: string;
}

const VirtualLogViewer: React.FC<VirtualLogViewerProps> = ({
	logText,
	isStreaming = false,
	className = "",
}) => {
	const parentRef = useRef<HTMLDivElement>(null);

	// テキストを行に分割
	const lines = useMemo(() => {
		if (!logText) return [];
		return logText.split("\n");
	}, [logText]);

	// 仮想スクロール設定
	const virtualizer = useVirtualizer({
		count: lines.length,
		getScrollElement: () => parentRef.current,
		estimateSize: () => 20, // text-xs + py-0.5 で約20px
		overscan: 50, // 50行分先読み
	});

	// 自動スクロール（ストリーミング中のみ）
	useEffect(() => {
		const logLength = logText.length;
		if (isStreaming && parentRef.current) {
			const scrollElement = parentRef.current;
			scrollElement.scrollTop = scrollElement.scrollHeight;
		}
		void logLength;
	}, [logText, isStreaming]);

	return (
		<div
			ref={parentRef}
			className={`overflow-auto ${className}`}
			style={{
				height: "100%",
				maxHeight: "24rem", // max-h-96 (24 * 1rem = 384px)
			}}
		>
			<div
				style={{
					height: `${virtualizer.getTotalSize()}px`,
					width: "100%",
					position: "relative",
				}}
			>
				{virtualizer.getVirtualItems().map((virtualItem) => (
					<div
						key={virtualItem.index}
						style={{
							position: "absolute",
							top: 0,
							left: 0,
							width: "100%",
							height: `${virtualItem.size}px`,
							transform: `translateY(${virtualItem.start}px)`,
						}}
					>
						<div className="min-w-max px-2 py-0.5 font-mono text-xs text-kozu whitespace-pre">
							{lines[virtualItem.index] || ""}
						</div>
					</div>
				))}
			</div>
		</div>
	);
};

export default VirtualLogViewer;
