import { exec } from "node:child_process";
import { readdir, readFile, stat } from "node:fs/promises";
import * as path from "node:path";
import { promisify } from "node:util";
import { Injectable } from "@nestjs/common";
import { GlobalConfigService } from "../config/global-config.service";
import { AppLoggerService } from "../logger/logger.service";

const execAsync = promisify(exec);

@Injectable()
export class FileService {
	private readonly logger;
	private readonly sometoolPath: string;
	private readonly sometoolBinaryPath: string;

	constructor(
		private globalConfig: GlobalConfigService,
		private appLoggerService: AppLoggerService,
	) {
		this.logger = this.appLoggerService.createLogger(FileService.name);
		this.sometoolPath = path.resolve(this.globalConfig.getSometoolDirPath());
		this.sometoolBinaryPath = path.resolve(
			this.globalConfig.getSometoolBinaryPath(),
		);
	}

	async listFiles(relativePath?: string): Promise<Record<string, unknown>> {
		try {
			const targetPath = relativePath
				? path.join(this.sometoolPath, relativePath)
				: this.sometoolPath;

			const items = await readdir(targetPath);
			const result = [];

			for (const item of items) {
				const itemPath = path.join(targetPath, item);
				const stats = await stat(itemPath);

				result.push({
					name: item,
					type: stats.isDirectory() ? "directory" : "file",
					size: stats.size,
					modified: stats.mtime,
					path: relativePath ? path.join(relativePath, item) : item,
				});
			}

			// Add total count for assets directory
			let totalAssets = 0;
			if (relativePath === "cache/assets") {
				totalAssets = result.filter((item) => item.type === "file").length;
			}

			return {
				currentPath: relativePath || "",
				items: result.sort((a, b) => {
					if (a.type !== b.type) {
						return a.type === "directory" ? -1 : 1;
					}
					return a.name.localeCompare(b.name);
				}),
				totalAssets: totalAssets || undefined,
			};
		} catch (error) {
			return {
				error: error instanceof Error ? error.message : "Unknown error",
				currentPath: relativePath || "",
				items: [],
			};
		}
	}

	async getFileContent(filename: string): Promise<Record<string, unknown>> {
		try {
			const filePath = path.join(this.sometoolPath, filename);
			const stats = await stat(filePath);

			if (stats.isDirectory()) {
				return { error: "Path is a directory", type: "directory" };
			}

			// Check file size (limit to 10MB for safety)
			if (stats.size > 10 * 1024 * 1024) {
				return {
					error: "File too large to display",
					size: stats.size,
					type: "file",
				};
			}

			const content = await readFile(filePath, "utf-8");
			const extension = path.extname(filename).toLowerCase();

			return {
				filename,
				size: stats.size,
				modified: stats.mtime,
				content,
				type: this.getFileType(extension),
				extension,
			};
		} catch (error) {
			return {
				error: error instanceof Error ? error.message : "Unknown error",
				filename,
			};
		}
	}

	async getCatalog(
		search?: string,
		limit = 100,
		offset = 0,
	): Promise<Record<string, unknown>> {
		try {
			const catalogPath = path.resolve(
				this.sometoolPath,
				"cache",
				"catalog.json",
			);

			// Check if catalog.json exists
			if (!(await this.pathExists(catalogPath))) {
				return {
					total: 0,
					items: [],
					hasMore: false,
					offset: 0,
					limit,
					search: search || null,
					error: `Catalog not found at ${catalogPath}. Please run sometool to generate catalog.json`,
				};
			}

			const content = await readFile(catalogPath, "utf-8");
			let catalog = JSON.parse(content);

			// Apply search filter if provided
			if (search) {
				const searchLower = search.toLowerCase();
				catalog = catalog.filter(
					(item: Record<string, unknown>) =>
						(item.StrLabelCrc &&
							(item.StrLabelCrc as string)
								.toLowerCase()
								.includes(searchLower)) ||
						(item.StrTypeCrc &&
							(item.StrTypeCrc as string)
								.toLowerCase()
								.includes(searchLower)) ||
						(item.RealName &&
							(item.RealName as string).toLowerCase().includes(searchLower)) ||
						(item.StrCategoryCrcs &&
							Array.isArray(item.StrCategoryCrcs) &&
							(item.StrCategoryCrcs as string[]).some((cat) =>
								cat.toLowerCase().includes(searchLower),
							)),
				);
			}

			const total = catalog.length;
			const items = catalog.slice(offset, offset + limit);

			return {
				total,
				items,
				hasMore: offset + limit < total,
				offset,
				limit,
				search: search || null,
			};
		} catch (error) {
			return {
				error: error instanceof Error ? error.message : "Unknown error",
				total: 0,
				items: [],
				hasMore: false,
				offset: 0,
				limit,
				search: search || null,
			};
		}
	}

