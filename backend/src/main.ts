import { join } from "node:path";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import * as dotenv from "dotenv";
import { expand } from "dotenv-expand";
import { AppModule } from "./app.module";
import { AppLoggerService } from "./logger/logger.service";

expand(dotenv.config());

async function bootstrap() {
	const app = await NestFactory.create<NestExpressApplication>(AppModule);
	const appLoggerService = app.get(AppLoggerService);
	const logger = appLoggerService.createLogger("Bootstrap");

	const allowedOrigins = process.env.CORS_ORIGIN
		? process.env.CORS_ORIGIN.split(",").map((origin) => origin.trim())
		: ["http://localhost:5173"];

	logger.log(`CORS allowed origins: ${allowedOrigins.join(", ")}`);

	app.enableCors({
		origin: allowedOrigins,
		credentials: true,
		methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
		allowedHeaders: ["Content-Type", "Authorization", "Range"],
		exposedHeaders: ["Content-Range", "Accept-Ranges", "Content-Length"],
	});

	const config = new DocumentBuilder()
		.setTitle("LLLL View API")
		.setDescription("Audio file management and conversion API")
		.setVersion("1.0")
		.addTag("audio", "Audio file operations")
		.build();

	const document = SwaggerModule.createDocument(app, config);
	SwaggerModule.setup("api", app, document);

	// assetsディレクトリを静的ファイルとして配信（音声ファイル対応）
	app.useStaticAssets(join(__dirname, "..", "..", "..", "assets"), {
		prefix: "/assets/",
		setHeaders: (res, path) => {
			// 音声ファイルの場合、特別なヘッダーを設定
			if (
				path.endsWith(".m4a") ||
				path.endsWith(".mp3") ||
				path.endsWith(".wav")
			) {
				res.setHeader("Accept-Ranges", "bytes");
				res.setHeader("Cache-Control", "public, max-age=31536000"); // 1年キャッシュ
				res.setHeader("Access-Control-Allow-Origin", "*");
				res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
				res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
			}
			// 画像ファイルの場合
			if (
				path.endsWith(".webp") ||
				path.endsWith(".png") ||
				path.endsWith(".jpg") ||
				path.endsWith(".jpeg")
			) {
				res.setHeader("Cache-Control", "public, max-age=86400"); // 1日キャッシュ
				res.setHeader("Access-Control-Allow-Origin", "*");
				res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
			}
		},
	});

	// tempディレクトリを静的ファイルとして配信（カードイラスト・動画対応）
	app.useStaticAssets(join(__dirname, "..", "..", "..", "temp"), {
		prefix: "/temp/",
		setHeaders: (res, path) => {
			// 画像ファイルの場合
			if (
				path.endsWith(".webp") ||
				path.endsWith(".png") ||
				path.endsWith(".jpg") ||
				path.endsWith(".jpeg")
			) {
				res.setHeader("Cache-Control", "public, max-age=86400"); // 1日キャッシュ
				res.setHeader("Access-Control-Allow-Origin", "*");
				res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
			}
			// 動画ファイルの場合
			if (
				path.endsWith(".mp4") ||
				path.endsWith(".webm") ||
				path.endsWith(".mkv")
			) {
				res.setHeader("Accept-Ranges", "bytes");
				res.setHeader("Cache-Control", "public, max-age=3600"); // 1時間キャッシュ
				res.setHeader("Access-Control-Allow-Origin", "*");
				res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
				res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
			}
		},
	});

	const port = process.env.PORT || 8000;
	await app.listen(port);
	logger.log(`Backend server is running on http://localhost:${port}`);
	logger.log(
		`Assets served from: ${join(__dirname, "..", "..", "..", "assets")}`,
	);
}
bootstrap();
