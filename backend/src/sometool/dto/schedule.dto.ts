import {
	IsBoolean,
	IsInt,
	IsNotEmpty,
	IsObject,
	IsOptional,
	IsString,
	IsTimeZone,
	Matches,
	MaxLength,
	Min,
} from "class-validator";

export class UpsertScheduleDto {
	@IsOptional()
	@IsString()
	id?: string;

	@IsString()
	@IsNotEmpty()
	@MaxLength(100)
	name!: string;

	@IsBoolean()
	enabled!: boolean;

	@Matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
	timeOfDay!: string;

	@IsTimeZone()
	timezone!: string;

	@IsOptional()
	@IsObject()
	options?: Record<string, boolean>;

	@IsOptional()
	@IsInt()
	@Min(-1)
	maxRuntimeSeconds?: number | null;
}
