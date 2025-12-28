import { AnimatePresence, cubicBezier, motion } from "framer-motion";
import type React from "react";
import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { SidebarToggleProvider } from "../contexts/SidebarToggleContext";
import { useTheme } from "../hooks/useTheme";
import MiniPlayer from "./MiniPlayer";
import Sidebar from "./Sidebar";

const Layout: React.FC = () => {
	const [sidebarOpen, setSidebarOpen] = useState(false);
	const { theme, setTheme } = useTheme();
	const location = useLocation();

	const handleSidebarToggle = () => {
		setSidebarOpen(!sidebarOpen);
	};

	// デスクトップでは自動でサイドバーを開く
	useEffect(() => {
		const handleResize = () => {
			if (window.innerWidth >= 1024) {
				setSidebarOpen(true);
			} else {
				setSidebarOpen(false);
			}
		};

		handleResize();
		window.addEventListener("resize", handleResize);
		return () => window.removeEventListener("resize", handleResize);
	}, []);

	const pageVariants = {
		initial: {
			opacity: 0,
			x: 20,
		},
		in: {
			opacity: 1,
			x: 0,
		},
		out: {
			opacity: 0,
			x: -20,
		},
	};

	const pageTransition = {
		type: "tween" as const,
		ease: cubicBezier(0, 0.71, 0.2, 1.01),
		duration: 0.3,
	};

	return (
		<SidebarToggleProvider toggleSidebar={handleSidebarToggle}>
			<div className="h-screen transition-colors duration-300 bg-surface">
				<div className="flex h-full">
					<Sidebar
						isOpen={sidebarOpen}
						onToggle={handleSidebarToggle}
						theme={theme}
						onThemeChange={setTheme}
					/>

					<main
						className={`
          flex-1 overflow-auto transition-all duration-300
          ${sidebarOpen ? "lg:ml-0" : "lg:ml-0"}
          ${location.pathname !== "/player" ? "pb-mini-player-safe" : "pb-safe"}
        `}
					>
						<AnimatePresence mode="wait">
							<motion.div
								key={location.pathname}
								initial="initial"
								animate="in"
								exit="out"
								variants={pageVariants}
								transition={pageTransition}
								className="min-h-full"
							>
								<Outlet />
							</motion.div>
						</AnimatePresence>
					</main>
				</div>

				{/* Mini Player - only show on non-player routes */}
				{location.pathname !== "/player" && <MiniPlayer />}
			</div>
		</SidebarToggleProvider>
	);
};

export default Layout;
