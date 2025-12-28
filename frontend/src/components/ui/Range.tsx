import type React from "react";
import { twMerge } from "tailwind-merge";

type RangeSize = "sm" | "md";

type RangeProps = Omit<
	React.InputHTMLAttributes<HTMLInputElement>,
	"type" | "onChange" | "size"
> & {
	value: number;
	min?: number;
	max?: number;
	step?: number;
	onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
	size?: RangeSize;
	showThumb?: boolean;
	trackClassName?: string;
	fillClassName?: string;
	thumbClassName?: string;
};

const sizeStyles: Record<
	RangeSize,
	{ track: string; thumb: string; inputHeight: string }
> = {
	sm: { track: "h-1", thumb: "w-2.5 h-2.5", inputHeight: "h-5" },
	md: { track: "h-1.5", thumb: "w-3.5 h-3.5", inputHeight: "h-6" },
};

const Range: React.FC<RangeProps> = ({
	value,
	min = 0,
	max = 100,
	step = 1,
	onChange,
	size = "md",
	showThumb = true,
	className,
	trackClassName,
	fillClassName,
	thumbClassName,
	...rest
}) => {
	const progress = max > min ? ((value - min) / (max - min)) * 100 : 0;
	const clamped = Math.min(100, Math.max(0, progress));
	const styles = sizeStyles[size];

	return (
		<div className={twMerge("relative group", className)}>
			<div className="relative py-2 -my-2">
				<div className="w-full bg-transparent rounded-full relative flex items-center">
					<div
						className={twMerge(
							`w-full ${styles.track} bg-surface/60 ring-1 ring-border/40 rounded-full relative overflow-hidden transition-all duration-200`,
							trackClassName,
						)}
					>
						<div
							className={twMerge(
								"absolute inset-y-0 left-0 bg-gradient-to-r from-saya via-gin to-izu rounded-full transition-all duration-100 ease-linear",
								fillClassName,
							)}
							style={{ width: `${clamped}%` }}
						/>
						<input
							type="range"
							min={min}
							max={max}
							step={step}
							value={value}
							onChange={onChange}
							className={twMerge(
								`absolute inset-0 w-full ${styles.inputHeight} opacity-0 cursor-pointer z-10`,
							)}
							style={{
								margin: 0,
								padding: 0,
								transform: "translateY(-50%)",
								top: "50%",
							}}
							{...rest}
						/>
					</div>
				</div>
				{showThumb && (
					<div
						className={twMerge(
							`absolute top-1/2 ${styles.thumb} bg-surface rounded-sm ring-2 ring-saya transform -translate-y-1/2 -translate-x-1/2 transition-all duration-200 ease-linear pointer-events-none`,
							thumbClassName,
						)}
						style={{ left: `${clamped}%` }}
					/>
				)}
			</div>
		</div>
	);
};

export default Range;
