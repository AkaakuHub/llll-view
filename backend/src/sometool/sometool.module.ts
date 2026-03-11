import { Module } from "@nestjs/common";
import { AudioModule } from "../audio/audio.module";
import { ConfigModule } from "../config/config.module";
import { PrismaModule } from "../prisma/prisma.module";
import { DatabaseController } from "./database.controller";
import { DatabaseService } from "./database.service";
import { FileController } from "./file.controller";
import { FileService } from "./file.service";
import { SometoolNotificationService } from "./notification.service";
import { SometoolScheduleController } from "./schedule.controller";
import { SometoolScheduleService } from "./schedule.service";
import { SometoolSettingsController } from "./settings.controller";
import { SometoolSettingsService } from "./settings.service";
import { SometoolController } from "./sometool.controller";
import { SometoolService } from "./sometool.service";

@Module({
	controllers: [
		SometoolController,
		SometoolScheduleController,
		SometoolSettingsController,
		FileController,
		DatabaseController,
	],
	providers: [
		SometoolService,
		SometoolScheduleService,
		SometoolSettingsService,
		SometoolNotificationService,
		FileService,
		DatabaseService,
	],
	imports: [PrismaModule, ConfigModule, AudioModule],
})
export class SometoolModule {}
