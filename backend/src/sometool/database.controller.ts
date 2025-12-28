import { Controller, Get, Param, Post, Query } from "@nestjs/common";
import { DatabaseService } from "./database.service";

@Controller("database")
export class DatabaseController {
	constructor(private readonly databaseService: DatabaseService) {}

	@Get("list")
	async getDatabases() {
		return await this.databaseService.getDatabases();
	}

	@Get("table/:tableName")
	async getTableData(
		@Param("tableName") tableName: string,
		@Query("limit") limit?: string,
		@Query("offset") offset?: string,
		@Query("search") search?: string,
	) {
		const parsedLimit = limit ? parseInt(limit, 10) : 100;
		const parsedOffset = offset ? parseInt(offset, 10) : 0;
		return await this.databaseService.getTableData(
			tableName,
			parsedLimit,
			parsedOffset,
			search,
		);
	}

	@Get("stories/search")
	async searchStories(
		@Query("q") query: string,
		@Query("limit") limit?: string,
	) {
		const parsedLimit = limit ? parseInt(limit, 10) : 50;
		return await this.databaseService.searchStories(query, parsedLimit);
	}

	@Post("stories/index")
	async indexStoryDialogues() {
		return await this.databaseService.indexStoryDialogues();
	}

	@Get("stories/search-dialogue")
	async searchStoryDialogues(
		@Query("q") query: string,
		@Query("limit") limit?: string,
	) {
		const parsedLimit = limit ? parseInt(limit, 10) : 50;
		return await this.databaseService.searchStoryDialogues(query, parsedLimit);
	}

	@Get("stories/latest")
	async getLatestStories(
		@Query("limit") limit?: string,
		@Query("offset") offset?: string,
	) {
		const parsedLimit = limit ? parseInt(limit, 10) : 50;
		const parsedOffset = offset ? parseInt(offset, 10) : 0;
		return await this.databaseService.getLatestStories(
			parsedLimit,
			parsedOffset,
		);
	}

	@Get("stories/:storyId")
	async getStoryContent(@Param("storyId") storyId: string) {
		return await this.databaseService.getStoryContent(storyId);
	}
}
