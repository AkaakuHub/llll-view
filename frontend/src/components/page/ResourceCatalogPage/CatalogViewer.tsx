import { X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { fetcher } from "../../../lib/fetcher";
import Button from "../../ui/Button";

interface CatalogItem {
	Priority: number;
	ResourceType: number;
	Size: number;
	TypeCrc: number;
	LabelCrc: number;
	StrTypeCrc: string;
	StrLabelCrc: string;
	StrContentNameCrcs: string[];
	StrDepCrcs: string[];
	StrCategoryCrcs: string[];
	RealName: string;
}

interface CatalogResponse {
	total: number;
	items: CatalogItem[];
	hasMore: boolean;
	offset: number;
	limit: number;
	error?: string;
	message?: string;
}

const CatalogViewer = () => {
	const [catalog, setCatalog] = useState<CatalogResponse | null>(null);
	const [loading, setLoading] = useState(false);
	const [selectedItem, setSelectedItem] = useState<CatalogItem | null>(null);
	const [searchTerm, setSearchTerm] = useState("");
	const [currentPage, setCurrentPage] = useState(1);
	const DEFAULT_ITEMS_PER_PAGE = 50;
	const [itemsPerPage, setItemsPerPage] = useState(DEFAULT_ITEMS_PER_PAGE);
	const [downloadingItems, setDownloadingItems] = useState<Set<string>>(
		new Set(),
	);

	const loadCatalog = useCallback(
		async (page: number, search: string, perPage: number) => {
			setLoading(true);
			try {
				const offset = (page - 1) * perPage;
				const params = new URLSearchParams({
					limit: perPage.toString(),
					offset: offset.toString(),
				});

				if (search.trim()) {
					params.append("search", search.trim());
				}

				const response = await fetcher(`/files/catalog?${params}`);
				const data = await response.json();
				setCatalog(data);
			} catch (error) {
				console.error("Failed to load catalog:", error);
				setCatalog({
					total: 0,
					items: [],
					hasMore: false,
					offset: 0,
					limit: perPage,
					error:
						error instanceof Error ? error.message : "Failed to load catalog",
				});
			}
			setLoading(false);
		},
		[],
	);

	const handleSearch = async () => {
		setCurrentPage(1);
		await loadCatalog(1, searchTerm, itemsPerPage);
	};

	const handlePageChange = async (newPage: number) => {
		setCurrentPage(newPage);
		await loadCatalog(newPage, searchTerm, itemsPerPage);
	};

	const handleItemsPerPageChange = async (newItemsPerPage: number) => {
		setItemsPerPage(newItemsPerPage);
		setCurrentPage(1);
		await loadCatalog(1, searchTerm, newItemsPerPage);
	};

	const totalPages = catalog ? Math.ceil(catalog.total / itemsPerPage) : 0;
	const displayedItems = catalog?.items || [];

	const downloadAsset = async (item: CatalogItem) => {
		const itemKey = `${item.StrLabelCrc}-${item.TypeCrc}`;
		setDownloadingItems((prev) => new Set(prev).add(itemKey));

		try {
			const response = await fetcher(
				`/files/download/${encodeURIComponent(item.StrLabelCrc)}`,
				{
					method: "POST",
				},
			);

			if (response.ok) {
				// Create download link
				const blob = await response.blob();
				const url = window.URL.createObjectURL(blob);
				const a = document.createElement("a");
				a.href = url;
				a.download = item.RealName || item.StrLabelCrc;
				document.body.appendChild(a);
				a.click();
				window.URL.revokeObjectURL(url);
				document.body.removeChild(a);
			} else {
				const error = await response.text();
				console.error("Download failed:", error);
				alert(`Download failed: ${error}`);
			}
		} catch (error) {
			console.error("Download error:", error);
			alert(
				`Download error: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
		} finally {
			setDownloadingItems((prev) => {
				const newSet = new Set(prev);
				newSet.delete(itemKey);
				return newSet;
			});
		}
	};

	const formatFileSize = (bytes: number): string => {
		if (bytes === 0) return "0 B";
		const k = 1024;
		const sizes = ["B", "KB", "MB", "GB"];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return `${parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
	};

	useEffect(() => {
		loadCatalog(1, "", 50);
	}, [loadCatalog]);

	return (
		<div className="bg-surface rounded-lg p-6 border border-border">
			<div className="flex items-center justify-between mb-4">
				<h3 className="text-lg font-semibold text-text">
					Game Resource Catalog
				</h3>
				<Button
					onClick={() => loadCatalog(currentPage, searchTerm, itemsPerPage)}
					disabled={loading}
					tone="saya"
					size="sm"
				>
					{loading ? "Loading..." : "Refresh"}
				</Button>
			</div>

			{catalog?.error && (
				<div className="bg-tuzu-100 border border-tuzu-300 text-tuzu-800 px-4 py-3 rounded mb-4">
					<div className="font-medium mb-2">Error loading catalog:</div>
					<div className="text-sm">{catalog.error}</div>
					{catalog.message && (
						<div className="text-sm mt-2 text-tuzu-600">{catalog.message}</div>
					)}
				</div>
			)}

			{catalog?.message && !catalog?.error && (
				<div className="bg-gold-100 border border-gold-300 text-gold-800 px-4 py-3 rounded mb-4">
					{catalog.message}
				</div>
			)}

			{catalog && !catalog.error && (
				<div className="space-y-4">
					{/* Statistics and Controls */}
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div className="flex items-center justify-between text-sm text-muted">
							<span>Total: {catalog.total.toLocaleString()} items</span>
							<span>
								Page {currentPage} of {totalPages.toLocaleString()}
							</span>
						</div>
						<div className="flex items-center gap-2 text-sm">
							<label htmlFor="catalog-items-per-page" className="text-muted">
								Items per page:
							</label>
							<select
								id="catalog-items-per-page"
								value={itemsPerPage}
								onChange={(e) =>
									handleItemsPerPageChange(Number(e.target.value))
								}
								className="bg-surface border border-border rounded px-2 py-1 text-text focus:border-saya-500 focus:outline-none"
							>
								<option value={25}>25</option>
								<option value={50}>50</option>
								<option value={100}>100</option>
								<option value={200}>200</option>
							</select>
						</div>
					</div>

					{/* Search */}
					<div className="flex gap-2">
						<input
							type="text"
							placeholder="Search resources..."
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							onKeyDown={(e) => e.key === "Enter" && handleSearch()}
							className="flex-1 bg-surface border border-border rounded px-3 py-2 text-text placeholder-muted focus:border-saya-500 focus:outline-none"
						/>
						<Button
							onClick={handleSearch}
							disabled={loading}
							tone="kaho"
							size="md"
						>
							Search
						</Button>
						{searchTerm && (
							<Button
								onClick={() => {
									setSearchTerm("");
									setCurrentPage(1);
									loadCatalog(1, "", itemsPerPage);
								}}
								variant="soft"
								tone="megu"
								size="md"
							>
								Clear
							</Button>
						)}
					</div>

					{selectedItem ? (
						<div className="space-y-4">
							<div className="flex items-center justify-between">
								<h4 className="font-medium text-text">
									{selectedItem.StrLabelCrc}
								</h4>
								<div className="flex items-center gap-2">
									<Button
										onClick={() => downloadAsset(selectedItem)}
										disabled={downloadingItems.has(
											`${selectedItem.StrLabelCrc}-${selectedItem.TypeCrc}`,
										)}
										tone="kozu"
										size="sm"
										className="flex items-center gap-1 text-sm"
									>
										{downloadingItems.has(
											`${selectedItem.StrLabelCrc}-${selectedItem.TypeCrc}`,
										) ? (
											<>
												<div className="animate-spin rounded-full h-3 w-3 border border-text border-t-transparent"></div>
												Downloading...
											</>
										) : (
											<>
												<svg
													className="w-4 h-4"
													fill="none"
													stroke="currentColor"
													viewBox="0 0 24 24"
												>
													<title>Download</title>
													<path
														strokeLinecap="round"
														strokeLinejoin="round"
														strokeWidth={2}
														d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
													/>
												</svg>
												Download
											</>
										)}
									</Button>
									<Button
										onClick={() => setSelectedItem(null)}
										variant="ghost"
										tone="megu"
										size="sm"
										className="text-muted hover:text-text"
									>
										<span className="inline-flex items-center gap-2">
											<X className="h-4 w-4" />
											Close
										</span>
									</Button>
								</div>
							</div>

							<div className="bg-surface p-4 rounded border border-border space-y-2">
								<div className="grid grid-cols-2 gap-4 text-sm text-muted">
									<div>
										<span className="text-muted">Type:</span>{" "}
										{selectedItem.StrTypeCrc}
									</div>
									<div>
										<span className="text-muted">Size:</span>{" "}
										{formatFileSize(selectedItem.Size)}
									</div>
									<div>
										<span className="text-muted">Priority:</span>{" "}
										{selectedItem.Priority}
									</div>
									<div>
										<span className="text-muted">Resource Type:</span>{" "}
										{selectedItem.ResourceType}
									</div>
									<div>
										<span className="text-muted">Real Name:</span>{" "}
										{selectedItem.RealName}
									</div>
								</div>

								{selectedItem.StrCategoryCrcs.length > 0 && (
									<div>
										<span className="text-muted">Categories:</span>
										<div className="flex flex-wrap gap-1 mt-1">
											{selectedItem.StrCategoryCrcs.map((cat) => (
												<span
													key={cat}
													className="bg-kaho text-text text-xs px-2 py-1 rounded"
												>
													{cat}
												</span>
											))}
										</div>
									</div>
								)}

								{selectedItem.StrContentNameCrcs.length > 0 && (
									<div>
										<span className="text-muted">Content Names:</span>
										<div className="mt-1 text-sm text-muted">
											{selectedItem.StrContentNameCrcs.join(", ")}
										</div>
									</div>
								)}

								{selectedItem.StrDepCrcs.length > 0 && (
									<div>
										<span className="text-muted">Dependencies:</span>
										<div className="mt-1 text-sm text-muted">
											{selectedItem.StrDepCrcs.join(", ")}
										</div>
									</div>
								)}
							</div>
						</div>
					) : (
						<>
							{/* Items List */}
							<div className="space-y-2 max-h-96 overflow-y-auto">
								{displayedItems.map((item) => {
									const itemKey = `${item.StrLabelCrc}-${item.TypeCrc}`;
									const isDownloading = downloadingItems.has(itemKey);

									return (
										<div
											key={itemKey}
											className="flex items-center justify-between p-3 bg-surface hover:bg-surface/80 rounded border border-border transition-colors"
										>
											<Button
												onClick={() => setSelectedItem(item)}
												variant="ghost"
												tone="text"
												size="sm"
												className="flex-1 text-left p-0 hover:bg-transparent"
											>
												<div className="font-medium text-text">
													{item.StrLabelCrc}
												</div>
												<div className="text-sm text-muted">
													{item.StrTypeCrc} • {formatFileSize(item.Size)}
													{item.StrCategoryCrcs.length > 0 && (
														<span className="ml-2">
															{item.StrCategoryCrcs.join(", ")}
														</span>
													)}
												</div>
											</Button>
											<div className="flex items-center gap-3">
												<div className="text-xs text-muted">
													{item.RealName.substring(0, 10)}...
												</div>
												<Button
													onClick={(e) => {
														e.stopPropagation();
														downloadAsset(item);
													}}
													disabled={isDownloading}
													tone="kozu"
													size="sm"
													className="flex items-center gap-1 text-xs"
												>
													{isDownloading ? (
														<>
															<div className="animate-spin rounded-full h-3 w-3 border border-text border-t-transparent"></div>
															Downloading...
														</>
													) : (
														<>
															<svg
																className="w-3 h-3"
																fill="none"
																stroke="currentColor"
																viewBox="0 0 24 24"
															>
																<title>Download</title>
																<path
																	strokeLinecap="round"
																	strokeLinejoin="round"
																	strokeWidth={2}
																	d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
																/>
															</svg>
															Download
														</>
													)}
												</Button>
											</div>
										</div>
									);
								})}

								{displayedItems.length === 0 && (
									<div className="text-center py-8 text-muted">
										{searchTerm
											? "No items match your search"
											: "No items found"}
									</div>
								)}
							</div>

							{/* Pagination */}
							{totalPages > 1 && (
								<div className="flex items-center justify-between border-t border-border pt-4">
									<div className="text-sm text-muted">
										Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
										{Math.min(currentPage * itemsPerPage, catalog.total)} of{" "}
										{catalog.total.toLocaleString()} items
									</div>
									<div className="flex items-center gap-2">
										<Button
											onClick={() => handlePageChange(1)}
											disabled={currentPage === 1 || loading}
											variant="outline"
											tone="megu"
											size="sm"
											className="text-sm text-muted"
										>
											First
										</Button>
										<Button
											onClick={() => handlePageChange(currentPage - 1)}
											disabled={currentPage === 1 || loading}
											variant="outline"
											tone="megu"
											size="sm"
											className="text-sm text-muted"
										>
											Previous
										</Button>
										<span className="px-3 py-1 text-sm text-muted">
											{currentPage} / {totalPages.toLocaleString()}
										</span>
										<Button
											onClick={() => handlePageChange(currentPage + 1)}
											disabled={currentPage === totalPages || loading}
											variant="outline"
											tone="megu"
											size="sm"
											className="text-sm text-muted"
										>
											Next
										</Button>
										<Button
											onClick={() => handlePageChange(totalPages)}
											disabled={currentPage === totalPages || loading}
											variant="outline"
											tone="megu"
											size="sm"
											className="text-sm text-muted"
										>
											Last
										</Button>
									</div>
								</div>
							)}
						</>
					)}
				</div>
			)}

			{loading && (
				<div className="flex items-center justify-center py-8">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
					<span className="ml-2 text-muted">Loading catalog...</span>
				</div>
			)}
		</div>
	);
};

export default CatalogViewer;
