import {
	Controller,
	Delete,
	Get,
	HttpException,
	HttpStatus,
	Param,
	Query,
} from "@nestjs/common";
import { AudioService } from "../audio.service";

@Controller("audio/files")
export class AudioFilesController {
	constructor(private readonly audioService: AudioService) {}

	// オーディオファイル一覧取得
	@Get()
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

	// 特定のオーディオファイルを未変換状態にリセット
	@Delete(":id")
	async resetAudioFile(@Param("id") id: string) {
		try {
			const resetFile = await this.audioService.resetAudioFileToUnconverted(id);
			return {
				success: true,
				message: "Audio file reset to unconverted state successfully",
				data: resetFile,
			};
		} catch (error) {
			throw new HttpException(
				`Failed to reset audio file: ${error instanceof Error ? error.message : "Unknown error"}`,
				HttpStatus.INTERNAL_SERVER_ERROR,
			);
		}
	}

	// 全オーディオファイルを削除（データベースリセット）
	@Delete()
	async deleteAllAudioFiles() {
		try {
			await this.audioService.deleteAllAudioFiles();
			return {
				success: true,
				message: "All audio files deleted successfully",
			};
		} catch (error) {
			throw new HttpException(
				`Failed to delete all audio files: ${error instanceof Error ? error.message : "Unknown error"}`,
				HttpStatus.INTERNAL_SERVER_ERROR,
			);
		}
	}
}
