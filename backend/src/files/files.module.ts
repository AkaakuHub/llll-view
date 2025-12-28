import { Module } from "@nestjs/common";
import { ConfigModule } from "../config/config.module";
import { FilesController } from "./files.controller";
import { FilesService } from "./files.service";

@Module({
	imports: [ConfigModule],
	controllers: [FilesController],
	providers: [FilesService],
	exports: [FilesService],
})
export class FilesModule {}