	async searchFiles(
		query: string,
		fileTypes?: string[],
	): Promise<Record<string, unknown>> {
		try {
			const plainPath = path.resolve(this.sometoolPath, "cache", "plain");

			if (!(await this.pathExists(plainPath))) {
				return {
					error: `Plain cache directory not found at ${plainPath}. Please run sometool to download assets first.`,
					results: [],
					total: 0,
				};
			}

			const results = [];
			const files = await readdir(plainPath);
			const queryLower = query.toLowerCase();

			for (const file of files) {
				const filePath = path.join(plainPath, file);
				const stats = await stat(filePath);

				if (stats.isFile()) {
					const extension = path.extname(file).toLowerCase();

					// Filter by file types if specified
					if (fileTypes && fileTypes.length > 0) {
						const matchesType = fileTypes.some((type) => {
							switch (type) {
								case "audio":
									return [".acb", ".wav", ".mp3", ".ogg"].includes(extension);
								case "video":
									return [".usm", ".mp4", ".avi", ".mov"].includes(extension);
								case "bundle":
									return extension === ".assetbundle";
								case "image":
									return [
										".webp",
										".png",
										".jpg",
										".jpeg",
										".gif",
										".bmp",
									].includes(extension);
								default:
									return extension === `.${type}`;
							}
						});

						if (!matchesType) continue;
					}

					// Check if filename matches query
					if (file.toLowerCase().includes(queryLower)) {
						results.push({
							name: file,
							path: path.join("cache", "plain", file),
							size: stats.size,
							modified: stats.mtime,
							type: this.getAssetType(extension),
							extension,
						});
					}
				}
			}

			return {
				results: results.slice(0, 200), // Limit results for performance
				total: results.length,
				query,
				fileTypes: fileTypes || [],
			};
		} catch (error) {
			return {
				error: error instanceof Error ? error.message : "Unknown error",
				results: [],
				total: 0,
				query,
				fileTypes: fileTypes || [],
			};
		}
	}

	private async pathExists(path: string): Promise<boolean> {
		try {
			await stat(path);
			return true;
		} catch {
			return false;
		}
	}

	private getAssetType(extension: string): string {
		switch (extension) {
			case ".acb":
				return "audio";
			case ".usm":
				return "video";
			case ".assetbundle":
				return "bundle";
			case ".webp":
			case ".png":
			case ".jpg":
			case ".jpeg":
			case ".gif":
			case ".bmp":
				return "image";
			default:
				return "unknown";
		}
	}

