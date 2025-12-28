import { Body, Controller, Get, Param, Post, Query, Res } from "@nestjs/common";
import {
	ApiBody,
	ApiOperation,
	ApiQuery,
	ApiResponse,
	ApiTags,
} from "@nestjs/swagger";
import type { Response } from "express";
import { SometoolService } from "./sometool.service";

@ApiTags("sometool")
@Controller("sometool")
export class SometoolController {
	constructor(private readonly sometoolService: SometoolService) {}

	@Get("status")
	@ApiOperation({
		summary: "Get sometool status",
		description: "Check the current status of sometool",
	})
	@ApiResponse({ status: 200, description: "Status retrieved successfully" })
	async getStatus() {
		return await this.sometoolService.checkSometoolStatus();
	}

	@Post("build")
	@ApiOperation({
		summary: "Build sometool",
		description: "Build the sometool application",
	})
	@ApiResponse({ status: 200, description: "Build completed successfully" })
	async buildSometool() {
		return await this.sometoolService.buildSometool();
	}

	@Post("run")
	@ApiOperation({
		summary: "Run sometool",
		description: "Execute sometool with specified options",
	})
	@ApiBody({
		schema: {
			type: "object",
			properties: {
				analyze: { type: "boolean" },
				dbonly: { type: "boolean" },
				force: { type: "boolean" },
				keepraw: { type: "boolean" },
				convert: { type: "boolean" },
				master: { type: "boolean" },
			},
		},
	})
	@ApiResponse({ status: 200, description: "Sometool executed successfully" })
	async runSometool(
		@Body() body: {
			analyze?: boolean;
			dbonly?: boolean;
			force?: boolean;
			keepraw?: boolean;
			convert?: boolean;
			master?: boolean;
		},
	) {
		return await this.sometoolService.runSometool(body);
	}

	@Post("run-stream")
	@ApiOperation({
		summary: "Run sometool with streaming output",
		description: "Execute sometool with real-time streaming output",
	})
	async runSometoolStream(
		@Body() body: {
			analyze?: boolean;
			dbonly?: boolean;
			force?: boolean;
			keepraw?: boolean;
			convert?: boolean;
			master?: boolean;
		},
		@Res() res: Response,
	) {
		res.setHeader("Content-Type", "text/plain; charset=utf-8");
		res.setHeader("Cache-Control", "no-cache");
		res.setHeader("Connection", "keep-alive");
		res.setHeader("Access-Control-Allow-Origin", "*");

		try {
			await this.sometoolService.runSometoolStream(body, (chunk: string) => {
				res.write(chunk);
			});
			res.write("\n[COMPLETED]\n");
			res.end();
		} catch (error) {
			res.write(`\n[ERROR] ${error.message}\n`);
			res.end();
		}
	}

	@Get("run")
	@ApiOperation({
		summary: "Run sometool (GET)",
		description: "Execute sometool via GET request with query parameters",
	})
	@ApiQuery({
		name: "analyze",
		required: false,
		type: "string",
		description: "Analyze option (true/false)",
	})
	@ApiQuery({
		name: "dbonly",
		required: false,
		type: "string",
		description: "DB only option (true/false)",
	})
	@ApiQuery({
		name: "force",
		required: false,
		type: "string",
		description: "Force update option (true/false)",
	})
	@ApiQuery({
		name: "keepraw",
		required: false,
		type: "string",
		description: "Keep raw files option (true/false)",
	})
	@ApiQuery({
		name: "convert",
		required: false,
		type: "string",
		description: "Convert existing assets option (true/false)",
	})
	@ApiQuery({
		name: "master",
		required: false,
		type: "string",
		description: "Generate masterdata option (true/false)",
	})
	@ApiResponse({ status: 200, description: "Sometool executed successfully" })
	async runSometoolGet(
		@Query("analyze") analyze?: string,
		@Query("dbonly") dbonly?: string,
		@Query("force") force?: string,
		@Query("keepraw") keepraw?: string,
		@Query("convert") convert?: string,
		@Query("master") master?: string,
	) {
		return await this.sometoolService.runSometool({
			analyze: analyze === "true",
			dbonly: dbonly === "true",
			force: force === "true",
			keepraw: keepraw === "true",
			convert: convert === "true",
			master: master === "true",
		});
	}

