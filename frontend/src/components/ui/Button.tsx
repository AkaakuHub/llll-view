import { type HTMLMotionProps, motion } from "framer-motion";
import type React from "react";
import { twMerge } from "tailwind-merge";

type ButtonVariant = "solid" | "soft" | "ghost" | "outline";
type ButtonTone =
	| "kaho"
	| "saya"
	| "kozu"
	| "tuzu"
	| "hime"
	| "suzu"
	| "ruri"
	| "megu"
	| "gin"
	| "sera"
	| "izu"
	| "text";
type ButtonSize = "sm" | "md" | "lg" | "icon";

type BaseProps = {
	variant?: ButtonVariant;
	tone?: ButtonTone;
	size?: ButtonSize;
	loading?: boolean;
	className?: string;
	children?: React.ReactNode;
};

type NativeButtonProps = Omit<
	React.ButtonHTMLAttributes<HTMLButtonElement>,
	"children"
> &
	BaseProps & { asMotion?: false };

type MotionButtonProps = Omit<HTMLMotionProps<"button">, "children"> &
	BaseProps & { asMotion: true };

type ButtonProps = NativeButtonProps | MotionButtonProps;

const sizeClasses: Record<ButtonSize, string> = {
	sm: "px-3 py-1.5 text-sm",
	md: "px-4 py-2 text-sm",
	lg: "px-5 py-2.5 text-base",
	icon: "h-10 w-10 p-2",
};

const toneVariantClasses: Record<ButtonVariant, Record<ButtonTone, string>> = {
	solid: {
		kaho: "bg-kaho text-text hover:bg-kaho/80",
		saya: "bg-saya text-text hover:bg-saya/80",
		kozu: "bg-kozu text-text hover:bg-kozu/80",
		tuzu: "bg-tuzu text-text hover:bg-tuzu/80",
		hime: "bg-hime text-text hover:bg-hime/80",
		suzu: "bg-suzu text-text hover:bg-suzu/80",
		ruri: "bg-ruri text-text hover:bg-ruri/80",
		megu: "bg-megu text-text hover:bg-megu/80",
		gin: "bg-gin text-text hover:bg-gin/80",
		sera: "bg-sera text-text hover:bg-sera/80",
		izu: "bg-izu text-text hover:bg-izu/80",
		text: "bg-text text-surface hover:bg-text/80",
	},
	soft: {
		kaho: "bg-kaho/30 text-kaho hover:bg-kaho/40",
		saya: "bg-saya/30 text-saya hover:bg-saya/40",
		kozu: "bg-kozu/30 text-kozu hover:bg-kozu/40",
		tuzu: "bg-tuzu/30 text-tuzu hover:bg-tuzu/40",
		hime: "bg-hime/30 text-hime hover:bg-hime/40",
		suzu: "bg-suzu/30 text-suzu hover:bg-suzu/40",
		ruri: "bg-ruri/30 text-ruri hover:bg-ruri/40",
		megu: "bg-megu/30 text-megu hover:bg-megu/40",
		gin: "bg-gin/30 text-gin hover:bg-gin/40",
		sera: "bg-sera/30 text-sera hover:bg-sera/40",
		izu: "bg-izu/30 text-izu hover:bg-izu/40",
		text: "bg-surface text-text hover:bg-surface/80",
	},
	ghost: {
		kaho: "bg-transparent text-kaho hover:bg-surface/80",
		saya: "bg-transparent text-saya hover:bg-surface/80",
		kozu: "bg-transparent text-kozu hover:bg-surface/80",
		tuzu: "bg-transparent text-tuzu hover:bg-surface/80",
		hime: "bg-transparent text-hime hover:bg-surface/80",
		suzu: "bg-transparent text-suzu hover:bg-surface/80",
		ruri: "bg-transparent text-ruri hover:bg-surface/80",
		megu: "bg-transparent text-megu hover:bg-surface/80",
		gin: "bg-transparent text-gin hover:bg-surface/80",
		sera: "bg-transparent text-sera hover:bg-surface/80",
		izu: "bg-transparent text-izu hover:bg-surface/80",
		text: "bg-transparent text-text hover:bg-surface/80",
	},
	outline: {
		kaho: "border border-border text-kaho hover:bg-surface/80",
		saya: "border border-border text-saya hover:bg-surface/80",
		kozu: "border border-border text-kozu hover:bg-surface/80",
		tuzu: "border border-border text-tuzu hover:bg-surface/80",
		hime: "border border-border text-hime hover:bg-surface/80",
		suzu: "border border-border text-suzu hover:bg-surface/80",
		ruri: "border border-border text-ruri hover:bg-surface/80",
		megu: "border border-border text-megu hover:bg-surface/80",
		gin: "border border-border text-gin hover:bg-surface/80",
		sera: "border border-border text-sera hover:bg-surface/80",
		izu: "border border-border text-izu hover:bg-surface/80",
		text: "border border-border text-text hover:bg-surface/80",
	},
};

const baseClasses =
	"inline-flex items-center justify-center gap-2 rounded-lg select-none transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saya focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:opacity-50 disabled:cursor-not-allowed";

const joinClasses = (...parts: Array<string | undefined | false>) =>
	twMerge(...parts.filter(Boolean));

const Button = (props: ButtonProps) => {
	const {
		variant = "solid",
		tone = "saya",
		size = "md",
		loading = false,
		asMotion = false,
		className,
		disabled,
		type,
		children,
		...rest
	} = props;

	const isDisabled = disabled || loading;
	const classes = joinClasses(
		baseClasses,
		sizeClasses[size],
		toneVariantClasses[variant][tone],
		className,
	);

	if (asMotion) {
		return (
			<motion.button
				type={type ?? "button"}
				disabled={isDisabled}
				aria-busy={loading || undefined}
				className={classes}
				{...(rest as HTMLMotionProps<"button">)}
			>
				{loading && (
					<span
						aria-hidden="true"
						className="h-4 w-4 animate-spin rounded-full border-2 border-text/40 border-t-text"
					/>
				)}
				{children}
			</motion.button>
		);
	}

	return (
		<button
			type={type ?? "button"}
			disabled={isDisabled}
			aria-busy={loading || undefined}
			className={classes}
			{...(rest as React.ButtonHTMLAttributes<HTMLButtonElement>)}
		>
			{loading && (
				<span
					aria-hidden="true"
					className="h-4 w-4 animate-spin rounded-full border-2 border-text/40 border-t-text"
				/>
			)}
			{children}
		</button>
	);
};

export default Button;
