import { spawn } from "node:child_process";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { Injectable } from "@nestjs/common";
import sharp from "sharp";
import { AudioConfigService } from "./audio-config.service";
import { NativeShellService } from "./native-shell.service";

type ConvertArgs = {
	sourceWavPath: string;
	destinationPath: string;
	coverPngPath: string;
	title: string;
	artist: string;
};

@Injectable()
export class WavToM4aService {
	constructor(
		private configService: AudioConfigService,
		private shellService: NativeShellService,
	) {}

	async convertWithTags(args: ConvertArgs): Promise<void> {
		const { sourceWavPath, destinationPath, coverPngPath, title, artist } =
			args;
		const ffmpegPath = this.configService.getFfmpegPath();
		const encoder = await this.pickAacEncoder(ffmpegPath);

		await this.deleteIfExists(destinationPath);

		// 20kでカットオフすることで若干品質をよくする, 元データ見ると20k以降にはデータが入っていない
		const command = `"${ffmpegPath}" -y -i "${sourceWavPath}" -c:a ${encoder} -b:a 320k -cutoff 20k "${destinationPath}"`;

		await this.shellService.executeRetryableCommand({
			command,
			description: "WAV to M4A conversion",
			timeout: 120000,
		});

		await this.assertNonEmptyFile(destinationPath);

		const tempJpgPath = path.join(process.cwd(), "temp.jpg");
		await this.deleteIfExists(tempJpgPath);

		try {
			await sharp(coverPngPath).jpeg({ quality: 75 }).toFile(tempJpgPath);
			await this.writeM4aTags(destinationPath, tempJpgPath, title, artist);
		} finally {
			await this.deleteIfExists(tempJpgPath);
		}
	}

	async convertOnly(args: {
		sourceWavPath: string;
		destinationPath: string;
		bitrateKbps?: number;
		cutoffKhz?: number | null;
		loglevel?: "error" | "warning" | "info" | "quiet";
	}): Promise<void> {
		const {
			sourceWavPath,
			destinationPath,
			bitrateKbps = 320,
			cutoffKhz = 20,
			loglevel,
		} = args;
		const ffmpegPath = this.configService.getFfmpegPath();
		const encoder = await this.pickAacEncoder(ffmpegPath);

		await this.deleteIfExists(destinationPath);

		const ffmpegArgs: string[] = [
			`"${ffmpegPath}"`,
			"-y",
			"-i",
			`"${sourceWavPath}"`,
			"-c:a",
			encoder,
			"-b:a",
			`${bitrateKbps}k`,
		];
		if (cutoffKhz !== null) {
			ffmpegArgs.push("-cutoff", `${cutoffKhz}k`);
		}
		ffmpegArgs.push(`"${destinationPath}"`);
		if (loglevel) {
			ffmpegArgs.push("-loglevel", loglevel);
		}
		const command = ffmpegArgs.join(" ");

		await this.shellService.executeRetryableCommand({
			command,
			description: "WAV to M4A conversion",
			timeout: 120000,
		});

		await this.assertNonEmptyFile(destinationPath);
	}

	private async pickAacEncoder(ffmpegPath: string): Promise<string> {
		if (await this.hasEncoder(ffmpegPath, "libfdk_aac")) return "libfdk_aac";
		if (await this.hasEncoder(ffmpegPath, "aac_at")) return "aac_at";
		return "aac";
	}

	private async hasEncoder(
		ffmpegPath: string,
		encoder: string,
	): Promise<boolean> {
		return new Promise((resolve) => {
			const proc = spawn(ffmpegPath, ["-hide_banner", "-encoders"], {
				stdio: ["ignore", "pipe", "pipe"],
			});
			let found = false;
			const onData = (chunk: Buffer) => {
				if (chunk.toString("utf8").includes(` ${encoder}`)) {
					found = true;
				}
			};
			proc.stdout.on("data", onData);
			proc.stderr.on("data", onData);
			proc.on("close", (code) => {
				if (code !== 0) {
					resolve(false);
					return;
				}
				resolve(found);
			});
		});
	}

	private async writeM4aTags(
		m4aPath: string,
		jpgPath: string,
		title: string,
		artist: string,
	): Promise<void> {
		const jpegBuffer = await fs.readFile(jpgPath);
		const mod = await import("music-tag-native");
		const tagger = new mod.MusicTagger();

		try {
			tagger.loadPath(m4aPath);
			tagger.title = title;
			tagger.artist = artist;
			tagger.albumArtist = "蓮ノ空女学院スクールアイドルクラブ";
			tagger.album = "Link！Like！ラブライブ！";
			tagger.genre = "ゲーム";

			const picture = new mod.MetaPicture(
				"image/jpeg",
				new Uint8Array(jpegBuffer),
				null,
			);
			picture.coverType = "CoverFront";
			tagger.pictures = [picture];

			tagger.save();
		} finally {
			tagger.dispose();
		}
	}

	private async deleteIfExists(filePath: string): Promise<void> {
		await fs.unlink(filePath).catch(() => undefined);
	}

	private async assertNonEmptyFile(filePath: string): Promise<void> {
		const stat = await fs.stat(filePath).catch(() => null);
		if (!stat || stat.size <= 0) {
			throw new Error(
				`file conversion failed: ${filePath} not found or size is 0`,
			);
		}
	}
}
