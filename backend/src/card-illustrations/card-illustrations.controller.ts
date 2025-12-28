import { createReadStream } from "node:fs";
import * as path from "node:path";
import {
	Controller,
	Get,
	NotFoundException,
	Param,
	ParseIntPipe,
	Post,
	Query,
	Res,
} from "@nestjs/common";
import type { Response } from "express";
import type {
	CardAssetAvailability,
	CardIndexEntry,
} from "./card-illustrations.service";
import { CardIllustrationsService } from "./card-illustrations.service";
import type {
	MusicDataBySongResponse,
	RawMusicDataResponse,
} from "./music-data.types";

@Controller("card-illustrations")
export class CardIllustrationsController {
	constructor(
		private readonly cardIllustrationsService: CardIllustrationsService,
	) {}

	@Get()
	async getAllCards(): Promise<{
		totals: {
			cards: number;
			images: { full: number; half: number; middleVertical: number };
			videos: { home: number; get: number; training: number };
			voice: number;
		};
		cards: CardIndexEntry[];
	}> {
		return this.cardIllustrationsService.getCardIndex();
	}

	@Get("index")
	async getCardIndex(): Promise<{
		totals: {
			cards: number;
			images: { full: number; half: number; middleVertical: number };
			videos: { home: number; get: number; training: number };
			voice: number;
		};
		cards: CardIndexEntry[];
	}> {
		return this.cardIllustrationsService.getCardIndex();
	}

	@Get("raw-music-data")
	async getRawMusicData(): Promise<RawMusicDataResponse> {
		return this.cardIllustrationsService.getRawMusicData();
	}

	@Get("music-data/:musicId")
	async getMusicDataBySongId(
		@Param("musicId", ParseIntPipe) musicId: number,
	): Promise<MusicDataBySongResponse> {
		return this.cardIllustrationsService.getMusicDataBySongId(musicId);
	}

	@Get(":id")
	async getCardById(@Param("id", ParseIntPipe) id: number): Promise<{
		id: number;
		cardSeriesId: number;
		characterId: number;
		name?: string;
		description?: string;
		rarity: number;
		evolveTimes: number;
		style: number;
		mood: number;
		initialSmile?: number;
		initialPure?: number;
		initialCool?: number;
		initialMental?: number;
		maxSmile?: number;
		maxPure?: number;
		maxCool?: number;
		maxMental?: number;
		beatPoint?: number;
		orderId?: number;
		character: {
			id: number;
			nameLast: string;
			nameFirst: string;
			latinAlphabetNameLast?: string;
			latinAlphabetNameFirst?: string;
			themeColor?: string;
			introduction?: string;
			styleType?: number;
		};
		assets: CardAssetAvailability;
		seriesCards: Array<{
			id: number;
			cardSeriesId: number;
			characterId: number;
			name?: string;
			description?: string;
			rarity: number;
			evolveTimes: number;
			style: number;
			mood: number;
			assets: CardAssetAvailability;
		}>;
	}> {
		const card = await this.cardIllustrationsService.getCardByIdFromRaw(id);
		if (!card) {
			throw new NotFoundException(`Card not found for id ${id}`);
		}
		return card;
	}

	@Get(":id/performance")
	async getCardWithPerformanceData(@Param("id", ParseIntPipe) id: number) {
		return this.cardIllustrationsService.getCardWithPerformanceData(id);
	}

	@Get("voice/:cardSeriesId")
	async getCardVoice(
		@Param("cardSeriesId", ParseIntPipe) cardSeriesId: number,
		@Res() res: Response,
	) {
		const voiceFilePath =
			await this.cardIllustrationsService.getCardVoiceFile(cardSeriesId);

		if (!voiceFilePath) {
			throw new NotFoundException(
				`Voice file not found for card series ${cardSeriesId}`,
			);
		}

		res.set({
			"Content-Type": "audio/acb",
			"Content-Disposition": `attachment; filename="vo_card_${cardSeriesId}.acb"`,
			"Cache-Control": "public, max-age=3600",
		});

		const stream = createReadStream(voiceFilePath);
		stream.pipe(res);
	}

	@Get("voice/:cardSeriesId/:voiceType")
	async getCardVoiceByType(
		@Param("cardSeriesId", ParseIntPipe) cardSeriesId: number,
		@Param("voiceType") voiceType: string,
		@Res() res: Response,
	) {
		const voiceFilePath =
			await this.cardIllustrationsService.getCardVoiceFileByType(
				cardSeriesId,
				voiceType,
			);

		if (!voiceFilePath) {
			throw new NotFoundException(
				`Voice file not found for card series ${cardSeriesId} type ${voiceType}`,
			);
		}

		res.set({
			"Content-Type": "audio/acb",
			"Content-Disposition": `attachment; filename="vo_card_${cardSeriesId}_${voiceType}.acb"`,
			"Cache-Control": "public, max-age=3600",
		});

		const stream = createReadStream(voiceFilePath);
		stream.pipe(res);
	}

