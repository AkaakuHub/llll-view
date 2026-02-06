import { Body, Controller, Delete, Get, Param, Post } from "@nestjs/common";
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { SometoolScheduleService } from "./schedule.service";

@ApiTags("sometool")
@Controller("sometool")
export class SometoolScheduleController {
	constructor(private readonly scheduleService: SometoolScheduleService) {}

	@Get("schedules")
	@ApiOperation({ summary: "List schedules" })
	@ApiResponse({ status: 200, description: "Schedules retrieved" })
	async listSchedules() {
		return await this.scheduleService.listSchedules();
	}

	@Post("schedules")
	@ApiOperation({ summary: "Create or update schedule" })
	@ApiBody({
		schema: {
			type: "object",
			properties: {
				id: { type: "string" },
				name: { type: "string" },
				enabled: { type: "boolean" },
				timeOfDay: { type: "string" },
				timezone: { type: "string" },
				options: { type: "object" },
				maxRuntimeSeconds: { type: "number" },
			},
		},
	})
	@ApiResponse({ status: 200, description: "Schedule saved" })
	async upsertSchedule(
		@Body()
		body: {
			id?: string;
			name: string;
			enabled: boolean;
			timeOfDay: string;
			timezone: string;
			options?: Record<string, boolean>;
			maxRuntimeSeconds?: number | null;
		},
	) {
		return await this.scheduleService.upsertSchedule(body);
	}

	@Post("schedules/:id/enable")
	@ApiOperation({ summary: "Enable schedule" })
	async enableSchedule(@Param("id") id: string) {
		return await this.scheduleService.setEnabled(id, true);
	}

	@Post("schedules/:id/disable")
	@ApiOperation({ summary: "Disable schedule" })
	async disableSchedule(@Param("id") id: string) {
		return await this.scheduleService.setEnabled(id, false);
	}

	@Post("schedules/:id/run-now")
	@ApiOperation({ summary: "Run schedule immediately" })
	async runNow(@Param("id") id: string) {
		return await this.scheduleService.runNow(id);
	}

	@Delete("schedules/:id")
	@ApiOperation({ summary: "Delete schedule" })
	async deleteSchedule(@Param("id") id: string) {
		return await this.scheduleService.deleteSchedule(id);
	}
}
