import * as fs from "node:fs";
import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { GlobalConfigService } from "./config/global-config.service";

@ApiTags("system")
@Controller()
export class AppController {
	constructor(private globalConfig: GlobalConfigService) {}
	@Get("status")
	@ApiOperation({ summary: "Get system status" })
	@ApiResponse({ status: 200, description: "Status retrieved successfully" })
	async getStatus() {
		try {
			// sometoolバイナリの存在確認
			const sometoolBinary = this.globalConfig.getSometoolBinaryPath();
			const sometoolExists = fs.existsSync(sometoolBinary);

			return {
				status: "ok",
				timestamp: new Date().toISOString(),
				version: "1.0.0",
				services: {
					sometool: {
						exists: sometoolExists,
						built: sometoolExists,
						path: sometoolBinary,
					},
					database: "connected",
					cardIllustrations: "active",
					audioConverter: "active",
				},
			};
		} catch (error) {
			return {
				status: "error",
				timestamp: new Date().toISOString(),
				error: error.message,
				services: {
					sometool: "error",
					database: "unknown",
					cardIllustrations: "unknown",
					audioConverter: "unknown",
				},
			};
		}
	}

	@Get("time")
	@ApiOperation({ summary: "Get server time" })
	@ApiResponse({
		status: 200,
		description: "Server time retrieved successfully",
	})
	async getServerTime() {
		const now = new Date();
		const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
		const offsetMinutes = -now.getTimezoneOffset();
		return {
			serverTimeIso: now.toISOString(),
			timezone,
			utcOffsetMinutes: offsetMinutes,
		};
	}
}
