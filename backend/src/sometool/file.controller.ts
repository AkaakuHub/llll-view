import { createReadStream } from "node:fs";
import {
	Controller,
	Get,
	HttpException,
	HttpStatus,
	Param,
	Post,
	Query,
	StreamableFile,
} from "@nestjs/common";
import { AppLoggerService } from "../logger/logger.service";
import { FileService } from "./file.service";

@Controller("files")
export class FileController {
	private readonly logger;

	constructor(
		private readonly fileService: FileService,
		private readonly appLoggerService: AppLoggerService,
	) {
		this.logger = this.appLoggerService.createLogger(FileController.name);
	}

	@Get("list")
	async listFiles(@Query("path") path?: string) {
		return await this.fileService.listFiles(path);
	}

	@Get("content/:filename")
	async getFileContent(@Param("filename") filename: string) {
		return await this.fileService.getFileContent(filename);
	}

	@Get("catalog")
	async getCatalog(
		@Query("search") search?: string,
		@Query("limit") limit?: string,
		@Query("offset") offset?: string,
	) {
		const parsedLimit = limit ? parseInt(limit, 10) : 100;
		const parsedOffset = offset ? parseInt(offset, 10) : 0;
		return await this.fileService.getCatalog(search, parsedLimit, parsedOffset);
	}

	@Get("assets/stats")
	async getAssetStats() {
		return await this.fileService.getAssetStats();
	}

	@Get("search")
	async searchFiles(@Query("q") query: string, @Query("types") types?: string) {
		const fileTypes = types ? types.split(",") : undefined;
		return await this.fileService.searchFiles(query, fileTypes);
	}

	@Post("download/:assetLabel")
	async downloadAsset(
		@Param("assetLabel") assetLabel: string,
	): Promise<StreamableFile> {
		try {
			const result = await this.fileService.downloadAsset(assetLabel);

			if (!result.success) {
				throw new HttpException(
					result.error || "Download failed",
					HttpStatus.BAD_REQUEST,
				);
			}

			if (!result.filePath || !result.fileName) {
				throw new HttpException(
					"File path not provided",
					HttpStatus.INTERNAL_SERVER_ERROR,
				);
			}

			// Create file stream
			const file = createReadStream(result.filePath);

			return new StreamableFile(file, {
				type: "application/octet-stream",
				disposition: `attachment; filename="${result.fileName}"`,
			});
		} catch (error) {
			this.logger.error(`Download endpoint error: ${error}`);
			if (error instanceof HttpException) {
				throw error;
			}
			throw new HttpException(
				error instanceof Error ? error.message : "Internal server error",
				HttpStatus.INTERNAL_SERVER_ERROR,
			);
		}
	}
}
