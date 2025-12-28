import { AnimatePresence, motion } from "framer-motion";
import {
	ArrowDown,
	ArrowUp,
	ArrowUpDown,
	Check,
	ChevronDown,
	Filter,
	Grid3X3,
	List,
	Loader2,
	Music,
	Play,
	Search,
	X,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { VITE_BACKEND_URL } from "../../../../lib/const";
import { fetcher } from "../../../../lib/fetcher";
import Button from "../../../ui/Button";
import type { AudioFile } from "../types";
import { Pagination } from "./SearchModalPagination";

// Add song dropdown component
const AddSongDropdown: React.FC<{
	isAdded: boolean;
	isOpen: boolean;
	onToggle: () => void;
	onAddNext: () => void;
	onAddEnd: () => void;
}> = ({ isAdded, isOpen, onToggle, onAddNext, onAddEnd }) => {
	return (
		<div className="relative">
			<Button
				asMotion
				whileHover={{ scale: 1.05 }}
				whileTap={{ scale: 0.95 }}
				onClick={(e) => {
					e.stopPropagation();
					onToggle();
				}}
				disabled={isAdded}
				variant="ghost"
				tone="text"
				size="icon"
				className={`rounded-full transition-all w-8 h-8 ${
					isAdded
						? "bg-kozu text-text shadow-md"
						: "bg-surface/90 text-text hover:bg-surface shadow-md"
				}`}
			>
				{isAdded ? (
					<Check className="w-6 h-6" />
				) : (
					<ChevronDown className="w-6 h-6" />
				)}
			</Button>

			<AnimatePresence>
				{isOpen && !isAdded && (
					<motion.div
						initial={{ opacity: 0, scale: 0.95, y: -10 }}
						animate={{ opacity: 1, scale: 1, y: 0 }}
						exit={{ opacity: 0, scale: 0.95, y: -10 }}
						transition={{ duration: 0.15 }}
						className="absolute top-full right-0 mt-1 bg-surface rounded-lg shadow-lg border border-border overflow-hidden z-50 min-w-[140px]"
					>
						<Button
							onClick={onAddNext}
							variant="ghost"
							tone="text"
							size="sm"
							className="w-full justify-start px-3 py-2 text-left text-sm hover:bg-border"
						>
							Play next
						</Button>
						<Button
							onClick={onAddEnd}
							variant="ghost"
							tone="text"
							size="sm"
							className="w-full justify-start px-3 py-2 text-left text-sm hover:bg-border"
						>
							Add to end
						</Button>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
};

interface ApiResponse {
	success: boolean;
	data: AudioFile[];
	count?: number;
	pagination?: {
		total: number;
		offset: number;
		limit: number;
		hasMore: boolean;
	};
}

interface SearchModalProps {
	isOpen: boolean;
	onClose: () => void;
	onAddToPlaylist: (songs: AudioFile[]) => void;
	onReplacePlaylist: (songs: AudioFile[]) => void;
	onPlayNow?: (song: AudioFile) => void;
	onAddToQueueNext?: (songs: AudioFile[]) => void;
	onAddToQueueEnd?: (songs: AudioFile[]) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({
	isOpen,
	onClose,
	onAddToPlaylist,
	onReplacePlaylist,
	onPlayNow,
	onAddToQueueNext,
	onAddToQueueEnd,
}) => {
	const [searchQuery, setSearchQuery] = useState("");
	const [searchResults, setSearchResults] = useState<AudioFile[]>([]);
	const [isSearching, setIsSearching] = useState(false);
	const [selectedCategory, setSelectedCategory] = useState<string>("");
	const [addedSongs, setAddedSongs] = useState<Set<string>>(new Set());
	const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
	const [sortBy, setSortBy] = useState<string>("createdAt");
	const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
	const [currentPage, setCurrentPage] = useState(1);
	const [itemsPerPage] = useState(50);
	const [totalItems, setTotalItems] = useState(0);
	const [openDropdown, setOpenDropdown] = useState<string | null>(null);
	const searchQueryRef = useRef(searchQuery);
	const selectedCategoryRef = useRef(selectedCategory);
	const hasResultsRef = useRef(searchResults.length > 0);

	// Search function with pagination
	const searchMusic = useCallback(
		async (query: string, category?: string, page: number = 1) => {
			setIsSearching(true);
			try {
				const params = new URLSearchParams();
				const offset = (page - 1) * itemsPerPage;

				// If query is empty, load all songs
				if (!query.trim()) {
					if (category) {
						params.append("category", category);
					}
				} else {
					params.append("q", query.trim());
					if (category) params.append("category", category);
				}

				params.append("limit", itemsPerPage.toString());
				params.append("offset", offset.toString());

				// Add sort parameters
				if (sortBy) params.append("sortBy", sortBy);
				if (sortOrder) params.append("sortOrder", sortOrder);

				const response = await fetcher(`/audio/music/search?${params}`);
				const result: ApiResponse = await response.json();

				if (result.success) {
					setSearchResults(result.data);
					if (result.pagination) {
						setTotalItems(result.pagination.total);
					} else {
						setTotalItems(result.data.length);
					}
				} else {
					setSearchResults([]);
					setTotalItems(0);
				}
			} catch (err) {
				console.error("Search error:", err);
				setSearchResults([]);
				setTotalItems(0);
			} finally {
				setIsSearching(false);
			}
		},
		[itemsPerPage, sortBy, sortOrder],
	);

	const handleSearchKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter") {
			setCurrentPage(1);
			searchMusic(searchQuery, selectedCategory, 1);
		}
	};

	const handlePageChange = (page: number) => {
		setCurrentPage(page);
		searchMusic(searchQuery, selectedCategory, page);
	};

	const handlePlayNow = (song: AudioFile) => {
		if (onPlayNow) {
			onPlayNow(song);
		} else {
			onReplacePlaylist([song]);
		}
		onClose(); // Close modal after playing
	};

	const handleAddAll = (songs: AudioFile[]) => {
		onAddToPlaylist(songs);
		const newAddedSongs = new Set(addedSongs);
		songs.forEach((song) => newAddedSongs.add(song.id));
		setAddedSongs(newAddedSongs);
		setTimeout(() => {
			setAddedSongs((prev) => {
				const newSet = new Set(prev);
				songs.forEach((song) => newSet.delete(song.id));
				return newSet;
			});
		}, 2000);
	};

	useEffect(() => {
		searchQueryRef.current = searchQuery;
	}, [searchQuery]);

	useEffect(() => {
		selectedCategoryRef.current = selectedCategory;
	}, [selectedCategory]);

	useEffect(() => {
		hasResultsRef.current = searchResults.length > 0;
	}, [searchResults.length]);

	// Re-search when sort changes
	useEffect(() => {
		if (isOpen && (hasResultsRef.current || searchQueryRef.current)) {
			setCurrentPage(1);
			searchMusic(searchQueryRef.current, selectedCategoryRef.current, 1);
		}
	}, [isOpen, searchMusic]);

	// Reset search when modal opens and auto-search
	useEffect(() => {
		if (isOpen) {
			setSearchQuery("");
			setSearchResults([]);
			setSelectedCategory("");
			setSortBy("createdAt");
			setSortOrder("desc");
			setCurrentPage(1);
			setTotalItems(0);
			// Auto-search all songs when modal opens
			searchMusic("", "", 1);
		}
	}, [isOpen, searchMusic]);

	// Close dropdown when clicking outside
	useEffect(() => {
		const handleClickOutside = () => {
			setOpenDropdown(null);
		};

		if (openDropdown) {
			document.addEventListener("click", handleClickOutside);
			return () => {
				document.removeEventListener("click", handleClickOutside);
			};
		}
	}, [openDropdown]);

	// Optimized handlers
	const handleToggleDropdown = useCallback((songId: string) => {
		setOpenDropdown((prev) => (prev === songId ? null : songId));
	}, []);

	const handleAddNext = useCallback(
		(song: AudioFile) => {
			if (onAddToQueueNext) {
				onAddToQueueNext([song]);
			} else {
				onAddToPlaylist([song]);
			}
			setAddedSongs((prev) => new Set([...prev, song.id]));
			setTimeout(() => {
				setAddedSongs((prev) => {
					const newSet = new Set(prev);
					newSet.delete(song.id);
					return newSet;
				});
			}, 2000);
			setOpenDropdown(null);
		},
		[onAddToQueueNext, onAddToPlaylist],
	);

	const handleAddEnd = useCallback(
		(song: AudioFile) => {
			if (onAddToQueueEnd) {
				onAddToQueueEnd([song]);
			} else {
				onAddToPlaylist([song]);
			}
			setAddedSongs((prev) => new Set([...prev, song.id]));
			setTimeout(() => {
				setAddedSongs((prev) => {
					const newSet = new Set(prev);
					newSet.delete(song.id);
					return newSet;
				});
			}, 2000);
			setOpenDropdown(null);
		},
		[onAddToQueueEnd, onAddToPlaylist],
	);

	const renderSongListItem = (song: AudioFile, showCategory = false) => {
		const isAdded = addedSongs.has(song.id);

		return (
			<div
				key={song.id}
				className="group bg-border/80 rounded-lg shadow-sm hover:shadow-md hover:bg-surface transition-colors duration-150 border border-border/50 p-3 sm:p-4"
			>
				<div className="flex items-center gap-3 sm:gap-4">
					{/* Thumbnail */}
					<div className="relative w-12 h-12 sm:w-16 sm:h-16 flex-shrink-0">
						{song.thumbnailUrl ? (
							<img
								src={
									song.thumbnailUrl.startsWith("assets/")
										? `${VITE_BACKEND_URL}/${song.thumbnailUrl}`
										: song.thumbnailUrl.startsWith("/")
											? `${VITE_BACKEND_URL}${song.thumbnailUrl}`
											: song.thumbnailUrl
								}
								alt="Thumbnail"
								className="w-full h-full object-cover rounded-lg"
								loading="lazy"
								decoding="async"
							/>
						) : (
							<div className="w-full h-full bg-gradient-to-br from-hime/50 to-saya/50 flex items-center justify-center rounded-lg">
								<Music className="w-5 h-5 sm:w-6 sm:h-6 text-text opacity-60" />
							</div>
						)}

						{/* Category Badge */}
						{showCategory && song.category && (
							<div className="absolute -top-1 -right-1">
								<span className="px-1.5 py-0.5 bg-surface/70 text-text text-xs rounded-full">
									{song.category}
								</span>
							</div>
						)}
					</div>

					{/* Song Info */}
					<div className="flex-1 min-w-0">
						<h3 className="font-semibold text-text/90 truncate mb-1 text-sm sm:text-base">
							{song.title || song.filename}
						</h3>
						<p className="text-xs sm:text-sm text-muted truncate mb-1">
							{song.artist || "Unknown Artist"}
						</p>
						<div className="flex items-center gap-2">
							{song.duration && (
								<span className="text-xs text-muted/60">
									{Math.floor(song.duration / 60)}:
									{String(Math.floor(song.duration % 60)).padStart(2, "0")}
								</span>
							)}
							{isAdded && <div className="w-2 h-2 bg-kozu rounded-full"></div>}
						</div>
					</div>

					{/* Action Buttons */}
					<div className="flex items-center gap-2 flex-shrink-0">
						<motion.button
							whileHover={{ scale: 1.05 }}
							whileTap={{ scale: 0.95 }}
							onClick={() => handlePlayNow(song)}
							className="w-8 h-8 sm:w-10 sm:h-10 bg-surface rounded-full flex items-center justify-center shadow-md hover:shadow-lg transition-all"
						>
							<Play
								className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-text ml-0.5"
								fill="currentColor"
							/>
						</motion.button>

						<AddSongDropdown
							isAdded={isAdded}
							isOpen={openDropdown === song.id}
							onToggle={() => handleToggleDropdown(song.id)}
							onAddNext={() => handleAddNext(song)}
							onAddEnd={() => handleAddEnd(song)}
						/>
					</div>
				</div>
			</div>
		);
	};

	const renderSongCard = (song: AudioFile, showCategory = false) => {
		const isAdded = addedSongs.has(song.id);

		return (
			<div
				key={song.id}
				className="group bg-border rounded-xl shadow-sm hover:shadow-md hover:bg-surface transition-colors duration-150 border border-border/50 overflow-hidden"
			>
				<div className="relative aspect-square">
					{song.thumbnailUrl ? (
						<img
							src={
								song.thumbnailUrl.startsWith("assets/")
									? `${VITE_BACKEND_URL}/${song.thumbnailUrl}`
									: song.thumbnailUrl.startsWith("/")
										? `${VITE_BACKEND_URL}${song.thumbnailUrl}`
										: song.thumbnailUrl
							}
							alt="Thumbnail"
							className="w-full h-full object-cover"
							loading="lazy"
							decoding="async"
						/>
					) : (
						<div className="w-full h-full bg-gradient-to-br from-hime/50 to-saya/50 flex items-center justify-center">
							<Music className="w-8 h-8 lg:w-12 lg:h-12 text-text opacity-60" />
						</div>
					)}

					{/* Overlay Controls - Always visible on mobile, hover on desktop */}
					<div className="absolute inset-0 bg-gradient-to-t from-surface/80 via-transparent to-transparent opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200 flex items-end justify-between p-2 sm:p-3">
						<motion.button
							whileHover={{ scale: 1.05 }}
							whileTap={{ scale: 0.95 }}
							onClick={() => handlePlayNow(song)}
							className="w-9 h-9 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-surface rounded-full flex items-center justify-center shadow-md hover:shadow-lg transition-all"
						>
							<Play
								className="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-5 lg:h-5 text-text ml-0.5"
								fill="currentColor"
							/>
						</motion.button>

						<AddSongDropdown
							isAdded={isAdded}
							isOpen={openDropdown === song.id}
							onToggle={() => handleToggleDropdown(song.id)}
							onAddNext={() => handleAddNext(song)}
							onAddEnd={() => handleAddEnd(song)}
						/>
					</div>

					{/* Category Badge */}
					{showCategory && song.category && (
						<div className="absolute top-2 left-2">
							<span className="px-2 py-1 bg-surface/70 text-text text-xs rounded-full">
								{song.category}
							</span>
						</div>
					)}
				</div>

				<div className="p-3 lg:p-4">
					<h3 className="font-semibold text-text/90 truncate mb-1 text-sm lg:text-base">
						{song.title || song.filename}
					</h3>
					<p className="text-xs lg:text-sm text-muted truncate mb-2">
						{song.artist || "Unknown Artist"}
					</p>

					<div className="flex items-center justify-between">
						<span className="text-xs text-muted/60">
							{song.duration
								? `${Math.floor(song.duration / 60)}:${String(Math.floor(song.duration % 60)).padStart(2, "0")}`
								: ""}
						</span>

						<div className="flex items-center gap-1">
							{isAdded && <div className="w-2 h-2 bg-kozu rounded-full"></div>}
						</div>
					</div>
				</div>
			</div>
		);
	};

	return (
		<AnimatePresence>
			{isOpen && (
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					className="fixed inset-0 bg-surface/70 z-50 flex items-center justify-center p-4 transition-colors duration-300"
					onClick={onClose}
				>
					<motion.div
						initial={{ opacity: 0, scale: 0.9, y: 20 }}
						animate={{ opacity: 1, scale: 1, y: 0 }}
						exit={{ opacity: 0, scale: 0.9, y: 20 }}
						transition={{ duration: 0.2, ease: "easeOut" }}
						className="bg-surface rounded-2xl shadow-lg border border-border w-full max-w-6xl h-[90vh] overflow-hidden transition-colors duration-300"
						onClick={(e) => e.stopPropagation()}
					>
						{/* Header */}
						<div className="flex items-center justify-between p-3 pl-6 border-b border-border">
							<div>
								<h2 className="text-2xl font-bold text-text mb-1">
									Search Songs
								</h2>
							</div>
							<Button
								onClick={onClose}
								variant="soft"
								tone="megu"
								size="icon"
								className="rounded-full bg-border/80 hover:bg-muted transition-all"
							>
								<X className="w-6 h-6 text-text" />
							</Button>
						</div>

						{/* Content */}
						<div className="h-full overflow-y-auto pb-15">
							<div className="p-6 py-2">
								{/* Search Bar */}
								<div className="flex flex-col gap-2 bg-border/80 rounded-xl border border-border p-2 mb-2">
									<div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
										<div className="flex-1 relative justify-center">
											<Search className="absolute left-3 text-muted y-1/2 transform translate-y-1/2 w-5 h-5 top-1" />
											<input
												type="text"
												placeholder="Song name, artist name, and so on...(empty to show all)"
												value={searchQuery}
												onChange={(e) => setSearchQuery(e.target.value)}
												onKeyDown={handleSearchKeyDown}
												className="w-full pl-10 pr-3 py-2 bg-surface border-2 border-border rounded-xl focus:ring-2 focus:ring-saya focus:border-saya transition-all text-base sm:text-lg text-text placeholder-muted/60"
											/>
										</div>
										<Button
											asMotion
											whileHover={{ scale: 1.01 }}
											whileTap={{ scale: 0.99 }}
											onClick={() => {
												setCurrentPage(1);
												searchMusic(searchQuery, selectedCategory, 1);
											}}
											disabled={isSearching}
											tone="kaho"
											size="md"
											className="rounded-xl font-medium flex items-center justify-center gap-2 whitespace-nowrap min-w-[3rem] sm:min-w-0"
										>
											{isSearching ? (
												<Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
											) : (
												<Search className="w-4 h-4 sm:w-5 sm:h-5" />
											)}
											<span className="hidden sm:inline">Search</span>
										</Button>
									</div>

									{/* Category Filter */}
									<div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
										<div className="flex items-center gap-2">
											<Filter className="w-5 h-5 text-muted/60" />
											<span className="text-muted text-sm font-medium">
												Category:
											</span>
										</div>
										<div className="grid grid-cols-3 sm:flex sm:flex-wrap gap-2">
											{["", "BGM", "VOICE", "SE"].map((cat) => (
												<Button
													key={cat}
													asMotion
													whileHover={{ scale: 1.02 }}
													whileTap={{ scale: 0.98 }}
													onClick={() => setSelectedCategory(cat)}
													variant="soft"
													tone="kaho"
													size="sm"
													className={`rounded-lg text-sm font-medium whitespace-nowrap ${
														selectedCategory === cat
															? "bg-kaho text-text shadow-md"
															: "bg-surface text-text hover:bg-muted hover:text-text"
													}`}
												>
													{cat || "all"}
												</Button>
											))}
										</div>
									</div>
								</div>

								{/* Sort Controls */}
								<div className="bg-border/80 rounded-xl border border-border/50 p-2 mb-2">
									<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
										<div className="flex items-center gap-2">
											<ArrowUpDown className="w-5 h-5 text-muted/60" />
											<span className="text-muted text-sm font-medium">
												sort:
											</span>
										</div>
										<div className="flex flex-col sm:flex-row gap-3">
											{/* Sort By Selection */}
											<select
												value={sortBy}
												onChange={(e) => setSortBy(e.target.value)}
												className="px-3 py-2 bg-border/80 border border-border rounded-lg text-text text-sm focus:ring-2 focus:ring-saya focus:border-saya"
											>
												<option value="" className="bg-surface text-text">
													default
												</option>
												<option value="title" className="bg-surface text-text">
													title
												</option>
												<option value="artist" className="bg-surface text-text">
													artist
												</option>
												<option
													value="updatedAt"
													className="bg-surface text-text"
												>
													updateAt
												</option>
												<option
													value="createdAt"
													className="bg-surface text-text"
												>
													createdAt
												</option>
												<option
													value="duration"
													className="bg-surface text-text"
												>
													duration
												</option>
												<option
													value="orderId"
													className="bg-surface text-text"
												>
													song id
												</option>
												<option value="unitId" className="bg-surface text-text">
													unit ID
												</option>
												<option
													value="musicType"
													className="bg-surface text-text"
												>
													song type
												</option>
												<option
													value="songTime"
													className="bg-surface text-text"
												>
													song time
												</option>
												<option
													value="generationsId"
													className="bg-surface text-text"
												>
													generations ID
												</option>
											</select>

											{/* Sort Order Toggle */}
											<motion.button
												whileHover={{ scale: 1.05 }}
												whileTap={{ scale: 0.95 }}
												onClick={() =>
													setSortOrder(sortOrder === "asc" ? "desc" : "asc")
												}
												className="flex items-center gap-2 px-3 py-2 bg-border/80 border border-border rounded-lg text-text text-sm hover:bg-muted transition-all"
											>
												{sortOrder === "asc" ? (
													<ArrowUp className="w-4 h-4" />
												) : (
													<ArrowDown className="w-4 h-4" />
												)}
												<span>
													{sortOrder === "asc" ? "ascending" : "descending"}
												</span>
											</motion.button>
										</div>
									</div>
								</div>

								{/* Section Tabs and View Toggle */}
								<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
									{/* View Mode Toggle */}
									<div className="flex items-center bg-border/80 rounded-lg p-1 border border-border">
										<motion.button
											whileHover={{ scale: 1.02 }}
											whileTap={{ scale: 0.98 }}
											onClick={() => setViewMode("grid")}
											className={`flex items-center gap-1 px-3 py-2 rounded-md transition-all text-sm ${
												viewMode === "grid"
													? "bg-kaho text-text shadow-sm"
													: "text-muted hover:text-text"
											}`}
										>
											<Grid3X3 className="w-4 h-4" />
											<span className="hidden sm:inline">card</span>
										</motion.button>
										<motion.button
											whileHover={{ scale: 1.02 }}
											whileTap={{ scale: 0.98 }}
											onClick={() => setViewMode("list")}
											className={`flex items-center gap-1 px-3 py-2 rounded-md transition-all text-sm ${
												viewMode === "list"
													? "bg-kaho text-text shadow-sm"
													: "text-muted hover:text-text"
											}`}
										>
											<List className="w-4 h-4" />
											<span className="hidden sm:inline">list</span>
										</motion.button>
									</div>
								</div>

								{/* Content Area */}
								<AnimatePresence mode="wait">
									<motion.div
										key="search"
										initial={{ opacity: 0, y: 20 }}
										animate={{ opacity: 1, y: 0 }}
										exit={{ opacity: 0, y: -20 }}
									>
										{isSearching ? (
											<div className="text-center py-16">
												<Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-hime" />
												<p className="text-xl text-muted">searching...</p>
											</div>
										) : searchResults.length > 0 ? (
											<div>
												<div className="flex justify-between items-center mb-2">
													<h3 className="font-bold text-text">
														Result: {totalItems}
													</h3>
													<div className="flex gap-3">
														<motion.button
															whileHover={{ scale: 1.05 }}
															whileTap={{ scale: 0.95 }}
															onClick={() => handleAddAll(searchResults)}
															className="px-6 py-2 bg-saya text-text rounded-lg hover:bg-megu transition-all font-medium"
														>
															add all
														</motion.button>
														<motion.button
															whileHover={{ scale: 1.05 }}
															whileTap={{ scale: 0.95 }}
															onClick={() => {
																onReplacePlaylist(searchResults);
																onClose();
															}}
															className="px-6 py-2 bg-hime text-text rounded-lg hover:bg-megu transition-all font-medium"
														>
															replace playlist
														</motion.button>
													</div>
												</div>
												{viewMode === "grid" ? (
													<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 py-2">
														{searchResults.map((song) =>
															renderSongCard(song, true),
														)}
													</div>
												) : (
													<div className="space-y-3">
														{searchResults.map((song) =>
															renderSongListItem(song, true),
														)}
													</div>
												)}

												{/* Pagination */}
												<Pagination
													currentPage={currentPage}
													totalItems={totalItems}
													itemsPerPage={itemsPerPage}
													onPageChange={handlePageChange}
													isLoading={isSearching}
												/>
											</div>
										) : (
											<div className="text-center py-16">
												<Music className="w-16 h-16 mx-auto mb-4 text-muted/60" />
												<h3 className="text-xl font-semibold text-muted mb-2">
													no results found
												</h3>
											</div>
										)}
									</motion.div>
								</AnimatePresence>
							</div>
						</div>
					</motion.div>
				</motion.div>
			)}
		</AnimatePresence>
	);
};
