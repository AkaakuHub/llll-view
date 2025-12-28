import { Injectable } from "@nestjs/common";
import { WavToM4aService } from "../../audio/services/wav-to-m4a.service";
import { GlobalConfigService } from "../../config/global-config.service";
import { AppLoggerService } from "../../logger/logger.service";
import { PrismaService } from "../../prisma/prisma.service";
import { CardIllustrationsServicePerformance } from "./card-illustrations.service.performance";

@Injectable()
export class CardIllustrationsService extends CardIllustrationsServicePerformance {
	constructor(
		prisma: PrismaService,
		globalConfig: GlobalConfigService,
		wavToM4aService: WavToM4aService,
		appLoggerService: AppLoggerService,
	) {
		super(prisma, globalConfig, wavToM4aService, appLoggerService);
	}
}
