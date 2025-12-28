import {
	File,
	FileArchive,
	FileImage,
	FileMusic,
	FileVideo,
	Folder,
	X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { fetcher } from "../../../lib/fetcher";
import Button from "../../ui/Button";

interface FileItem {
	name: string;
	type: "file" | "directory" | "audio" | "video" | "image" | "bundle";
	size: number;
	modified: string;
	path: string;
}

interface FileListResponse {
	currentPath: string;
	items: FileItem[];
	error?: string;
}

interface FileContent {
	filename: string;
	size: number;
	content: string;
	type: string;
	extension: string;
	error?: string;
}

const FileViewer = () => {
	const [currentPath, setCurrentPath] = useState<string>("");
	const [files, setFiles] = useState<FileItem[]>([]);
	const [selectedFile, setSelectedFile] = useState<FileContent | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string>("");
	const [searchQuery, setSearchQuery] = useState<string>("");
	const [searchResults, setSearchResults] = useState<FileItem[]>([]);
	const [selectedFileTypes, setSelectedFileTypes] = useState<string[]>([]);
	const [currentView, setCurrentView] = useState<"browser" | "search">(
		"browser",
	);

	const getItemIcon = (type: FileItem["type"]) => {
		switch (type) {
			case "directory":
				return <Folder className="h-5 w-5 text-kaho" />;
			case "audio":
				return <FileMusic className="h-5 w-5 text-saya" />;
			case "video":
				return <FileVideo className="h-5 w-5 text-hime" />;
			case "image":
				return <FileImage className="h-5 w-5 text-kozu" />;
			case "bundle":
				return <FileArchive className="h-5 w-5 text-sera" />;
			default:
				return <File className="h-5 w-5 text-megu" />;
		}
	};

	const fileTypeOptions = [
		{ value: "audio", label: "Audio (.acb, .wav, .mp3)" },
		{ value: "video", label: "Video (.usm, .mp4)" },
		{ value: "bundle", label: "Asset Bundle (.assetbundle)" },
		{ value: "image", label: "Images (.webp, .png, .jpg, .gif)" },
	];

	const loadFiles = useCallback(async (path: string = "") => {
		setLoading(true);
		setError("");
		try {
			const url = path
				? `/files/list?path=${encodeURIComponent(path)}`
				: "/files/list";

			const response = await fetcher(url);
			const data: FileListResponse = await response.json();

			if (data.error) {
				setError(data.error);
			} else {
				setFiles(data.items);
				setCurrentPath(data.currentPath);
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to load files");
		}
		setLoading(false);
	}, []);

	const loadFileContent = async (filePath: string) => {
		setLoading(true);
		try {
			const response = await fetcher(
				`/files/content/${encodeURIComponent(filePath)}`,
			);
			const data: FileContent = await response.json();
			setSelectedFile(data);
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "Failed to load file content",
			);
		}
		setLoading(false);
	};

	const handleItemClick = (item: FileItem) => {
		if (item.type === "directory") {
			loadFiles(item.path);
		} else {
			loadFileContent(item.path);
		}
	};

	const goBack = () => {
		if (currentPath) {
			const parentPath = currentPath.split("/").slice(0, -1).join("/");
			loadFiles(parentPath);
		}
	};

	const formatFileSize = (bytes: number): string => {
		if (bytes === 0) return "0 B";
		const k = 1024;
		const sizes = ["B", "KB", "MB", "GB"];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return `${parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
	};

	const formatDate = (dateString: string): string => {
		return new Date(dateString).toLocaleString();
	};

	const searchFiles = async () => {
		if (!searchQuery.trim()) return;

		setLoading(true);
		setError("");
		try {
			const typesParam =
				selectedFileTypes.length > 0
					? `&types=${selectedFileTypes.join(",")}`
					: "";
			const response = await fetcher(
				`/files/search?q=${encodeURIComponent(searchQuery.trim())}${typesParam}`,
			);
			const data = await response.json();

			if (data.error) {
				setError(data.error);
				setSearchResults([]);
			} else {
				setSearchResults(data.results || []);
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to search files");
			setSearchResults([]);
		} finally {
			setLoading(false);
		}
	};

	const toggleFileType = (type: string) => {
		setSelectedFileTypes((prev) =>
			prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
		);
	};

	useEffect(() => {
		loadFiles();
	}, [loadFiles]);

	return (
		<div className="bg-surface rounded-lg p-6 shadow-lg border border-border">
			<div className="flex items-center justify-between mb-4">
				<h3 className="text-lg font-semibold text-text">File Explorer</h3>
				<div className="flex space-x-2">
					{currentPath && currentView === "browser" && (
						<Button
							onClick={goBack}
							variant="soft"
							tone="megu"
							size="sm"
							className="rounded text-sm"
						>
							← Back
						</Button>
					)}
				</div>
			</div>

			{/* View Toggle */}
			<div className="flex space-x-2 mb-4">
				<Button
					onClick={() => setCurrentView("browser")}
					tone="saya"
					size="md"
					className={`rounded-md ${
						currentView === "browser"
							? "bg-saya text-text"
							: "bg-muted/30 text-muted hover:bg-muted/50"
					}`}
				>
					File Browser
				</Button>
				<Button
					onClick={() => setCurrentView("search")}
					tone="saya"
					size="md"
					className={`rounded-md ${
						currentView === "search"
							? "bg-saya text-text"
							: "bg-muted/30 text-muted hover:bg-muted/50"
					}`}
				>
					Asset Search
				</Button>
			</div>

			{error && (
				<div className="bg-tuzu/10 border border-tuzu/30 text-tuzu px-4 py-3 rounded mb-4">
					{error}
				</div>
			)}

			{currentView === "browser" ? (
				<>
					<div className="text-sm text-muted mb-2">
						Path: /{currentPath || "root"}
					</div>

					{loading ? (
						<div className="flex items-center justify-center py-8">
							<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-saya"></div>
							<span className="ml-2 text-muted">Loading...</span>
						</div>
					) : selectedFile ? (
						<div className="space-y-4">
							<div className="flex items-center justify-between">
								<h4 className="font-medium text-text">
									{selectedFile.filename}
								</h4>
								<Button
									onClick={() => setSelectedFile(null)}
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

							{selectedFile.error ? (
								<div className="text-tuzu">{selectedFile.error}</div>
							) : (
								<div className="space-y-2">
									<div className="text-sm text-muted">
										Size: {formatFileSize(selectedFile.size)} | Type:{" "}
										{selectedFile.type}
									</div>
									<div className="bg-muted/20 p-4 rounded overflow-auto max-h-96">
										<pre className="text-sm whitespace-pre-wrap text-text">
											{selectedFile.content}
										</pre>
									</div>
								</div>
							)}
						</div>
					) : (
						<div className="space-y-2">
							{files.map((item) => (
								<Button
									key={item.name}
									onClick={() => handleItemClick(item)}
									variant="soft"
									tone="megu"
									size="md"
									className="flex w-full items-center justify-between p-3 bg-muted/20 hover:bg-muted/30 text-left"
								>
									<div className="flex items-center space-x-3 min-w-0 flex-1">
										{getItemIcon(item.type)}
										<div className="min-w-0">
											<div className="font-medium text-text truncate">
												{item.name}
											</div>
											<div className="text-xs text-muted truncate">
												{item.type === "file" && formatFileSize(item.size)}
											</div>
										</div>
									</div>
									<div className="text-xs text-muted flex-shrink-0 ml-auto">
										{formatDate(item.modified)}
									</div>
								</Button>
							))}

							{files.length === 0 && !loading && (
								<div className="text-center py-8 text-muted">
									No files found
								</div>
							)}
						</div>
					)}
				</>
			) : (
				<>
					{/* Asset Search Interface */}
					<div className="space-y-4">
						<div className="flex space-x-2">
							<input
								type="text"
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								placeholder="Search asset files (e.g., character names, song titles)..."
								className="flex-1 bg-surface border border-border rounded-md px-3 py-2 text-text placeholder-muted"
								onKeyDown={(e) => e.key === "Enter" && searchFiles()}
							/>
							<Button
								onClick={searchFiles}
								tone="saya"
								size="md"
								className="rounded-md"
							>
								Search
							</Button>
						</div>

						{/* File Type Filters */}
						<div className="flex flex-wrap gap-2">
							<span className="text-sm font-medium text-muted">
								Filter by type:
							</span>
							{fileTypeOptions.map((option) => (
								<Button
									key={option.value}
									onClick={() => toggleFileType(option.value)}
									tone="saya"
									size="sm"
									className={`rounded-md text-sm ${
										selectedFileTypes.includes(option.value)
											? "bg-saya text-text"
											: "bg-muted/30 text-muted hover:bg-muted/50"
									}`}
								>
									{option.label}
								</Button>
							))}
							{selectedFileTypes.length > 0 && (
								<Button
									onClick={() => setSelectedFileTypes([])}
									tone="tuzu"
									size="sm"
									className="rounded-md text-sm"
								>
									Clear All
								</Button>
							)}
						</div>

						{/* Search Results */}
						{loading ? (
							<div className="flex items-center justify-center py-8">
								<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-saya"></div>
								<span className="ml-2 text-muted">Searching...</span>
							</div>
						) : searchResults.length > 0 ? (
							<div className="space-y-2">
								<h4 className="font-medium text-text">
									Found {searchResults.length} files
								</h4>
								<div className="max-h-96 overflow-y-auto space-y-2">
									{searchResults.map((result) => (
										<Button
											key={result.path}
											onClick={() => loadFileContent(result.path)}
											variant="soft"
											tone="megu"
											size="md"
											className="flex w-full items-center justify-between p-3 bg-muted/20 hover:bg-muted/30 text-left"
										>
											<div className="flex items-center space-x-3 min-w-0 flex-1">
												{getItemIcon(result.type)}
												<div className="min-w-0">
													<div className="font-medium text-text truncate">
														{result.name}
													</div>
													<div className="text-xs text-muted truncate">
														{result.type} • {formatFileSize(result.size)}
													</div>
												</div>
											</div>
											<div className="text-xs text-muted flex-shrink-0 ml-auto">
												{formatDate(result.modified)}
											</div>
										</Button>
									))}
								</div>
							</div>
						) : searchQuery && !loading ? (
							<div className="text-center py-8 text-muted">
								No files found for "{searchQuery}"
							</div>
						) : (
							<div className="text-center py-8 text-muted">
								Enter a search term to find asset files
							</div>
						)}
					</div>
				</>
			)}
		</div>
	);
};

export default FileViewer;