	@Get("image/:cardId")
	async getCardImage(
		@Param("cardId", ParseIntPipe) cardId: number,
		@Query("type") type: "full" | "half" | "middle_vertical",
		@Res() res: Response,
	) {
		const imageType = type || "full";
		const imageFilePath =
			await this.cardIllustrationsService.getCardImageFromRaw(
				cardId,
				imageType,
			);

		if (!imageFilePath) {
			throw new NotFoundException(
				`Image file not found for card ${cardId} type ${imageType}`,
			);
		}

		res.set({
			"Content-Type": "image/png",
			"Cache-Control": "public, max-age=86400",
		});

		const stream = createReadStream(imageFilePath);
		stream.pipe(res);
	}

	@Get("video/home/:cardId")
	async getCardHomeVideo(
		@Param("cardId", ParseIntPipe) cardId: number,
		@Res() res: Response,
	) {
		const videoFilePath =
			await this.cardIllustrationsService.getCardVideoFromRaw(cardId);

		if (!videoFilePath) {
			throw new NotFoundException(
				`Home video file not found for card ${cardId}`,
			);
		}

		res.set({
			"Content-Type": "video/mp4",
			"Accept-Ranges": "bytes",
			"Cache-Control": "public, max-age=3600",
		});

		const stream = createReadStream(videoFilePath);
		stream.pipe(res);
	}

	@Get("video/series/:cardSeriesId")
	async getSeriesVideo(
		@Param("cardSeriesId", ParseIntPipe) cardSeriesId: number,
		@Query("type") type: "get" | "training",
		@Query("phase") phase: "in" | "loop",
		@Res() res: Response,
	) {
		const videoType = type || "get";
		const videoPhase = phase || "in";
		const videoFilePath =
			await this.cardIllustrationsService.getSeriesVideoFromRaw(
				cardSeriesId,
				videoType,
				videoPhase,
			);

		if (!videoFilePath) {
			throw new NotFoundException(
				`Series video not found for card series ${cardSeriesId} (${videoType} ${videoPhase})`,
			);
		}

		res.set({
			"Content-Type": "video/mp4",
			"Accept-Ranges": "bytes",
			"Cache-Control": "public, max-age=3600",
		});

		const stream = createReadStream(videoFilePath);
		stream.pipe(res);
	}

	@Post("sync-all")
	async syncAllData() {
		return this.cardIllustrationsService.syncAllData();
	}

	@Post("sync-card-series/:cardSeriesId")
	async syncCardSeriesData(
		@Param("cardSeriesId", ParseIntPipe) cardSeriesId: number,
	) {
		return this.cardIllustrationsService.syncCardSeriesData(cardSeriesId);
	}

	@Post("extract-assets")
	async extractAssets() {
		return this.cardIllustrationsService.extractAssets();
	}

	@Post("extract-single/:cardId")
	async extractSingleCard(@Param("cardId", ParseIntPipe) cardId: number) {
		return this.cardIllustrationsService.extractSingleCard(cardId);
	}

	@Post("convert-voice/:cardSeriesId/:voiceType")
	async convertCardVoice(
		@Param("cardSeriesId", ParseIntPipe) cardSeriesId: number,
		@Param("voiceType") voiceType: string,
	) {
		return this.cardIllustrationsService.convertCardVoice(
			cardSeriesId,
			voiceType,
		);
	}

	@Get("converted-voice/:cardSeriesId/:voiceType")
	async getConvertedVoice(
		@Param("cardSeriesId", ParseIntPipe) cardSeriesId: number,
		@Param("voiceType") voiceType: string,
		@Res() res: Response,
	) {
		const convertedVoicePath =
			await this.cardIllustrationsService.getConvertedVoiceFile(
				cardSeriesId,
				voiceType,
			);

		if (!convertedVoicePath) {
			throw new NotFoundException(
				`Converted voice file not found for card series ${cardSeriesId} type ${voiceType}`,
			);
		}

		const fileExtension = path.extname(convertedVoicePath).toLowerCase();
		const contentType = fileExtension === ".m4a" ? "audio/mp4" : "audio/wav";

		res.set({
			"Content-Type": contentType,
			"Cache-Control": "public, max-age=3600",
		});

		const stream = createReadStream(convertedVoicePath);
		stream.pipe(res);
	}

	@Get("all-performance-data")
	async getAllPerformanceData() {
		return this.cardIllustrationsService.getAllPerformanceData();
	}
}
