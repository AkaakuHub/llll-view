import { Injectable, Logger } from "@nestjs/common";

type LogMessage = string;
type LogTrace = unknown;
type LogLevel = "debug" | "info" | "log" | "warn" | "error";

const LOG_LEVEL_ORDER: Record<LogLevel, number> = {
	debug: 10,
	info: 20,
	log: 20,
	warn: 30,
	error: 40,
};

class ScopedLogger {
	constructor(
		private readonly context: string,
		private readonly baseLogger: Logger,
		private readonly shouldLog: (level: LogLevel) => boolean,
	) {}

	log(message: LogMessage) {
		if (!this.shouldLog("log")) return;
		this.baseLogger.log(message, this.context);
	}

	info(message: LogMessage) {
		if (!this.shouldLog("info")) return;
		this.baseLogger.log(message, this.context);
	}

	debug(message: LogMessage) {
		if (!this.shouldLog("debug")) return;
		this.baseLogger.debug(message, this.context);
	}

	warn(message: LogMessage) {
		if (!this.shouldLog("warn")) return;
		this.baseLogger.warn(message, this.context);
	}

	error(message: LogMessage, trace?: LogTrace) {
		if (!this.shouldLog("error")) return;
		this.baseLogger.error(message, trace, this.context);
	}
}

@Injectable()
export class AppLoggerService {
	private readonly baseLogger = new Logger("App");
	private readonly minLevel: LogLevel;

	constructor() {
		const envLevel = (process.env.LOG_LEVEL || "info").toLowerCase();
		const isValidLevel = envLevel in LOG_LEVEL_ORDER;
		this.minLevel = isValidLevel ? (envLevel as LogLevel) : "info";
	}

	createLogger(context: string): ScopedLogger {
		return new ScopedLogger(
			context,
			this.baseLogger,
			this.shouldLog.bind(this),
		);
	}

	log(message: LogMessage, context?: string) {
		if (!this.shouldLog("log")) return;
		this.baseLogger.log(message, context);
	}

	info(message: LogMessage, context?: string) {
		if (!this.shouldLog("info")) return;
		this.baseLogger.log(message, context);
	}

	debug(message: LogMessage, context?: string) {
		if (!this.shouldLog("debug")) return;
		this.baseLogger.debug(message, context);
	}

	warn(message: LogMessage, context?: string) {
		if (!this.shouldLog("warn")) return;
		this.baseLogger.warn(message, context);
	}

	error(message: LogMessage, trace?: LogTrace, context?: string) {
		if (!this.shouldLog("error")) return;
		this.baseLogger.error(message, trace, context);
	}

	isDebugEnabled(): boolean {
		return this.shouldLog("debug");
	}

	private shouldLog(level: LogLevel): boolean {
		return LOG_LEVEL_ORDER[level] >= LOG_LEVEL_ORDER[this.minLevel];
	}
}
