import { Module } from "@nestjs/common";
import { ConfigModule } from "../config/config.module";
import { PrismaService } from "../prisma/prisma.service";
import { AudioController } from "./audio.controller";
import { AudioService } from "./audio.service";
import { AudioConvertController } from "./controllers/audio-convert.controller";
import { AudioFilesController } from "./controllers/audio-files.controller";
import { AudioJobsController } from "./controllers/audio-jobs.controller";
import { AudioMusicController } from "./controllers/audio-music.controller";
import { AudioProgressController } from "./controllers/audio-progress.controller";
// Controllers
import { AudioScanController } from "./controllers/audio-scan.controller";
import { AudioAnalyzerService } from "./services/audio-analyzer.service";
import { AudioBatchService } from "./services/audio-batch.service";
import { AudioConfigService } from "./services/audio-config.service";
import { AudioConverterService } from "./services/audio-converter.service";
import { AudioProgressService } from "./services/audio-progress.service";
// Services
import { AudioScannerService } from "./services/audio-scanner.service";
import { AudioSearchService } from "./services/audio-search.service";
import { NativeAudioConverterService } from "./services/native-audio-converter.service";
import { NativeShellService } from "./services/native-shell.service";
import { StoryBackgroundService } from "./services/story-background.service";
import { WavToM4aService } from "./services/wav-to-m4a.service";

@Module({
	imports: [ConfigModule],
	controllers: [
		AudioController,
		AudioScanController,
		AudioConvertController,
		AudioFilesController,
		AudioMusicController,
		AudioProgressController,
		AudioJobsController,
	],
	providers: [
		PrismaService,
		AudioService,
		AudioScannerService,
		AudioAnalyzerService,
		AudioConverterService,
		AudioSearchService,
		AudioBatchService,
		AudioProgressService,
		AudioConfigService,
		NativeShellService,
		NativeAudioConverterService,
		WavToM4aService,
		StoryBackgroundService,
	],
	exports: [
		AudioService,
		AudioScannerService,
		AudioAnalyzerService,
		AudioConverterService,
		AudioSearchService,
		AudioBatchService,
		AudioProgressService,
		AudioConfigService,
		NativeShellService,
		NativeAudioConverterService,
		WavToM4aService,
		StoryBackgroundService,
	],
})
export class AudioModule {}
