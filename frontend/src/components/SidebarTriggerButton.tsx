import { Menu } from "lucide-react";
import type React from "react";
import { useSidebarToggle } from "../contexts/SidebarToggleContext";
import Button from "./ui/Button";

type SidebarTriggerButtonProps = {
	className?: string;
	iconSize?: number;
	ariaLabel?: string;
};

const SidebarTriggerButton: React.FC<SidebarTriggerButtonProps> = ({
	className = "",
	iconSize = 16,
	ariaLabel = "Open sidebar",
}) => {
	const { toggleSidebar } = useSidebarToggle();

	return (
		<Button
			aria-label={ariaLabel}
			onClick={toggleSidebar}
			variant="outline"
			tone="text"
			size="icon"
			className={`h-10 w-10 rounded-lg bg-surface/90 text-text shadow-sm hover:bg-muted/20 lg:hidden ${className}`.trim()}
		>
			<Menu size={iconSize} />
		</Button>
	);
};

export default SidebarTriggerButton;
