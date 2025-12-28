import { Module } from "@nestjs/common";
import { GlobalConfigService } from "./global-config.service";

@Module({
	providers: [GlobalConfigService],
	exports: [GlobalConfigService],
})
export class ConfigModule {}
