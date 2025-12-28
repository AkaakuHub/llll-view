import * as React from "react";
import { twMerge } from "tailwind-merge";

type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
	({ className, type = "text", ...rest }, ref) => {
		return (
			<input
				ref={ref}
				type={type}
				className={twMerge(
					"w-full px-3 py-2 bg-surface border border-border rounded-lg text-text placeholder-muted focus:outline-none focus:ring-2 focus:ring-saya focus:border-transparent",
					className,
				)}
				{...rest}
			/>
		);
	},
);

Input.displayName = "Input";

export default Input;
