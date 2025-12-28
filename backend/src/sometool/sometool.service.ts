import { exec, spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import { promisify } from "node:util";
import { Injectable } from "@nestjs/common";
import { GlobalConfigService } from "../config/global-config.service";
import { AppLoggerService } from "../logger/logger.service";
import { PrismaService } from "../prisma/prisma.service";

const execAsync = promisify(exec);

@Injectable()
export class SometoolService {
	private readonly logger;
	private readonly sometoolPath: string;
	private readonly sometoolBinaryPath: string;
	private readonly acbExtractorPath: string;
	private readonly cachePlainPath: string;
	private readonly activeJobs = new Map<string, ReturnType<typeof spawn>>(); // jobId -> child process

	constructor(
		private prisma: PrismaService,
		private globalConfig: GlobalConfigService,
		private appLoggerService: AppLoggerService,
	) {
		this.logger = this.appLoggerService.createLogger(SometoolService.name);
		this.sometoolPath = path.resolve(this.globalConfig.getSometoolDirPath());
		this.sometoolBinaryPath = path.resolve(
			this.globalConfig.getSometoolBinaryPath(),
		);
		this.acbExtractorPath = path.join(
			__dirname,
			"../../../..",
			"llll-tools",
			"ACBExtractor",
		);
		this.cachePlainPath = path.resolve(this.sometoolPath, "cache", "plain");
	}

	async runSometool(
		options: {
			analyze?: boolean;
			dbonly?: boolean;
			force?: boolean;
			keepraw?: boolean;
			convert?: boolean;
			master?: boolean;
		} = {},
	): Promise<{ success: boolean; output: string; error?: string }> {
		try {
			let command = `cd ${this.sometoolPath} && ${this.sometoolBinaryPath}`;

			if (options.analyze) {
				command += " --analyze";
			}
			if (options.dbonly) {
				command += " --dbonly";
			}
			if (options.force) {
				command += " --force";
			}
			if (options.keepraw) {
				command += " --keepraw";
			}
			if (options.convert) {
				command += " --convert";
			}
			if (options.master) {
				command += " --master";
			}

			this.logger.log(`Executing command: ${command}`);
			const { stdout, stderr } = await execAsync(command, {
				maxBuffer: 1024 * 1024 * 10,
			}); // 10MB buffer

			return {
				success: true,
				output: stdout,
				error: stderr || undefined,
			};
		} catch (error) {
			return {
				success: false,
				output: "",
				error: error instanceof Error ? error.message : "Unknown error",
			};
		}
	}

	async runSometoolStream(
		options: {
			analyze?: boolean;
			dbonly?: boolean;
			force?: boolean;
			keepraw?: boolean;
			convert?: boolean;
			master?: boolean;
		} = {},
		onData: (chunk: string) => void,
	): Promise<void> {
		return new Promise((resolve, reject) => {
			const sometoolBinary = this.sometoolBinaryPath;
			const args: string[] = [];

			if (options.analyze) {
				args.push("--analyze");
			}
			if (options.dbonly) {
				args.push("--dbonly");
			}
			if (options.force) {
				args.push("--force");
			}
			if (options.keepraw) {
				args.push("--keepraw");
			}
			if (options.convert) {
				args.push("--convert");
			}
			if (options.master) {
				args.push("--master");
			}

			this.logger.log(
				`Executing stream command: ${sometoolBinary} ${args.join(" ")}`,
			);
			onData(`[INFO] Starting sometool with options: ${args.join(" ")}\n`);

			const child = spawn(sometoolBinary, args, {
				cwd: this.sometoolPath,
				stdio: ["pipe", "pipe", "pipe"],
			});

			child.stdout.on("data", (data) => {
				const chunk = data.toString();
				onData(chunk);
			});

			child.stderr.on("data", (data) => {
				const chunk = data.toString();
				onData(`[STDERR] ${chunk}`);
			});

			child.on("error", (error) => {
				onData(`[ERROR] Process error: ${error.message}\n`);
				reject(error);
			});

			child.on("close", (code) => {
				if (code === 0) {
					onData(
						`[INFO] Process completed successfully (exit code: ${code})\n`,
					);
					resolve();
				} else {
					onData(`[ERROR] Process exited with code: ${code}\n`);
					reject(new Error(`Process exited with code ${code}`));
				}
			});
		});
	}

	async checkSometoolStatus(): Promise<{ exists: boolean; built: boolean }> {
		try {
			const sometoolBinary = this.sometoolBinaryPath;
			const { stdout } = await execAsync(`ls -la ${this.sometoolPath}`);
			const exists = stdout.includes(path.basename(sometoolBinary));

			// Check if the binary is executable
			let built = false;
			try {
				await execAsync(`test -x ${sometoolBinary}`);
				built = true;
			} catch {
				built = false;
			}

			return { exists, built };
		} catch {
			return { exists: false, built: false };
		}
	}

	async buildSometool(): Promise<{
		success: boolean;
		output: string;
		error?: string;
	}> {
		try {
			const command = `cd ${this.sometoolPath} && go build .`;
			this.logger.log(`Building sometool: ${command}`);
			const { stdout, stderr } = await execAsync(command);

			return {
				success: true,
				output: stdout,
				error: stderr || undefined,
			};
		} catch (error) {
			return {
				success: false,
				output: "",
				error: error instanceof Error ? error.message : "Unknown error",
			};
		}
	}

	async checkAcbExtractorStatus(): Promise<{
		exists: boolean;
		ready: boolean;
	}> {
		try {
			const exists = fs.existsSync(this.acbExtractorPath);
			if (!exists) {
				return { exists: false, ready: false };
			}

			const files = fs.readdirSync(this.acbExtractorPath);
			const ready = files.some(
				(file) =>
					file.includes("acb") &&
					(file.endsWith(".exe") || file.endsWith(".py")),
			);

			return { exists, ready };
		} catch {
			return { exists: false, ready: false };
		}
	}

	async listAcbFiles(): Promise<{
		files: Array<{ name: string; size: number; path: string }>;
	}> {
		try {
			if (!fs.existsSync(this.cachePlainPath)) {
				return { files: [] };
			}

			const files = fs
				.readdirSync(this.cachePlainPath)
				.filter((file) => file.endsWith(".acb"))
				.map((file) => {
					const filePath = path.join(this.cachePlainPath, file);
					const stats = fs.statSync(filePath);
					return {
						name: file,
						size: stats.size,
						path: filePath,
					};
				});

			return { files };
		} catch {
			return { files: [] };
		}
	}

	async extractAcbFile(
		filePath: string,
		outputDir?: string,
	): Promise<{ success: boolean; output: string; error?: string }> {
		try {
			const resolvedOutputDir =
				outputDir || path.join(this.cachePlainPath, "extracted");

			if (!fs.existsSync(resolvedOutputDir)) {
				fs.mkdirSync(resolvedOutputDir, { recursive: true });
			}

			return {
				success: true,
				output: `Mock ACB extraction completed for ${path.basename(filePath)}. Output directory: ${resolvedOutputDir}`,
				error: undefined,
			};
		} catch (error) {
			return {
				success: false,
				output: "",
				error: error instanceof Error ? error.message : "Unknown error",
			};
		}
	}

	// sometoolジョブの状態管理用メソッド

	async runSometoolWithJobManagement(
		options: {
			analyze?: boolean;
			dbonly?: boolean;
			force?: boolean;
			keepraw?: boolean;
			convert?: boolean;
			master?: boolean;
		} = {},
		onData?: (chunk: string) => void,
	): Promise<{ jobId: string; success: boolean; error?: string }> {
		const jobId = randomUUID();
		const commandName = this.getCommandName(options);

		// ジョブをDBに作成
		await this.prisma.systemControlJobs.create({
			data: {
				id: jobId,
				command: commandName,
				options: JSON.stringify(options),
				status: "pending",
			},
		});

		try {
			const sometoolBinary = this.sometoolBinaryPath;
			const args: string[] = [];

			if (options.analyze) args.push("--analyze");
			if (options.dbonly) args.push("--dbonly");
			if (options.force) args.push("--force");
			if (options.keepraw) args.push("--keepraw");
			if (options.convert) args.push("--convert");
			if (options.master) args.push("--master");

			// ジョブステータスをrunningに更新
			await this.prisma.systemControlJobs.update({
				where: { id: jobId },
				data: {
					status: "running",
					startedAt: new Date(),
				},
			});

			const child = spawn(sometoolBinary, args, {
				cwd: this.sometoolPath,
				stdio: ["pipe", "pipe", "pipe"],
			});

			// PIDを保存
			await this.prisma.systemControlJobs.update({
				where: { id: jobId },
				data: { processId: child.pid },
			});

			// アクティブジョブとして保存
			this.activeJobs.set(jobId, child);

			let outputLog = "";

			child.stdout.on("data", (data) => {
				const chunk = data.toString();
				outputLog += chunk;

				// ログをDBに保存
				this.updateJobLog(jobId, outputLog);

				if (onData) onData(chunk);
			});

			child.stderr.on("data", (data) => {
				const chunk = data.toString();
				outputLog += `[STDERR] ${chunk}`;

				// ログをDBに保存
				this.updateJobLog(jobId, outputLog);

				if (onData) onData(`[STDERR] ${chunk}`);
			});

			child.on("error", async (error) => {
				this.logger.error(
					`[ERROR] Process error for job ${jobId}: ${error.message}`,
				);

				// エラー時にも最終ログを保存
				await this.saveJobLogOnCompletion(jobId);

				await this.prisma.systemControlJobs.update({
					where: { id: jobId },
					data: {
						status: "failed",
						errorMessage: error.message,
						completedAt: new Date(),
					},
				});

				// クリーンアップ
				this.cleanupJobLog(jobId);
				this.activeJobs.delete(jobId);
			});

			child.on("close", async (code) => {
				const finalStatus = code === 0 ? "completed" : "failed";

				// ジョブ完了時に最終ログを保存
				await this.saveJobLogOnCompletion(jobId);

				await this.prisma.systemControlJobs.update({
					where: { id: jobId },
					data: {
						status: finalStatus,
						completedAt: new Date(),
					},
				});

				// クリーンアップ
				this.cleanupJobLog(jobId);
				this.activeJobs.delete(jobId);
			});

			return { jobId, success: true };
		} catch (error) {
			// 例外エラー時にも最終ログを保存
			try {
				await this.saveJobLogOnCompletion(jobId);
			} catch (logError) {
				this.logger.error(`Failed to save final log: ${logError}`);
			}

			await this.prisma.systemControlJobs.update({
				where: { id: jobId },
				data: {
					status: "failed",
					errorMessage:
						error instanceof Error ? error.message : "Unknown error",
					completedAt: new Date(),
				},
			});

			// クリーンアップ
			this.cleanupJobLog(jobId);

			return {
				jobId,
				success: false,
				error: error instanceof Error ? error.message : "Unknown error",
			};
		}
	}

	async getActiveJobs() {
		return await this.prisma.systemControlJobs.findMany({
			where: { status: "running" },
			orderBy: { startedAt: "desc" },
		});
	}

	async getJobById(jobId: string, lastLength: number = 0) {
		const job = await this.prisma.systemControlJobs.findUnique({
			where: { id: jobId },
		});

		if (!job) return null;

		// 常に差分のみで返す
		const result = await this.getJobLogIncremental(jobId, lastLength);
		return {
			id: job.id,
			command: job.command,
			options: job.options,
			status: job.status,
			processId: job.processId,
			errorMessage: job.errorMessage,
			createdAt: job.createdAt,
			startedAt: job.startedAt,
			completedAt: job.completedAt,
			...result, // hasMore, incrementalLog, status等をマージ
		};
	}

	async checkProcessExists(pid: number): Promise<boolean> {
		try {
			// kill -0 でプロセスの存在を確認
			await execAsync(`kill -0 ${pid}`);
			return true;
		} catch {
			return false;
		}
	}

	private jobLogs = new Map<string, string>();
	private jobLogTimers = new Map<string, NodeJS.Timeout>();

	async updateJobLog(jobId: string, log: string): Promise<void> {
		// メモリにログを保存（フロントエンド用）
		this.jobLogs.set(jobId, log);

		// 既存のタイマーをクリア
		const existingTimer = this.jobLogTimers.get(jobId);
		if (existingTimer) {
			clearTimeout(existingTimer);
		}

		// 30秒ごとにDBに保存（堅牢な間隔）
		const timer = setTimeout(async () => {
			await this.flushJobLogToDatabase(jobId);
		}, 30000); // 30秒間隔

		this.jobLogTimers.set(jobId, timer);
	}

	// ジョブ完了時に即時DB保存
	async saveJobLogOnCompletion(jobId: string): Promise<void> {
		// 保留中のタイマーをクリア
		const timer = this.jobLogTimers.get(jobId);
		if (timer) {
			clearTimeout(timer);
			this.jobLogTimers.delete(jobId);
		}

		// 即時保存
		await this.flushJobLogToDatabase(jobId);
	}

	// 実際にDBに保存する安全なメソッド
	private async flushJobLogToDatabase(jobId: string): Promise<void> {
		const log = this.jobLogs.get(jobId);
		if (!log) return;

		try {
			// ジョブの存在確認
			const job = await this.prisma.systemControlJobs.findUnique({
				where: { id: jobId },
				select: { id: true },
			});

			if (!job) {
				this.logger.warn(`Job ${jobId} not found, skipping log save`);
				return;
			}

			// 安全なトランザクションで保存
			await this.prisma.$transaction(
				async (tx) => {
					await tx.systemControlJobs.update({
						where: { id: jobId },
						data: { outputLog: log },
					});
				},
				{
					timeout: 10000, // 10秒タイムアウト
				},
			);

			this.logger.log(`Job log saved for ${jobId} (${log.length} chars)`);
		} catch (error) {
			this.logger.error(`Failed to save job log for ${jobId}: ${error}`);
			// 失敗しても処理を継続（ログ保存失敗でジョブが止まるのは避ける）
		}
	}

	// ジョブクリーンアップ
	cleanupJobLog(jobId: string): void {
		this.jobLogs.delete(jobId);
		const timer = this.jobLogTimers.get(jobId);
		if (timer) {
			clearTimeout(timer);
			this.jobLogTimers.delete(jobId);
		}
	}

	async reconnectToJob(
		jobId: string,
	): Promise<{ success: boolean; error?: string }> {
		const job = await this.getJobById(jobId);

		if (!job) {
			return { success: false, error: "Job not found" };
		}

		if (job.status !== "running" || !job.processId) {
			return { success: false, error: "Job is not running or no process ID" };
		}

		const processExists = await this.checkProcessExists(job.processId);
		if (!processExists) {
			// プロセスが存在しない場合はステータスをfailedに更新
			await this.prisma.systemControlJobs.update({
				where: { id: jobId },
				data: {
					status: "failed",
					errorMessage: "Process died",
					completedAt: new Date(),
				},
			});

			return { success: false, error: "Process not found" };
		}

		return { success: true };
	}

	async cancelJob(
		jobId: string,
	): Promise<{ success: boolean; error?: string }> {
		const job = await this.getJobById(jobId);

		if (!job) {
			return { success: false, error: "Job not found" };
		}

		if (job.status !== "running") {
			return { success: false, error: "Job is not running" };
		}

		const activeJob = this.activeJobs.get(jobId);
		if (activeJob) {
			activeJob.kill();
			this.activeJobs.delete(jobId);
		} else if (job.processId) {
			try {
				await execAsync(`kill -TERM ${job.processId}`);
			} catch (error) {
				this.logger.error(`Failed to kill process: ${error}`);
			}
		}

		await this.prisma.systemControlJobs.update({
			where: { id: jobId },
			data: {
				status: "cancelled",
				completedAt: new Date(),
			},
		});

		return { success: true };
	}

	// 差分ログ取得用プライベートメソッド
	private async getJobLogIncremental(
		jobId: string,
		lastLength: number,
	): Promise<{
		hasMore: boolean;
		incrementalLog?: string;
		status?: string;
		errorMessage?: string;
	}> {
		try {
			// まずメモリ内の最新ログを確認
			const memoryLog = this.jobLogs.get(jobId);

			// ジョブ情報を取得
			const job = await this.prisma.systemControlJobs.findUnique({
				where: { id: jobId },
				select: { status: true, errorMessage: true, outputLog: true },
			});

			if (!job) {
				return { hasMore: false, errorMessage: "Job not found" };
			}

			// メモリ内ログを優先（最新データ）、なければDBから
			const currentLog = memoryLog || job.outputLog || "";

			// 差分を計算
			if (currentLog.length > lastLength) {
				const incrementalLog = currentLog.substring(lastLength);
				return {
					hasMore: true,
					incrementalLog,
					status: job.status,
					errorMessage: job.errorMessage || undefined,
				};
			}

			// 新しいログはないが、ステータス変化はあるかもしれない
			return {
				hasMore: false,
				status: job.status,
				errorMessage: job.errorMessage || undefined,
			};
		} catch (error) {
			this.logger.error(`Failed to get incremental log for ${jobId}: ${error}`);
			return {
				hasMore: false,
				errorMessage: error instanceof Error ? error.message : "Unknown error",
			};
		}
	}

	private getCommandName(options: {
		analyze?: boolean;
		dbonly?: boolean;
		force?: boolean;
		keepraw?: boolean;
		convert?: boolean;
		master?: boolean;
	}): string {
		if (options.dbonly) return "Database Only";
		if (options.analyze) return "Analysis Mode";
		if (options.force) return "Force Update";
		if (options.convert) return "Convert Assets";
		if (options.master) return "Generate Master";
		if (options.keepraw && options.dbonly) return "DB + Keep Raw";
		if (options.keepraw && options.force) return "Force + Keep Raw";
		return "Full Synchronization";
	}
}