	async getAssetStats(): Promise<Record<string, unknown>> {
		try {
			const plainPath = path.resolve(this.sometoolPath, "cache", "plain");
			const catalogPath = path.resolve(
				this.sometoolPath,
				"cache",
				"catalog.json",
			);

			let downloadedCount = 0;
			let totalSize = 0;
			let totalExpected = 0;

			// Count files in plain directory (these are the actual extracted assets)
			try {
				const plainFiles = await readdir(plainPath);
				downloadedCount = plainFiles.length;

				// Calculate total size
				for (const file of plainFiles) {
					const filePath = path.join(plainPath, file);
					const stats = await stat(filePath);
					totalSize += stats.size;
				}
			} catch {
				// Plain directory doesn't exist yet
				this.logger.warn(`Plain directory not accessible: ${plainPath}`);
			}

			// Get expected total from catalog
			try {
				const catalogContent = await readFile(catalogPath, "utf-8");
				const catalog = JSON.parse(catalogContent);
				totalExpected = Array.isArray(catalog)
					? catalog.length
					: catalog.total || 0;
			} catch {
				// Catalog doesn't exist yet
				this.logger.warn(`Catalog not accessible: ${catalogPath}`);
			}

			// Also get asset bundle counts for more detailed stats
			let assetBundleCount = 0;
			let storyFileCount = 0;
			let audioFileCount = 0;
			let otherFileCount = 0;

			try {
				const plainFiles = await readdir(plainPath);
				for (const file of plainFiles) {
					if (file.endsWith(".assetbundle")) {
						assetBundleCount++;
					} else if (file.startsWith("story_main_") && file.endsWith(".txt")) {
						storyFileCount++;
					} else if (file.endsWith(".acb") || file.endsWith(".awb")) {
						audioFileCount++;
					} else {
						otherFileCount++;
					}
				}
			} catch (error) {
				this.logger.warn(
					`Failed to count file types in ${plainPath}: ${error}`,
				);
			}

			return {
				downloaded: downloadedCount,
				totalExpected,
				totalSize,
				progress:
					totalExpected > 0
						? ((downloadedCount / totalExpected) * 100).toFixed(1)
						: 0,
				formattedSize: this.formatFileSize(totalSize),
				breakdown: {
					assetBundles: assetBundleCount,
					storyFiles: storyFileCount,
					audioFiles: audioFileCount,
					otherFiles: otherFileCount,
				},
			};
		} catch (error) {
			return {
				error: error instanceof Error ? error.message : "Unknown error",
				downloaded: 0,
				totalExpected: 0,
				totalSize: 0,
				progress: 0,
				breakdown: {
					assetBundles: 0,
					storyFiles: 0,
					audioFiles: 0,
					otherFiles: 0,
				},
			};
		}
	}

	private formatFileSize(bytes: number): string {
		if (bytes === 0) return "0 B";
		const k = 1024;
		const sizes = ["B", "KB", "MB", "GB"];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return `${parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
	}

	private getFileType(extension: string): string {
		switch (extension) {
			case ".json":
				return "json";
			case ".txt":
			case ".log":
				return "text";
			case ".md":
				return "markdown";
			case ".go":
				return "go";
			case ".js":
			case ".ts":
				return "javascript";
			case ".webp":
			case ".png":
			case ".jpg":
			case ".jpeg":
			case ".gif":
				return "image";
			default:
				return "unknown";
		}
	}

	async downloadAsset(assetLabel: string): Promise<{
		success: boolean;
		filePath?: string;
		fileName?: string;
		error?: string;
	}> {
		try {
			// First, find the asset in catalog
			const catalogPath = path.resolve(
				this.sometoolPath,
				"cache",
				"catalog.json",
			);

			if (!(await this.pathExists(catalogPath))) {
				return {
					success: false,
					error:
						"Catalog not found. Please run sometool to generate catalog.json",
				};
			}

			const catalogContent = await readFile(catalogPath, "utf-8");
			const catalog = JSON.parse(catalogContent);

			const asset = catalog.find(
				(item: Record<string, unknown>) => item.StrLabelCrc === assetLabel,
			);
			if (!asset) {
				return {
					success: false,
					error: `Asset with label '${assetLabel}' not found in catalog`,
				};
			}

			// Check if file already exists in cache/plain
			const plainPath = path.resolve(this.sometoolPath, "cache", "plain");
			const assetFileName = asset.RealName || `${assetLabel}.bin`;
			const assetFilePath = path.join(plainPath, assetFileName);

			if (await this.pathExists(assetFilePath)) {
				// File already exists, return it
				return {
					success: true,
					filePath: assetFilePath,
					fileName: assetFileName,
				};
			}

			// File doesn't exist, need to download it using sometool
			const command = `cd ${this.sometoolPath} && ${this.sometoolBinaryPath} --download --target="${assetLabel}"`;

			this.logger.log(`Executing download command: ${command}`);
			const { stderr } = await execAsync(command, {
				maxBuffer: 1024 * 1024 * 10, // 10MB buffer
				timeout: 60000, // 60 second timeout
			});

			// Check if file was downloaded
			if (await this.pathExists(assetFilePath)) {
				return {
					success: true,
					filePath: assetFilePath,
					fileName: assetFileName,
				};
			} else {
				return {
					success: false,
					error: `Download command executed but file not found: ${stderr || "Unknown error"}`,
				};
			}
		} catch (error) {
			this.logger.error(`Download error: ${error}`);
			return {
				success: false,
				error:
					error instanceof Error ? error.message : "Unknown download error",
			};
		}
	}
}
