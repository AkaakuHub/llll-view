import { useCallback, useEffect, useState } from "react";

export type ThemeMode = "light" | "dark" | "system";

interface UseThemeReturn {
	theme: ThemeMode;
	resolvedTheme: "light" | "dark";
	setTheme: (theme: ThemeMode) => void;
}

export function useTheme(): UseThemeReturn {
	const [theme, setThemeState] = useState<ThemeMode>("system");
	const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");

	// Get system preference
	const getSystemTheme = useCallback((): "light" | "dark" => {
		if (typeof window === "undefined") return "light";
		return window.matchMedia("(prefers-color-scheme: dark)").matches
			? "dark"
			: "light";
	}, []);

	// Apply theme to DOM
	const applyTheme = useCallback((theme: "light" | "dark") => {
		if (theme === "dark") {
			document.documentElement.classList.add("dark");
		} else {
			document.documentElement.classList.remove("dark");
		}
	}, []);

	// Initialize theme from localStorage or system preference
	useEffect(() => {
		const storedTheme = localStorage.getItem("theme") as ThemeMode | null;
		const initialTheme = storedTheme || "system";
		setThemeState(initialTheme);

		// Resolve the actual theme
		const resolved =
			initialTheme === "system"
				? getSystemTheme()
				: (initialTheme as "light" | "dark");
		setResolvedTheme(resolved);
		applyTheme(resolved);
	}, [applyTheme, getSystemTheme]);

	// Handle theme changes
	const setTheme = (newTheme: ThemeMode) => {
		setThemeState(newTheme);
		localStorage.setItem("theme", newTheme);

		// Resolve and apply the theme
		const resolved =
			newTheme === "system" ? getSystemTheme() : (newTheme as "light" | "dark");
		setResolvedTheme(resolved);
		applyTheme(resolved);
	};

	// Listen for system theme changes when in system mode
	useEffect(() => {
		if (theme !== "system") return;

		const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
		const handleChange = (e: MediaQueryListEvent) => {
			const newTheme = e.matches ? "dark" : "light";
			setResolvedTheme(newTheme);
			applyTheme(newTheme);
		};

		// Modern browsers
		if (mediaQuery.addEventListener) {
			mediaQuery.addEventListener("change", handleChange);
			return () => mediaQuery.removeEventListener("change", handleChange);
		}
		// Legacy browsers
		else if (mediaQuery.addListener) {
			mediaQuery.addListener(handleChange);
			return () => mediaQuery.removeListener(handleChange);
		}
	}, [theme, applyTheme]);

	return {
		theme,
		resolvedTheme,
		setTheme,
	};
}
