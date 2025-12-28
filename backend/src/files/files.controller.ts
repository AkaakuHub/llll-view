import {
	Controller,
	Get,
	HttpException,
	HttpStatus,
	Param,
	Query,
} from "@nestjs/common";
import {
	FileContent,
	FileListResponse,
	FileSearchResponse,
	FilesService,
} from "./files.service";

@Controller("files")
export class FilesController {
	constructor(private readonly filesService: FilesService) {}

	@Get("list")
	async listFiles(@Query("path") path?: string): Promise<FileListResponse> {
		try {
			const result = await this.filesService.listFiles(path);
			return result;
		} catch (error) {
			throw new HttpException(
				`Failed to list files: ${error instanceof Error ? error.message : "Unknown error"}`,
				HttpStatus.INTERNAL_SERVER_ERROR,
			);
		}
	}

	@Get("content/*path")
	async getFileContent(@Param("path") path: string): Promise<FileContent> {
		try {
			const result = await this.filesService.getFileContent(path);
			return result;
		} catch (error) {
			throw new HttpException(
				`Failed to get file content: ${error instanceof Error ? error.message : "Unknown error"}`,
				HttpStatus.NOT_FOUND,
			);
		}
	}

	@Get("search")
	async searchFiles(
		@Query("query") query: string,
		@Query("types") types?: string,
		@Query("limit") limit: string = "50",
		@Query("offset") offset: string = "0",
	): Promise<FileSearchResponse> {
		try {
			const fileTypes = types ? types.split(",") : [];
			const limitNum = Math.min(Math.max(parseInt(limit) || 50, 1), 100);
			const offsetNum = Math.max(parseInt(offset) || 0, 0);
			const result = await this.filesService.searchFiles(
				query,
				fileTypes,
				limitNum,
				offsetNum,
			);
			return result;
		} catch (error) {
			throw new HttpException(
				`Failed to search files: ${error instanceof Error ? error.message : "Unknown error"}`,
				HttpStatus.INTERNAL_SERVER_ERROR,
			);
		}
	}
}
