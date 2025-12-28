export interface MusicListResponse {
	success: boolean;
	data: unknown[];
	pagination: {
		total: number;
		limit: number;
		offset: number;
		hasMore: boolean;
	};
}
