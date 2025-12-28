import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import "./index.css";

// Layout
import Layout from "./components/Layout";
// Context
import { AudioPlayerProvider } from "./contexts/AudioPlayerContext";
import AudioConverterPage from "./pages/AudioConverterPage";
import CardDetailPage from "./pages/CardDetailPage";
import CardIllustrationsPage from "./pages/CardIllustrationsPage";
import DatabasePage from "./pages/DatabasePage";
import FileExplorerPage from "./pages/FileExplorerPage";
import HelpPage from "./pages/HelpPage";
import LiveTimelinesPage from "./pages/LiveTimelinesPage";
import MusicDataPage from "./pages/MusicDataPage";
// Pages
import MusicPlayerPage from "./pages/MusicPlayerPage";
import CatalogPage from "./pages/ResourceCatalogPage";
import StoryPage from "./pages/StoryViewerPage";
import SystemControlPage from "./pages/SystemControlPage";

const root = document.getElementById("root");
if (!root) {
	throw new Error("Root element not found");
}

createRoot(root).render(
	<StrictMode>
		<BrowserRouter>
			<AudioPlayerProvider>
				<Routes>
					<Route path="/" element={<Layout />}>
						<Route index element={<Navigate to="/player" replace />} />
						<Route path="player" element={<MusicPlayerPage />} />
						<Route path="converter" element={<AudioConverterPage />} />
						<Route path="database" element={<DatabasePage />} />
						<Route path="explorer" element={<FileExplorerPage />} />
						<Route path="catalog" element={<CatalogPage />} />
						<Route path="system" element={<SystemControlPage />} />
						<Route path="cards" element={<CardIllustrationsPage />} />
						<Route path="card/:id" element={<CardDetailPage />} />
						<Route path="music-data" element={<MusicDataPage />} />
						<Route path="live-timelines" element={<LiveTimelinesPage />} />
						<Route path="stories" element={<StoryPage />} />
						<Route path="help" element={<HelpPage />} />
					</Route>
				</Routes>
			</AudioPlayerProvider>
		</BrowserRouter>
	</StrictMode>,
);
