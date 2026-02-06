import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { AppController } from "./app.controller";
import { AudioModule } from "./audio/audio.module";
import { CardIllustrationsModule } from "./card-illustrations/card-illustrations.module";
import { ConfigModule } from "./config/config.module";
import { FilesModule } from "./files/files.module";
import { LoggerModule } from "./logger/logger.module";
import { SometoolModule } from "./sometool/sometool.module";

@Module({
	imports: [
		ScheduleModule.forRoot(),
		ConfigModule,
		LoggerModule,
		SometoolModule,
		AudioModule,
		FilesModule,
		CardIllustrationsModule,
	],
	controllers: [AppController],
})
export class AppModule {}
