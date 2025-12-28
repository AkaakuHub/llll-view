import { Module } from "@nestjs/common";
import { ConfigModule } from "../config/config.module";
import { PrismaModule } from "../prisma/prisma.module";
import { DatabaseController } from "./database.controller";
import { DatabaseService } from "./database.service";
import { FileController } from "./file.controller";
import { FileService } from "./file.service";
import { SometoolController } from "./sometool.controller";
import { SometoolService } from "./sometool.service";

@Module({
	controllers: [SometoolController, FileController, DatabaseController],
	providers: [SometoolService, FileService, DatabaseService],
	imports: [PrismaModule, ConfigModule],
})
export class SometoolModule {}