	@Get("acb/status")
	@ApiOperation({
		summary: "Get ACB extractor status",
		description: "Check the status of ACB extractor tool",
	})
	@ApiResponse({
		status: 200,
		description: "ACB extractor status retrieved successfully",
	})
	async getAcbExtractorStatus() {
		return await this.sometoolService.checkAcbExtractorStatus();
	}

	@Post("acb/extract")
	@ApiOperation({
		summary: "Extract ACB file",
		description: "Extract audio files from ACB archive",
	})
	@ApiBody({
		schema: {
			type: "object",
			properties: {
				filePath: { type: "string" },
				outputDir: { type: "string" },
			},
			required: ["filePath"],
		},
	})
	@ApiResponse({ status: 200, description: "ACB file extracted successfully" })
	async extractAcb(@Body() body: { filePath: string; outputDir?: string }) {
		return await this.sometoolService.extractAcbFile(
			body.filePath,
			body.outputDir,
		);
	}

	@Get("acb/list")
	@ApiOperation({
		summary: "List ACB files",
		description: "Get list of available ACB files",
	})
	@ApiResponse({
		status: 200,
		description: "ACB files list retrieved successfully",
	})
	async listAcbFiles() {
		return await this.sometoolService.listAcbFiles();
	}

	// ジョブ管理用エンドポイント

	@Get("active-jobs")
	@ApiOperation({
		summary: "Get active sometool jobs",
		description: "Get list of currently running sometool jobs",
	})
	@ApiResponse({
		status: 200,
		description: "Active jobs retrieved successfully",
	})
	async getActiveJobs() {
		return await this.sometoolService.getActiveJobs();
	}

	@Get("jobs/:id")
	@ApiOperation({
		summary: "Get sometool job by ID",
		description:
			"Get details of a specific sometool job with optional incremental log support",
	})
	@ApiQuery({
		name: "lastLength",
		required: false,
		type: "number",
		description:
			"Length of log already received by client for incremental updates",
	})
	@ApiResponse({
		status: 200,
		description: "Job details retrieved successfully",
	})
	async getJobById(
		@Param("id") id: string,
		@Query("lastLength") lastLength?: string,
	) {
		const currentLength = lastLength ? parseInt(lastLength, 10) : 0;
		return await this.sometoolService.getJobById(id, currentLength);
	}

	@Post("jobs/:id/reconnect")
	@ApiOperation({
		summary: "Reconnect to running sometool job",
		description:
			"Check if a running job is still alive and prepare for reconnection",
	})
	@ApiResponse({
		status: 200,
		description: "Reconnection status retrieved successfully",
	})
	async reconnectToJob(@Param("id") id: string) {
		return await this.sometoolService.reconnectToJob(id);
	}

	@Post("jobs/:id/cancel")
	@ApiOperation({
		summary: "Cancel running sometool job",
		description: "Cancel a currently running sometool job",
	})
	@ApiResponse({
		status: 200,
		description: "Job cancelled successfully",
	})
	async cancelJob(@Param("id") id: string) {
		return await this.sometoolService.cancelJob(id);
	}

	@Post("run-with-management")
	@ApiOperation({
		summary: "Run sometool with job management",
		description:
			"Execute sometool with persistent job management and state tracking",
	})
	@ApiBody({
		schema: {
			type: "object",
			properties: {
				analyze: { type: "boolean" },
				dbonly: { type: "boolean" },
				force: { type: "boolean" },
				keepraw: { type: "boolean" },
				convert: { type: "boolean" },
				master: { type: "boolean" },
			},
		},
	})
	@ApiResponse({
		status: 200,
		description: "Sometool job started successfully",
	})
	async runSometoolWithManagement(
		@Body() body: {
			analyze?: boolean;
			dbonly?: boolean;
			force?: boolean;
			keepraw?: boolean;
			convert?: boolean;
			master?: boolean;
		},
	) {
		return await this.sometoolService.runSometoolWithJobManagement(body);
	}
}
