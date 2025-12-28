import * as fs from "node:fs/promises";
import * as path from "node:path";
import { Injectable } from "@nestjs/common";
import { GlobalConfigService } from "../config/global-config.service";
import { AppLoggerService } from "../logger/logger.service";

interface FileItem {
	name: string;
	type: "file" | "directory" | "audio" | "video" | "image" | "bundle";
	size: number;
	modified: string;
	path: string;
}

export interface FileListResponse {
	currentPath: string;
	items: FileItem[];
	error?: string;
}

export interface FileSearchResponse {
	items: FileItem[];
	pagination: {
		total: number;
		offset: number;
		limit: number;
		hasMore: boolean;
	};
}

export interface FileContent {
	filename: string;
	size: number;
	content: string;
	type: string;
	extension: string;
	error?: string;
}

@Injectable()
export class FilesService {
	private readonly logger;

	constructor(
		private globalConfig: GlobalConfigService,
		private appLoggerService: AppLoggerService,
	) {
		this.logger = this.appLoggerService.createLogger(FilesService.name);
	}

	private getBasePath(): string {
		return this.globalConfig.getProjectRootPath();
	}

	private getAllowedPaths(): string[] {
		return [
			path.join(this.globalConfig.getSometoolDirPath(), "cache"),
			this.globalConfig.getMasterdataPath(),
			this.globalConfig.getTempPath(),
			this.globalConfig.getToolsRootPath(),
		];
	}

	private isPathAllowed(targetPath: string): boolean {
		const resolvedPath = path.resolve(targetPath);
		return this.getAllowedPaths().some((allowedPath) =>
			resolvedPath.startsWith(path.resolve(allowedPath)),
		);
	}

	private getFileType(
		filename: string,
		isDirectory: boolean,
	): FileItem["type"] {
		if (isDirectory) return "directory";

		const ext = path.extname(filename).toLowerCase();

		if ([".acb", ".wav", ".mp3", ".m4a", ".ogg"].includes(ext)) return "audio";
		if ([".usm", ".mp4", ".avi", ".mov"].includes(ext)) return "video";
		if ([".webp", ".png", ".jpg", ".jpeg", ".gif", ".bmp"].includes(ext))
			return "image";
		if ([".assetbundle", ".bundle"].includes(ext)) return "bundle";

		return "file";
	}

	async listFiles(relativePath: string = ""): Promise<FileListResponse> {
		try {
			const targetPath = relativePath
				? path.join(this.getBasePath(), relativePath)
				: this.getBasePath();

			if (!this.isPathAllowed(targetPath)) {
				return {
					currentPath: relativePath,
					items: [],
					error: "Access denied to this directory",
				};
			}

			const stats = await fs.stat(targetPath);
			if (!stats.isDirectory()) {
				return {
					currentPath: relativePath,
					items: [],
					error: "Path is not a directory",
				};
			}

			const entries = await fs.readdir(targetPath, { withFileTypes: true });
			const items: FileItem[] = [];

			for (const entry of entries) {
				try {
					const entryPath = path.join(targetPath, entry.name);
					const entryStat = await fs.stat(entryPath);
					const relativePath = path.relative(this.getBasePath(), entryPath);

					items.push({
						name: entry.name,
						type: this.getFileType(entry.name, entry.isDirectory()),
						size: entryStat.size,
						modified: entryStat.mtime.toISOString(),
						path: relativePath,
					});
				} catch {
					// Skip files that can't be accessed
					this.logger.warn(`Cannot access file: ${entry.name}`);
				}
			}

			// Sort directories first, then files
			items.sort((a, b) => {
				if (a.type === "directory" && b.type !== "directory") return -1;
				if (a.type !== "directory" && b.type === "directory") return 1;
				return a.name.localeCompare(b.name);
			});

			return {
				currentPath: relativePath,
				items,
			};
		} catch (error) {
			return {
				currentPath: relativePath,
				items: [],
				error: error instanceof Error ? error.message : "Unknown error",
			};
		}
	}

	async getFileContent(relativePath: string): Promise<FileContent> {
		try {
			const targetPath = path.join(this.getBasePath(), relativePath);

			if (!this.isPathAllowed(targetPath)) {
				throw new Error("Access denied to this file");
			}

			const stats = await fs.stat(targetPath);
			if (stats.isDirectory()) {
				throw new Error("Cannot read directory as file");
			}

			const filename = path.basename(targetPath);
			const extension = path.extname(filename).toLowerCase();

			// Limit file size for reading (10MB max)
			if (stats.size > 10 * 1024 * 1024) {
				throw new Error("File too large to display");
			}

			let content = "";
			let type = "binary";

			// Only read text files and small binary files
			if (
				[".txt", ".json", ".log", ".md", ".yaml", ".yml", ".xml"].includes(
					extension,
				)
			) {
				content = await fs.readFile(targetPath, "utf-8");
				type = "text";
			} else if (
				[".webp", ".png", ".jpg", ".jpeg", ".gif"].includes(extension)
			) {
				// For images, just provide file info
				content = "Binary image file";
				type = "image";
			} else {
				content = "Binary file - cannot display content";
				type = "binary";
			}

			return {
				filename,
				size: stats.size,
				content,
				type,
				extension,
			};
		} catch (error) {
			throw new Error(error instanceof Error ? error.message : "Unknown error");
		}
	}

	async searchFiles(
		query: string,
		fileTypes: string[] = [],
		limit: number = 50,
		offset: number = 0,
	): Promise<FileSearchResponse> {
		const results: FileItem[] = [];

		const searchInDirectory = async (dirPath: string) => {
			try {
				if (!this.isPathAllowed(dirPath)) return;

				// Check if path is actually a directory before scanning
				const stats = await fs.stat(dirPath);
				if (!stats.isDirectory()) return;

				const entries = await fs.readdir(dirPath, { withFileTypes: true });

				for (const entry of entries) {
					const entryPath = path.join(dirPath, entry.name);

					try {
						const entryStat = await fs.stat(entryPath);
						const relativePath = path.relative(this.getBasePath(), entryPath);
						const fileType = this.getFileType(entry.name, entry.isDirectory());

						// Check if filename matches query
						const matchesQuery = entry.name
							.toLowerCase()
							.includes(query.toLowerCase());

						// Check if file type matches filter
						const matchesType =
							fileTypes.length === 0 || fileTypes.includes(fileType);

						if (matchesQuery && matchesType) {
							results.push({
								name: entry.name,
								type: fileType,
								size: entryStat.size,
								modified: entryStat.mtime.toISOString(),
								path: relativePath,
							});
						}

						// Recursively search directories (limited depth)
						if (entry.isDirectory() && relativePath.split("/").length < 10) {
							await searchInDirectory(entryPath);
						}
					} catch {
						// Skip files that can't be accessed
						this.logger.warn(`Cannot access file: ${entryPath}`);
					}
				}
			} catch {
				// Skip directories that can't be accessed
			}
		};

		// Search in allowed paths
		for (const allowedPath of this.getAllowedPaths()) {
			await searchInDirectory(allowedPath);
		}

		// Sort results by name
		results.sort((a, b) => a.name.localeCompare(b.name));

		const total = results.length;
		const paginatedResults = results.slice(offset, offset + limit);
		const hasMore = offset + limit < total;

		return {
			items: paginatedResults,
			pagination: {
				total,
				offset,
				limit,
				hasMore,
			},
		};
	}
}
