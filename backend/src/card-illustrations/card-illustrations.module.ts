import { Module } from "@nestjs/common";
import { AudioModule } from "../audio/audio.module";
import { ConfigModule } from "../config/config.module";
import { PrismaModule } from "../prisma/prisma.module";
import { CardIllustrationsController } from "./card-illustrations.controller";
import { CardIllustrationsService } from "./card-illustrations.service";

@Module({
	imports: [PrismaModule, ConfigModule, AudioModule],
	controllers: [CardIllustrationsController],
	providers: [CardIllustrationsService],
	exports: [CardIllustrationsService],
})
export class CardIllustrationsModule {}
