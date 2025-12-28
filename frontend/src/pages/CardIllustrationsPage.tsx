import {
	ChevronLeft,
	ChevronRight,
	Eye,
	Filter,
	Grid,
	List,
	RefreshCw,
	Search,
	Star,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../components/ui/Button";
import { VITE_BACKEND_URL } from "../lib/const";
import { fetcherTyped } from "../lib/fetcher";

interface Character {
	id: number;
	nameLast: string;
	nameFirst: string;
	latinAlphabetNameLast?: string;
	latinAlphabetNameFirst?: string;
	characterVoice?: string;
	themeColor?: string;
	introduction?: string;
	styleType: number;
}

interface CardIllustration {
	id: number;
	cardSeriesId: number;
	characterId: number;
	name?: string;
	description?: string;
	rarity: number;
	evolveTimes: number;
	style: number;
	mood: number;
	initialSmile?: number;
	initialPure?: number;
	initialCool?: number;
	initialMental?: number;
	maxSmile?: number;
	maxPure?: number;
	maxCool?: number;
	maxMental?: number;
	beatPoint?: number;
	orderId?: number;
	character: Character;
	assets: {
		images: {
			full: boolean;
			half: boolean;
			middleVertical: boolean;
		};
		videos: {
			home: boolean;
		};
		seriesVideos: {
			get: { in: boolean; loop: boolean };
			training: { in: boolean; loop: boolean };
		};
		voice: boolean;
	};
}

interface CardSeries {
	cardSeriesId: number;
	name: string;
	character: Character;
	rarity: number;
	style: number;
	mood: number;
	description?: string;
	evolutions: CardIllustration[];
}

const CardIllustrationsPage: React.FC = () => {
	const navigate = useNavigate();
	const [cards, setCards] = useState<CardIllustration[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [searchTerm, setSearchTerm] = useState("");
	const [selectedRarity, setSelectedRarity] = useState<number | null>(null);
	const [selectedCharacter, setSelectedCharacter] = useState<number | null>(
		null,
	);
	const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
	const [showFilters, setShowFilters] = useState(false);
	const [extracting, setExtracting] = useState(false);
	const [extractionProgress, setExtractionProgress] = useState("");
	const [currentPage, setCurrentPage] = useState(1);
	const [itemsPerPage] = useState(20);
	const [groupByCard, setGroupByCard] = useState(true); // New state for grouping
	const [imageStage, setImageStage] = useState<0 | 1 | 2>(0);
	const [sortField, setSortField] = useState<
		"order" | "character" | "rarity" | "id"
	>("order");
	const [sortDirection, setSortDirection] = useState<"desc" | "asc">("desc");
	const [totals, setTotals] = useState<{
		cards: number;
		images: { full: number; half: number; middleVertical: number };
		videos: { home: number; get: number; training: number };
		voice: number;
	} | null>(null);
	const [syncingAllData, setSyncingAllData] = useState(false);

	const loadCards = useCallback(async () => {
		try {
			setLoading(true);
			setError(null);

			const response = await fetcherTyped<
				| {
						totals: {
							cards: number;
							images: { full: number; half: number; middleVertical: number };
							videos: { home: number; get: number; training: number };
							voice: number;
						};
						cards: CardIllustration[];
				  }
				| CardIllustration[]
			>("/card-illustrations");
			if (Array.isArray(response)) {
				setCards(response);
				setTotals(null);
			} else {
				setCards(response.cards || []);
				setTotals(response.totals || null);
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : "An error occurred");
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		loadCards();
	}, [loadCards]);

	const extractAssets = useCallback(async () => {
		try {
			setExtracting(true);
			setExtractionProgress("Starting asset extraction...");

			const response = await fetcherTyped<{
				imagesExtracted: number;
				videosExtracted: number;
				errors: string[];
			}>("/card-illustrations/extract-assets", {
				method: "POST",
			});

			setExtractionProgress(
				`Extraction completed! Images: ${response.imagesExtracted}, Videos: ${response.videosExtracted}`,
			);

			await loadCards();
		} catch (err) {
			setExtractionProgress(
				`Extraction failed: ${err instanceof Error ? err.message : "Unknown error"}`,
			);
		} finally {
			setExtracting(false);
			setTimeout(() => {
				setExtractionProgress("");
			}, 4000);
		}
	}, [loadCards]);

	const syncAllData = async () => {
		try {
			setSyncingAllData(true);
			setExtractionProgress("Syncing all card data...");

			const response = await fetcherTyped<{
				charactersImported: number;
				charactersSkipped: number;
				cardsImported: number;
				cardsSkipped: number;
				cardSkillsImported: number;
				cardSkillsSkipped: number;
				cardLevelsImported: number;
				cardLevelsSkipped: number;
				centerSkillsImported: number;
				centerSkillsSkipped: number;
				musicScoresImported: number;
				musicScoresSkipped: number;
				liveTimelinesImported: number;
				liveTimelinesSkipped: number;
				errors: string[];
				totalProcessingTime?: number;
			}>(`/card-illustrations/sync-all`, {
				method: "POST",
			});

			await loadCards();

			const processingTime = response.totalProcessingTime
				? ` (${response.totalProcessingTime}ms)`
				: "";

			setExtractionProgress(
				`All data synced successfully!${processingTime} - Characters: ${response.charactersImported}, Cards: ${response.cardsImported}, Skills: ${response.cardSkillsImported}`,
			);

			setTimeout(() => {
				setExtractionProgress("");
			}, 5000);
		} catch (error) {
			console.error("All data sync failed:", error);
			setExtractionProgress(
				`All data sync failed: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
			setTimeout(() => {
				setExtractionProgress("");
			}, 5000);
		} finally {
			setSyncingAllData(false);
		}
	};

	// Group cards by CardSeriesId
	const cardSeries = useMemo(() => {
		if (!groupByCard) return Array.isArray(cards) ? cards : [];
		if (!Array.isArray(cards) || cards.length === 0) return [];

		const grouped = new Map<number, CardSeries>();

		cards.forEach((card) => {
			if (!grouped.has(card.cardSeriesId)) {
				grouped.set(card.cardSeriesId, {
					cardSeriesId: card.cardSeriesId,
					name: card.name || `Card ${card.cardSeriesId}`,
					character: card.character,
					rarity: card.rarity,
					style: card.style,
					mood: card.mood,
					description: card.description,
					evolutions: [],
				});
			}
			const series = grouped.get(card.cardSeriesId);
			if (series) {
				series.evolutions.push(card);
			}
		});

		// Sort evolutions by evolveTimes
		grouped.forEach((series) => {
			series.evolutions.sort((a, b) => a.evolveTimes - b.evolveTimes);
		});

		return Array.from(grouped.values());
	}, [cards, groupByCard]);

	const filteredCards = (groupByCard ? cardSeries : cards).filter((item) => {
		const card = groupByCard
			? (item as CardSeries).evolutions[0]
			: (item as CardIllustration);
		const normalizedSearch = searchTerm.toLowerCase();
		const matchesSearch =
			!searchTerm ||
			card.name?.toLowerCase().includes(normalizedSearch) ||
			(card.character.nameLast + card.character.nameFirst)
				.toLowerCase()
				.includes(normalizedSearch) ||
			card.description?.toLowerCase().includes(normalizedSearch);

		const matchesRarity =
			selectedRarity === null || card.rarity === selectedRarity;
		const matchesCharacter =
			selectedCharacter === null || card.characterId === selectedCharacter;

		const matchesStage = groupByCard ? true : card.evolveTimes === imageStage;

		return matchesSearch && matchesRarity && matchesCharacter && matchesStage;
	});

	const sortedCards = useMemo(() => {
		const list = [...filteredCards];
		const getCard = (item: CardSeries | CardIllustration) =>
			groupByCard
				? (item as CardSeries).evolutions[0]
				: (item as CardIllustration);

		list.sort((a, b) => {
			const cardA = getCard(a);
			const cardB = getCard(b);
			const orderA = cardA?.orderId ?? 0;
			const orderB = cardB?.orderId ?? 0;
			const nameA = `${cardA?.character?.nameLast || ""}${cardA?.character?.nameFirst || ""}`;
			const nameB = `${cardB?.character?.nameLast || ""}${cardB?.character?.nameFirst || ""}`;
			const rarityA = cardA?.rarity ?? 0;
			const rarityB = cardB?.rarity ?? 0;
			const idA = cardA?.id ?? 0;
			const idB = cardB?.id ?? 0;

			let base = 0;
			switch (sortField) {
				case "order":
					base = orderA - orderB;
					break;
				case "character":
					base = nameA.localeCompare(nameB, "en");
					break;
				case "rarity":
					base = rarityA - rarityB;
					break;
				case "id":
					base = idA - idB;
					break;
				default:
					base = 0;
			}

			return sortDirection === "asc" ? base : -base;
		});

		return list;
	}, [filteredCards, groupByCard, sortField, sortDirection]);

	// ページネーション設定
	const totalPages = Math.ceil(sortedCards.length / itemsPerPage);
	const startIndex = (currentPage - 1) * itemsPerPage;
	const endIndex = startIndex + itemsPerPage;
	const paginatedCards = sortedCards.slice(startIndex, endIndex);

	// ページが変わったら先頭にスクロール
	useEffect(() => {
		if (filteredCards.length >= 0) {
			setCurrentPage(1);
		}
	}, [filteredCards.length]);

	const getRarityColor = (rarity: number) => {
		switch (rarity) {
			case 3:
				return "text-saya";
			case 4:
				return "text-hime";
			case 5:
				return "text-suzu";
			case 7:
				return "text-tuzu";
			case 8:
				return "text-ruri";
			case 9:
				return "text-sera";
			default:
				return "text-megu";
		}
	};

	const getRarityStars = (
		rarity: number,
		variant: "color" | "mono" = "color",
	) => {
		// レアリティの数値がそのまま星の数
		const stars = Array.from({ length: rarity }, (_, index) => index + 1);
		return stars.map((star) => (
			<Star
				key={`star-${rarity}-${star}`}
				className={
					variant === "mono"
						? "h-4 w-4 text-paper fill-paper stroke-paper stroke-2 drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]"
						: `h-4 w-4 ${getRarityColor(rarity)} fill-current stroke-paper drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]`
				}
				strokeWidth={variant === "mono" ? 2 : 1.25}
			/>
		));
	};

	const getPreferredImageType = (card: CardIllustration) => {
		if (card.assets?.images.full) return "full";
		if (card.assets?.images.middleVertical) return "middle_vertical";
		if (card.assets?.images.half) return "half";
		return "full";
	};

	const getImageUrl = (card: CardIllustration) => {
		const type = getPreferredImageType(card);
		return `${VITE_BACKEND_URL}/card-illustrations/image/${card.id}?type=${type}`;
	};

	const hasAnyImage = (assets?: CardIllustration["assets"]) =>
		!!assets &&
		(assets.images.full || assets.images.middleVertical || assets.images.half);

	const stageOptions: { value: 0 | 1 | 2; label: string }[] = [
		{ value: 0, label: "Base" },
		{ value: 1, label: "Evolution 1" },
		{ value: 2, label: "Evolution 2" },
	];

	const getSeriesCardForStage = (series: CardSeries) =>
		series.evolutions.find((evo) => evo.evolveTimes === imageStage) ||
		series.evolutions[0];

	const uniqueCharacters = useMemo(() => {
		const characterMap = new Map<number, Character>();
		cards.forEach((card) => {
			if (!characterMap.has(card.character.id)) {
				characterMap.set(card.character.id, card.character);
			}
		});
		return Array.from(characterMap.values());
	}, [cards]);

	const uniqueRarities = useMemo(() => {
		return Array.from(new Set(cards.map((card) => card.rarity))).sort();
	}, [cards]);

	if (loading) {
		return (
			<div className="flex items-center justify-center h-64">
				<div className="animate-spin rounded-full h-32 w-32 border-b-2 border-saya"></div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="bg-tuzu/20 border border-tuzu rounded-lg p-4 text-tuzu">
				<p>Error: {error}</p>
				<Button onClick={loadCards} variant="soft" tone="tuzu" className="mt-2">
					Retry
				</Button>
			</div>
		);
	}

	return (
		<div className="h-full flex flex-col">
			{/* Header */}
			<div className="p-4 bg-surface border-b border-border">
				<div className="flex flex-col gap-3">
					<div className="flex flex-col lg:flex-row gap-3">
						<div className="flex-1 relative">
							<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted" />
							<input
								type="text"
								placeholder="Search cards, characters, or descriptions..."
								value={searchTerm}
								onChange={(e) => setSearchTerm(e.target.value)}
								className="w-full pl-10 pr-4 py-2 border border-border rounded-lg
									bg-surface text-text
									focus:ring-2 focus:ring-saya focus:border-transparent"
							/>
						</div>

						<div className="flex flex-wrap items-center gap-2">
							<Button
								onClick={() => setShowFilters(!showFilters)}
								variant="soft"
								tone="saya"
								size="icon"
								className={`rounded-lg ${
									showFilters
										? "bg-saya/30 text-saya"
										: "bg-surface text-muted hover:bg-surface/80"
								}`}
								title="Filters"
							>
								<Filter className="h-4 w-4" />
							</Button>

							<Button
								onClick={() => setGroupByCard(!groupByCard)}
								variant="soft"
								tone="hime"
								size="icon"
								className={`rounded-lg ${
									groupByCard
										? "bg-hime/30 text-hime"
										: "bg-surface text-muted hover:bg-surface/80"
								}`}
								title={
									groupByCard ? "Grouped by series" : "Show all evolutions"
								}
							>
								<Star className="h-4 w-4" />
							</Button>

							<div className="flex items-center gap-1 rounded-lg border border-border bg-surface p-1">
								<Button
									onClick={() => setViewMode("grid")}
									variant={viewMode === "grid" ? "solid" : "soft"}
									tone="saya"
									size="icon"
									className="rounded-md"
									title="Grid"
								>
									<Grid className="h-4 w-4" />
								</Button>
								<Button
									onClick={() => setViewMode("list")}
									variant={viewMode === "list" ? "solid" : "soft"}
									tone="saya"
									size="icon"
									className="rounded-md"
									title="List"
								>
									<List className="h-4 w-4" />
								</Button>
							</div>
						</div>

						<div className="flex flex-wrap items-center gap-2">
							<Button
								onClick={syncAllData}
								disabled={syncingAllData}
								tone="hime"
								size="sm"
								className="flex items-center gap-2"
								title="Sync all card data"
							>
								{syncingAllData ? (
									<RefreshCw className="h-4 w-4 animate-spin" />
								) : (
									<RefreshCw className="h-4 w-4" />
								)}
								Sync All
							</Button>

							<Button
								onClick={extractAssets}
								disabled={extracting}
								tone="kozu"
								size="sm"
								className="flex items-center gap-2"
							>
								{extracting ? (
									<RefreshCw className="h-4 w-4 animate-spin" />
								) : (
									<RefreshCw className="h-4 w-4" />
								)}
								Extract All
							</Button>
						</div>
					</div>

					<div className="flex flex-wrap items-center gap-2">
						<div className="flex items-center gap-1 rounded-lg border border-border bg-surface p-1">
							{stageOptions.map((option) => (
								<Button
									key={option.value}
									onClick={() => setImageStage(option.value)}
									variant={imageStage === option.value ? "solid" : "soft"}
									tone="saya"
									size="sm"
									className="cursor-pointer"
								>
									{option.label}
								</Button>
							))}
						</div>

						<select
							value={sortField}
							onChange={(e) => setSortField(e.target.value as typeof sortField)}
							className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text cursor-pointer"
							aria-label="Sort field"
						>
							<option value="order">Release</option>
							<option value="character">Character</option>
							<option value="rarity">Rarity</option>
							<option value="id">Card ID</option>
						</select>
						<select
							value={sortDirection}
							onChange={(e) =>
								setSortDirection(e.target.value as "asc" | "desc")
							}
							className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text cursor-pointer"
							aria-label="Sort direction"
						>
							<option value="desc">Desc</option>
							<option value="asc">Asc</option>
						</select>
					</div>
				</div>
			</div>

			{(extracting || syncingAllData || extractionProgress) && (
				<div
					className={`p-4 border-b ${
						syncingAllData
							? "bg-hime/20 border-hime/40"
							: "bg-saya/20 border-saya/40"
					}`}
				>
					<div
						className={`flex items-center gap-2 ${
							syncingAllData ? "text-hime" : "text-saya"
						}`}
					>
						{(extracting || syncingAllData) && (
							<RefreshCw className="h-4 w-4 animate-spin" />
						)}
						<span className="text-sm font-medium">
							{extractionProgress ||
								(syncingAllData
									? "Syncing all data..."
									: "Extracting assets...")}
						</span>
					</div>
				</div>
			)}

			{totals && (
				<div className="px-4 py-3 border-b border-border bg-surface">
					<div className="flex flex-wrap gap-4 text-xs text-muted">
						<span>Cards: {totals.cards}</span>
						<span>Images(full): {totals.images.full}</span>
						<span>Images(half): {totals.images.half}</span>
						<span>Images(middle): {totals.images.middleVertical}</span>
						<span>Videos(home): {totals.videos.home}</span>
						<span>Videos(get): {totals.videos.get}</span>
						<span>Videos(training): {totals.videos.training}</span>
						<span>Voices: {totals.voice}</span>
					</div>
				</div>
			)}

			{/* Filters */}
			{showFilters && (
				<div className="p-4 bg-surface border-b border-border">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div>
							<label
								htmlFor="card-illustrations-rarity"
								className="block text-sm font-medium text-muted mb-2"
							>
								Rarity
							</label>
							<select
								id="card-illustrations-rarity"
								value={selectedRarity ?? ""}
								onChange={(e) =>
									setSelectedRarity(
										e.target.value ? parseInt(e.target.value) : null,
									)
								}
								className="w-full px-3 py-2 border border-border rounded-lg
									bg-surface text-text
									focus:ring-2 focus:ring-saya focus:border-transparent"
							>
								<option value="">All Rarities</option>
								{uniqueRarities.map((rarity) => (
									<option key={rarity} value={rarity}>
										{rarity} Star{rarity !== 1 ? "s" : ""}
									</option>
								))}
							</select>
						</div>

						<div>
							<label
								htmlFor="card-illustrations-character"
								className="block text-sm font-medium text-muted mb-2"
							>
								Character
							</label>
							<select
								id="card-illustrations-character"
								value={selectedCharacter ?? ""}
								onChange={(e) =>
									setSelectedCharacter(
										e.target.value ? parseInt(e.target.value) : null,
									)
								}
								className="w-full px-3 py-2 border border-border rounded-lg
									bg-surface text-text
									focus:ring-2 focus:ring-saya focus:border-transparent"
							>
								<option value="">All Characters</option>
								{uniqueCharacters.map((character) => (
									<option key={character.id} value={character.id}>
										{character.nameLast} {character.nameFirst}
									</option>
								))}
							</select>
						</div>
					</div>
				</div>
			)}

			{/* Cards Display */}
			<div className="flex-1 p-4">
				{/* Pagination Info */}
				<div className="flex justify-between items-center mb-4">
					<div className="text-sm text-muted">
						Showing {startIndex + 1}-{Math.min(endIndex, filteredCards.length)}{" "}
						of {filteredCards.length} cards
					</div>
					{totalPages > 1 && (
						<div className="flex items-center gap-2">
							<Button
								onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
								disabled={currentPage === 1}
								variant="soft"
								tone="megu"
								size="icon"
								className="rounded-lg bg-surface text-muted hover:bg-surface/80"
							>
								<ChevronLeft className="h-4 w-4" />
							</Button>
							<span className="text-sm text-muted">
								Page {currentPage} of {totalPages}
							</span>
							<Button
								onClick={() =>
									setCurrentPage(Math.min(totalPages, currentPage + 1))
								}
								disabled={currentPage === totalPages}
								variant="soft"
								tone="megu"
								size="icon"
								className="rounded-lg bg-surface text-muted hover:bg-surface/80"
							>
								<ChevronRight className="h-4 w-4" />
							</Button>
						</div>
					)}
				</div>

				{filteredCards.length === 0 ? (
					<div className="text-center py-8 text-muted">
						No cards found matching your criteria.
					</div>
				) : (
					<div
						className={
							viewMode === "grid"
								? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4"
								: "space-y-4"
						}
					>
						{paginatedCards.map((item) => {
							const isCardSeries = groupByCard && "evolutions" in item;
							const series = isCardSeries ? (item as CardSeries) : null;
							const displayCard = isCardSeries
								? getSeriesCardForStage(item as CardSeries)
								: (item as CardIllustration);
							const cardKey = isCardSeries
								? `series_${(item as CardSeries).cardSeriesId}`
								: `card_${(item as CardIllustration).id}`;

							if (!displayCard) {
								return (
									<div
										key={cardKey}
										className={`flex items-center justify-center rounded-2xl border border-border bg-surface text-muted ${
											viewMode === "grid" ? "aspect-[16/9]" : "h-32"
										}`}
									>
										No card data
									</div>
								);
							}

							const imageAvailable = hasAnyImage(displayCard.assets);
							const imageUrl = imageAvailable ? getImageUrl(displayCard) : "";
							const cardTitle =
								series?.name || displayCard.name || `Card ${displayCard.id}`;

							if (viewMode === "list") {
								return (
									<button
										type="button"
										key={cardKey}
										onClick={() => navigate(`/card/${displayCard.id}`)}
										className="group w-full rounded-2xl border border-border bg-surface px-4 py-3 text-left shadow-sm transition-shadow hover:shadow-lg cursor-pointer"
										aria-label={cardTitle}
									>
										<div className="flex items-center gap-4">
											<div className="relative w-56 flex-shrink-0 overflow-hidden rounded-xl border border-border bg-surface">
												<div className="aspect-[16/9]">
													{imageAvailable ? (
														<img
															src={imageUrl}
															alt={cardTitle}
															className="h-full w-full object-cover transition-all duration-300 group-hover:blur-[2px] group-hover:scale-[1.01]"
														/>
													) : (
														<div className="flex h-full w-full items-center justify-center text-muted">
															<Eye className="h-5 w-5" />
														</div>
													)}
												</div>
												<div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
													<div className="absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-muted/35 to-transparent" />
													<div className="absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-muted/35 to-transparent" />
												</div>
												<div className="absolute left-2 top-2 flex items-center gap-1">
													{getRarityStars(displayCard.rarity)}
												</div>
											</div>

											<div className="min-w-0 flex-1">
												<div className="flex items-center gap-2 text-xs text-muted">
													<span className="rounded-md bg-surface/80 px-2 py-1">
														{isCardSeries
															? `Series ${displayCard.cardSeriesId}`
															: `ID ${displayCard.id}`}
													</span>
													<span className="rounded-md bg-surface/80 px-2 py-1">
														Rarity {displayCard.rarity}
													</span>
												</div>
												<h3 className="mt-2 text-base font-semibold text-text line-clamp-1">
													{cardTitle}
												</h3>
												<p className="text-sm text-muted line-clamp-1">
													{displayCard.character.nameLast}{" "}
													{displayCard.character.nameFirst}
												</p>
												{displayCard.description && (
													<p className="mt-1 text-xs text-muted line-clamp-2">
														{displayCard.description}
													</p>
												)}
											</div>
										</div>
									</button>
								);
							}

							return (
								<button
									type="button"
									key={cardKey}
									onClick={() => navigate(`/card/${displayCard.id}`)}
									className={`group flex flex-col overflow-hidden rounded-2xl bg-surface shadow-sm transition-shadow hover:shadow-lg cursor-pointer border-2 border-border ${
										viewMode === "grid" ? "" : "h-32"
									}`}
									aria-label={`${cardTitle}`}
								>
									<div
										className={`relative w-full ${
											viewMode === "grid" ? "aspect-[16/9]" : "h-full"
										}`}
									>
										{imageAvailable ? (
											<img
												src={imageUrl}
												alt={cardTitle}
												className="absolute inset-0 h-full w-full object-cover transition-all duration-300 group-hover:blur-[1px] group-hover:scale-[1.01]"
											/>
										) : (
											<div className="absolute inset-0 flex items-center justify-center text-muted">
												<Eye className="h-6 w-6" />
											</div>
										)}
										<div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
											<div className="absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-muted/35 to-transparent" />
											<div className="absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-muted/35 to-transparent" />
										</div>
										<div className="absolute left-3 top-3 flex items-center gap-1">
											{getRarityStars(displayCard.rarity)}
										</div>
									</div>
									<div className="flex items-center justify-between gap-3 px-3 py-2 bg-surface/95">
										<div className="min-w-0 text-left">
											<h3 className="text-sm font-semibold text-text line-clamp-1">
												{cardTitle}
											</h3>
											<p className="text-xs text-muted line-clamp-1">
												{displayCard.character.nameLast}{" "}
												{displayCard.character.nameFirst}
											</p>
										</div>
										<div className="flex items-center gap-2 text-[11px] text-muted">
											<span className="rounded-md bg-surface/80 px-2 py-1">
												{isCardSeries
													? `${displayCard.cardSeriesId}`
													: `${displayCard.id}`}
											</span>
										</div>
									</div>
								</button>
							);
						})}
					</div>
				)}

				{/* Bottom Pagination */}
				{totalPages > 1 && (
					<div className="flex justify-center items-center gap-2 mt-6 pt-4 border-t border-border">
						<Button
							onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
							disabled={currentPage === 1}
							variant="soft"
							tone="megu"
							size="sm"
							className="flex items-center gap-2"
						>
							<ChevronLeft className="h-4 w-4" />
							Previous
						</Button>

						<div className="flex items-center gap-1">
							{Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
								const pageNum = currentPage <= 3 ? i + 1 : currentPage - 2 + i;
								if (pageNum > totalPages) return null;
								return (
									<Button
										key={pageNum}
										onClick={() => setCurrentPage(pageNum)}
										variant="soft"
										tone="saya"
										size="sm"
										className={`${
											currentPage === pageNum
												? "bg-saya text-text"
												: "bg-surface text-muted hover:bg-surface/80"
										}`}
									>
										{pageNum}
									</Button>
								);
							})}
						</div>

						<Button
							onClick={() =>
								setCurrentPage(Math.min(totalPages, currentPage + 1))
							}
							disabled={currentPage === totalPages}
							variant="soft"
							tone="megu"
							size="sm"
							className="flex items-center gap-2"
						>
							Next
							<ChevronRight className="h-4 w-4" />
						</Button>
					</div>
				)}
			</div>
		</div>
	);
};

export default CardIllustrationsPage;
