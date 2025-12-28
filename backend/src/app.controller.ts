import * as fs from "node:fs";
import { Controller, Get } from "@nestjs/common";
import { GlobalConfigService } from "./config/global-config.service";

@Controller()
export class AppController {
	constructor(private globalConfig: GlobalConfigService) {}
	@Get("status")
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
}
