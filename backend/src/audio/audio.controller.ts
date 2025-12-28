import {
	Controller,
	Get,
	HttpException,
	HttpStatus,
	Query,
} from "@nestjs/common";
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from "@nestjs/swagger";
import { AudioService } from "./audio.service";

@ApiTags("audio")
@Controller("audio")
export class AudioController {
	constructor(private readonly audioService: AudioService) {}

	@Get("files")
	@ApiOperation({
		summary: "Get audio files",
		description: "Retrieve audio files list by category",
	})
	@ApiQuery({
		name: "category",
		required: false,
		description: "Audio category filter",
	})
	@ApiResponse({
		status: 200,
		description: "Audio files retrieved successfully",
	})
	@ApiResponse({ status: 500, description: "Internal server error" })
	async getAudioFiles(@Query("category") category?: string) {
		try {
			const audioCategory = category
				? (category.toUpperCase() as string)
				: undefined;
			const files = await this.audioService.getAudioFiles(audioCategory);
			return {
				success: true,
				data: files,
			};
		} catch (error) {
			throw new HttpException(
				`Failed to get audio files: ${error instanceof Error ? error.message : "Unknown error"}`,
				HttpStatus.INTERNAL_SERVER_ERROR,
			);
		}
	}
}
