import type React from "react";
import { createContext, useContext } from "react";

type SidebarToggleContextValue = {
	toggleSidebar: () => void;
};

const SidebarToggleContext = createContext<
	SidebarToggleContextValue | undefined
>(undefined);

type SidebarToggleProviderProps = {
	toggleSidebar: () => void;
	children: React.ReactNode;
};

export const SidebarToggleProvider = ({
	toggleSidebar,
	children,
}: SidebarToggleProviderProps) => (
	<SidebarToggleContext.Provider value={{ toggleSidebar }}>
		{children}
	</SidebarToggleContext.Provider>
);

export const useSidebarToggle = () => {
	const context = useContext(SidebarToggleContext);
	if (!context) {
		return { toggleSidebar: () => {} };
	}
	return context;
};
