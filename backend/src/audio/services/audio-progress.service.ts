import { Injectable } from "@nestjs/common";
import { ConversionStatus } from "../../../generated/prisma";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class AudioProgressService {
	constructor(private prisma: PrismaService) {}

	// 変換進捗状況を取得
	async getConversionProgress(): Promise<Record<string, unknown>> {
		const [
			totalFiles,
			pendingFiles,
			processingFiles,
			completedFiles,
			failedFiles,
			totalStreams,
			pendingStreams,
			processingStreams,
			completedStreams,
			failedStreams,
		] = await Promise.all([
			this.prisma.audioFiles.count(),
			this.prisma.audioFiles.count({
				where: { status: ConversionStatus.PENDING },
			}),
			this.prisma.audioFiles.count({
				where: { status: ConversionStatus.PROCESSING },
			}),
			this.prisma.audioFiles.count({
				where: { status: ConversionStatus.COMPLETED },
			}),
			this.prisma.audioFiles.count({
				where: { status: ConversionStatus.FAILED },
			}),
			this.prisma.audioStreams.count(),
			this.prisma.audioStreams.count({
				where: { status: ConversionStatus.PENDING },
			}),
			this.prisma.audioStreams.count({
				where: { status: ConversionStatus.PROCESSING },
			}),
			this.prisma.audioStreams.count({
				where: { status: ConversionStatus.COMPLETED },
			}),
			this.prisma.audioStreams.count({
				where: { status: ConversionStatus.FAILED },
			}),
		]);

		return {
			files: {
				total: totalFiles,
				pending: pendingFiles,
				processing: processingFiles,
				completed: completedFiles,
				failed: failedFiles,
				completionRate:
					totalFiles > 0 ? Math.round((completedFiles / totalFiles) * 100) : 0,
			},
			audioStreams: {
				total: totalStreams,
				pending: pendingStreams,
				processing: processingStreams,
				completed: completedStreams,
				failed: failedStreams,
				completionRate:
					totalStreams > 0
						? Math.round((completedStreams / totalStreams) * 100)
						: 0,
			},
			overall: {
				filesCompleted: completedFiles,
				filesTotal: totalFiles,
				streamsCompleted: completedStreams,
				streamsTotal: totalStreams,
				isActive: processingFiles > 0,
			},
		};
	}

	// 特定ファイルの詳細進捗を取得
	async getFileProgress(audioFileId: string): Promise<Record<string, unknown>> {
		const audioFile = await this.prisma.audioFiles.findUnique({
			where: { id: audioFileId },
			include: { audioStreams: true },
		});

		if (!audioFile) {
			throw new Error(`Audio file not found: ${audioFileId}`);
		}

		const completedStreams = audioFile.audioStreams.filter(
			(s) => s.status === ConversionStatus.COMPLETED,
		).length;
		const processingStreams = audioFile.audioStreams.filter(
			(s) => s.status === ConversionStatus.PROCESSING,
		).length;
		const failedStreams = audioFile.audioStreams.filter(
			(s) => s.status === ConversionStatus.FAILED,
		).length;
		const totalStreams = audioFile.audioStreams.length || 1;

		const streamProgress =
			totalStreams > 0 ? (completedStreams / totalStreams) * 100 : 0;

		return {
			file: {
				id: audioFile.id,
				filename: audioFile.filename,
				status: audioFile.status,
				category: audioFile.category,
				streamCount: audioFile.streamCount,
			},
			audioStreams: {
				total: totalStreams,
				completed: completedStreams,
				processing: processingStreams,
				failed: failedStreams,
				progress: Math.round(streamProgress),
			},
			timing: {
				createdAt: audioFile.createdAt,
				updatedAt: audioFile.updatedAt,
				convertedAt: audioFile.convertedAt,
			},
		};
	}
}
