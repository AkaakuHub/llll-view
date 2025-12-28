import { motion } from "framer-motion";
import {
	AudioWaveform,
	BarChart3,
	BookOpen,
	Clock,
	Database,
	FolderOpen,
	Image,
	Library,
	Monitor,
	Moon,
	Music,
	Settings,
	Sun,
	X,
} from "lucide-react";
import type React from "react";
import { NavLink } from "react-router-dom";
import type { ThemeMode } from "../hooks/useTheme";
import Button from "./ui/Button";

interface SidebarProps {
	isOpen: boolean;
	onToggle: () => void;
	theme: ThemeMode;
	onThemeChange: (theme: ThemeMode) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
	isOpen,
	onToggle,
	theme,
	onThemeChange,
}) => {
	const menuItems = [
		{
			path: "/player",
			icon: Music,
			label: "Music Player",
			color: "text-hime",
		},
		{
			path: "/converter",
			icon: AudioWaveform,
			label: "Audio Converter",
			color: "text-saya",
		},
		{
			path: "/stories",
			icon: BookOpen,
			label: "Story Viewer",
			color: "text-gin",
		},
		{
			path: "/cards",
			icon: Image,
			label: "Card Illustrations",
			color: "text-ruri",
		},
		{
			path: "/music-data",
			icon: BarChart3,
			label: "Music Data",
			color: "text-saya",
		},
		{
			path: "/live-timelines",
			icon: Clock,
			label: "Live Timelines",
			color: "text-hime",
		},
		{
			path: "/database",
			icon: Database,
			label: "Database",
			color: "text-kozu",
		},
		{
			path: "/catalog",
			icon: Library,
			label: "Resource Catalog",
			color: "text-tuzu",
		},
		{
			path: "/explorer",
			icon: FolderOpen,
			label: "File Explorer",
			color: "text-sera",
		},
		{
			path: "/system",
			icon: Settings,
			label: "System Control",
			color: "text-megu",
		},
		{
			path: "/help",
			icon: BookOpen,
			label: "Help",
			color: "text-izu",
		},
	];

	const sidebarVariants = {
		open: {
			x: 0,
			transition: {
				type: "spring" as const,
				stiffness: 300,
				damping: 30,
			},
		},
		closed: {
			x: "-100%",
			transition: {
				type: "spring" as const,
				stiffness: 300,
				damping: 30,
			},
		},
	};

	const itemVariants = {
		open: {
			opacity: 1,
			x: 0,
			transition: {
				type: "spring" as const,
				stiffness: 300,
				damping: 24,
			},
		},
		closed: {
			opacity: 0,
			x: -20,
			transition: {
				duration: 0.2,
			},
		},
	};

	return (
		<>
			{/* オーバーレイ (モバイル用) */}
			{isOpen && (
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					onClick={onToggle}
					className="fixed inset-0 bg-surface/50 z-40 lg:hidden"
				/>
			)}

			{/* サイドバー */}
			<motion.aside
				variants={sidebarVariants}
				animate={isOpen ? "open" : "closed"}
				className="fixed top-0 left-0 z-50 h-full w-72 bg-surface border-r border-border bg-opacity-90 lg:relative lg:translate-x-0"
			>
				<div className="flex flex-col h-full">
					{/* ヘッダー */}
					<div className="flex items-center justify-between p-6 border-b border-border">
						<motion.div
							initial={{ opacity: 0, y: -20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.1 }}
						>
							<h1 className="text-xl font-bold bg-gradient-to-r from-hime to-saya bg-clip-text text-transparent">
								LLLL Studio
							</h1>
						</motion.div>

						<Button
							onClick={onToggle}
							variant="ghost"
							tone="megu"
							size="icon"
							className="rounded-lg lg:hidden hover:bg-muted/20 text-muted hover:text-text"
						>
							<X size={20} />
						</Button>
					</div>

					{/* ナビゲーション */}
					<nav className="flex-1 p-4 space-y-2 overflow-y-auto">
						{menuItems.map((item, index) => (
							<motion.div
								key={item.path}
								variants={itemVariants}
								initial="closed"
								animate={isOpen ? "open" : "closed"}
								transition={{ delay: index * 0.1 }}
							>
								<NavLink
									to={item.path}
									className={({ isActive }) => `
                    flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 cursor-pointer
                    ${isActive ? "bg-muted/30 shadow-lg" : "hover:bg-muted/20"}
                  `}
									onClick={() => {
										const isDesktop = window.matchMedia(
											"(min-width: 1024px)",
										).matches;
										if (isOpen && !isDesktop) {
											onToggle();
										}
									}}
								>
									<item.icon
										size={20}
										className={`${item.color} transition-transform duration-200 group-hover:scale-110`}
									/>
									<span className="font-medium text-text">{item.label}</span>
								</NavLink>
							</motion.div>
						))}
					</nav>

					{/* フッター */}
					<div className="p-4 border-t mb-[74px] border-border">
						{/* Theme Selection */}
						<div className="space-y-2">
							<p className="text-xs text-muted mb-2">Theme</p>
							<div className="grid grid-cols-3 gap-2">
								<motion.button
									whileHover={{ scale: 1.05 }}
									whileTap={{ scale: 0.95 }}
									onClick={() => onThemeChange("light")}
									className={`
										flex flex-col items-center gap-1 px-2 py-2 rounded-lg transition-all duration-200 cursor-pointer
										${
											theme === "light"
												? "bg-muted/50 text-text"
												: "bg-muted/30 hover:bg-muted/50 text-muted"
										}
									`}
								>
									<Sun size={16} />
									<span className="text-xs font-medium">Light</span>
								</motion.button>
								<motion.button
									whileHover={{ scale: 1.05 }}
									whileTap={{ scale: 0.95 }}
									onClick={() => onThemeChange("dark")}
									className={`
										flex flex-col items-center gap-1 px-2 py-2 rounded-lg transition-all duration-200 cursor-pointer
										${
											theme === "dark"
												? "bg-muted/50 text-text"
												: "bg-muted/30 hover:bg-muted/50 text-muted"
										}
									`}
								>
									<Moon size={16} />
									<span className="text-xs font-medium">Dark</span>
								</motion.button>
								<motion.button
									whileHover={{ scale: 1.05 }}
									whileTap={{ scale: 0.95 }}
									onClick={() => onThemeChange("system")}
									className={`
										flex flex-col items-center gap-1 px-2 py-2 rounded-lg transition-all duration-200 cursor-pointer
										${
											theme === "system"
												? "bg-muted/50 text-text"
												: "bg-muted/30 hover:bg-muted/50 text-muted"
										}
									`}
								>
									<Monitor size={16} />
									<span className="text-xs font-medium">System</span>
								</motion.button>
							</div>
						</div>
					</div>
				</div>
			</motion.aside>
		</>
	);
};

export default Sidebar;
