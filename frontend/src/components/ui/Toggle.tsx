import { motion } from "framer-motion";
import type React from "react";
import { twMerge } from "tailwind-merge";

type ToggleSize = "sm" | "md";

type ToggleProps = {
	checked: boolean;
	onChange: (checked: boolean) => void;
	disabled?: boolean;
	size?: ToggleSize;
	className?: string;
};

const sizeClasses: Record<ToggleSize, { track: string; knob: string }> = {
	sm: { track: "h-5 w-9", knob: "h-3 w-3" },
	md: { track: "h-6 w-11", knob: "h-4 w-4" },
};

const Toggle: React.FC<ToggleProps> = ({
	checked,
	onChange,
	disabled = false,
	size = "sm",
	className,
}) => {
	return (
		<button
			type="button"
			onClick={() => onChange(!checked)}
			disabled={disabled}
			aria-pressed={checked}
			className={twMerge(
				"relative inline-flex items-center rounded-full transition-colors duration-200 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50",
				checked ? "bg-muted/30" : "bg-muted/15",
				sizeClasses[size].track,
				className,
			)}
		>
			<motion.span
				animate={{ x: checked ? 20 : 4 }}
				transition={{ type: "spring", stiffness: 500, damping: 30 }}
				className={twMerge(
					"inline-block rounded-full shadow-sm bg-text",
					sizeClasses[size].knob,
				)}
			/>
		</button>
	);
};

export default Toggle;
