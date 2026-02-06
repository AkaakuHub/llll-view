import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { SchedulerRegistry } from "@nestjs/schedule";
import { CronJob, CronTime } from "cron";
import { AppLoggerService } from "../logger/logger.service";
import { PrismaService } from "../prisma/prisma.service";
import { SometoolService } from "./sometool.service";

type ScheduleInput = {
	id?: string;
	name: string;
	enabled: boolean;
	timeOfDay: string;
	timezone: string;
	options?: Record<string, boolean>;
	maxRuntimeSeconds?: number | null;
};

@Injectable()
export class SometoolScheduleService implements OnModuleInit, OnModuleDestroy {
	private readonly logger;

	constructor(
		private readonly schedulerRegistry: SchedulerRegistry,
		private readonly prisma: PrismaService,
		private readonly sometoolService: SometoolService,
		private readonly appLoggerService: AppLoggerService,
	) {
		this.logger = this.appLoggerService.createLogger(
			SometoolScheduleService.name,
		);
	}

	async onModuleInit(): Promise<void> {
		try {
			await this.refreshSchedules();
		} catch (error) {
			this.logger.warn(
				`Schedule refresh skipped (migration not applied yet): ${error}`,
			);
		}
	}

	async onModuleDestroy(): Promise<void> {
		const jobKeys = Array.from(this.schedulerRegistry.getCronJobs().keys());
		for (const jobKey of jobKeys) {
			this.removeScheduleJob(jobKey);
		}
	}

	async refreshSchedules(): Promise<void> {
		const schedules = await this.prisma.systemControlSchedules.findMany();
		const activeIds = new Set(schedules.map((schedule) => schedule.id));

		for (const jobName of this.schedulerRegistry.getCronJobs().keys()) {
			if (!activeIds.has(jobName)) {
				this.removeScheduleJob(jobName);
			}
		}

		for (const schedule of schedules) {
			await this.registerSchedule(schedule.id);
		}
	}

	async listSchedules() {
		const schedules = await this.prisma.systemControlSchedules.findMany({
			orderBy: { createdAt: "asc" },
		});

		return schedules.map((schedule) => this.serializeSchedule(schedule));
	}

	async upsertSchedule(input: ScheduleInput) {
		const normalizedMaxRuntime =
			input.maxRuntimeSeconds === -1 ? null : (input.maxRuntimeSeconds ?? null);
		const payload = {
			name: input.name,
			enabled: input.enabled,
			timeOfDay: input.timeOfDay,
			timezone: input.timezone,
			options: input.options ? JSON.stringify(input.options) : null,
			maxRuntimeSeconds: normalizedMaxRuntime,
		};

		const schedule = input.id
			? await this.prisma.systemControlSchedules.update({
					where: { id: input.id },
					data: payload,
				})
			: await this.prisma.systemControlSchedules.create({ data: payload });

		await this.registerSchedule(schedule.id);
		return this.serializeSchedule(schedule);
	}

	async setEnabled(id: string, enabled: boolean) {
		const schedule = await this.prisma.systemControlSchedules.update({
			where: { id },
			data: { enabled },
		});

		await this.registerSchedule(schedule.id);
		return this.serializeSchedule(schedule);
	}

	async deleteSchedule(id: string) {
		this.removeScheduleJob(id);
		return await this.prisma.systemControlSchedules.delete({
			where: { id },
		});
	}

	async runNow(id: string) {
		const schedule = await this.prisma.systemControlSchedules.findUnique({
			where: { id },
		});
		if (!schedule) return null;

		if (await this.sometoolService.isAnyJobRunning()) {
			await this.prisma.systemControlSchedules.update({
				where: { id },
				data: {
					lastRunAt: new Date(),
					lastStatus: "skipped",
				},
			});
			return { skipped: true };
		}

		let options: Record<string, boolean> | undefined;
		if (schedule.options) {
			try {
				options = JSON.parse(schedule.options) as Record<string, boolean>;
			} catch {
				options = undefined;
			}
		}

		return await this.sometoolService.runSometoolWithJobManagement(
			options || {},
			undefined,
			{
				scheduleId: schedule.id,
				maxRuntimeSeconds: schedule.maxRuntimeSeconds ?? undefined,
			},
		);
	}

