import { Controller, HttpException, HttpStatus, Post } from "@nestjs/common";
import { AudioScannerService } from "../services/audio-scanner.service";

@Controller("audio/scan")
export class AudioScanController {
	constructor(private readonly audioScannerService: AudioScannerService) {}

	// ACBファイルをスキャンしてデータベースに登録
	@Post()
	async scanAcbFiles() {
		try {
			const result = await this.audioScannerService.scanAcbFiles();
			return {
				success: true,
				message: `Scanned ${result.scanned} files, added ${result.added} new files`,
				data: result,
			};
		} catch (error) {
			throw new HttpException(
				`Failed to scan ACB files: ${error instanceof Error ? error.message : "Unknown error"}`,
				HttpStatus.INTERNAL_SERVER_ERROR,
			);
		}
	}

	// 既存のM4Aファイルをスキャンしてデータベースに登録
	@Post("m4a")
	async scanExistingM4AFiles() {
		try {
			const result = await this.audioScannerService.scanExistingM4AFiles();
			return {
				success: true,
				message: `Scanned ${result.scanned} M4A files, added ${result.added} new entries`,
				data: result,
			};
		} catch (error) {
			throw new HttpException(
				`Failed to scan M4A files: ${error instanceof Error ? error.message : "Unknown error"}`,
				HttpStatus.INTERNAL_SERVER_ERROR,
			);
		}
	}
}