	private async registerSchedule(id: string): Promise<void> {
		this.removeScheduleJob(id);

		try {
			const schedule = await this.prisma.systemControlSchedules.findUnique({
				where: { id },
			});
			if (!schedule) return;
			if (!schedule.enabled) return;

			const cronExpression = this.buildCronExpression(schedule.timeOfDay);
			if (!cronExpression) {
				this.logger.warn(
					`Invalid timeOfDay for schedule ${schedule.id}: ${schedule.timeOfDay}`,
				);
				return;
			}

			const job = new CronJob(
				cronExpression,
				() => this.handleScheduleTick(schedule.id),
				null,
				false,
				schedule.timezone,
			);

			this.schedulerRegistry.addCronJob(schedule.id, job);
			job.start();
			this.logger.log(`Registered schedule ${schedule.id}`);
		} catch (error) {
			this.logger.error(
				`Failed to register schedule ${id}: ${
					error instanceof Error ? error.message : "Unknown error"
				}`,
			);
			throw error;
		}
	}

	private serializeSchedule(schedule: {
		id: string;
		name: string;
		enabled: boolean;
		timeOfDay: string;
		timezone: string;
		options: string | null;
		maxRuntimeSeconds: number | null;
		lastRunAt: Date | null;
		lastStatus: string | null;
		lastJobId: string | null;
		createdAt: Date;
		updatedAt: Date;
	}) {
		let options: Record<string, boolean> | undefined;
		if (schedule.options) {
			try {
				options = JSON.parse(schedule.options) as Record<string, boolean>;
			} catch {
				options = undefined;
			}
		}

		return {
			...schedule,
			options,
			nextRunAt: this.getNextRunAt(schedule.timeOfDay, schedule.timezone),
		};
	}

	private getNextRunAt(timeOfDay: string, timezone: string): string | null {
		const cronExpression = this.buildCronExpression(timeOfDay);
		if (!cronExpression) return null;
		try {
			const cronTime = new CronTime(cronExpression, timezone);
			const next = cronTime.sendAt();
			if (next instanceof Date) {
				return next.toISOString();
			}
			const luxon = next as { toJSDate?: () => Date; toString?: () => string };
			if (typeof luxon.toJSDate === "function") {
				return luxon.toJSDate().toISOString();
			}
			if (typeof luxon.toString === "function") {
				return new Date(luxon.toString()).toISOString();
			}
			return null;
		} catch (error) {
			this.logger.warn(
				`Failed to compute next run at for ${timeOfDay} ${timezone}: ${error}`,
			);
			return null;
		}
	}

	private removeScheduleJob(id: string): void {
		const jobs = this.schedulerRegistry.getCronJobs();
		if (!jobs.has(id)) return;
		const job = this.schedulerRegistry.getCronJob(id);
		job.stop();
		this.schedulerRegistry.deleteCronJob(id);
	}

	private buildCronExpression(timeOfDay: string): string | null {
		const match = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(timeOfDay);
		if (!match) return null;
		const hour = match[1];
		const minute = match[2];
		return `${minute} ${hour} * * *`;
	}

	private async handleScheduleTick(id: string): Promise<void> {
		try {
			const schedule = await this.prisma.systemControlSchedules.findUnique({
				where: { id },
			});
			if (!schedule || !schedule.enabled) return;

			if (await this.sometoolService.isAnyJobRunning()) {
				await this.prisma.systemControlSchedules.update({
					where: { id },
					data: {
						lastRunAt: new Date(),
						lastStatus: "skipped",
					},
				});
				return;
			}

			let options: Record<string, boolean> = {};
			if (schedule.options) {
				try {
					options = JSON.parse(schedule.options) as Record<string, boolean>;
				} catch {
					options = {};
				}
			}

			await this.sometoolService.runSometoolWithJobManagement(
				options,
				undefined,
				{
					scheduleId: schedule.id,
					maxRuntimeSeconds: schedule.maxRuntimeSeconds ?? undefined,
				},
			);
		} catch (error) {
			this.logger.error(
				`Schedule tick failed for ${id}: ${
					error instanceof Error ? error.message : "Unknown error"
				}`,
			);
		}
	}
}
