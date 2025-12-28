import { useCallback, useEffect, useRef, useState } from "react";
import type { AudioFile } from "../components/page/MusicPlayerPage/types";
import { fetcher } from "../lib/fetcher";

interface LikeResponse {
	success: boolean;
	data: {
		id: string;
		isLiked: boolean;
	};
}

interface UseLikeOptions {
	currentTrack?: AudioFile;
	onTrackUpdate?: (track: AudioFile) => void;
}

interface UseLikeReturn {
	isLikeLoading: boolean;
	handleLikeToggle: () => Promise<void>;
}

const toggleLikeRequest = async (id: string): Promise<LikeResponse> => {
	const response = await fetcher(`/audio/music/like/${id}`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
	});

	if (!response.ok) {
		throw new Error(`Failed to toggle like: ${response.statusText}`);
	}

	return await response.json();
};

const getLikeStatusRequest = async (id: string): Promise<LikeResponse> => {
	const response = await fetcher(`/audio/music/like/${id}`);

	if (!response.ok) {
		throw new Error(`Failed to get like status: ${response.statusText}`);
	}

	return await response.json();
};

export function useLike({
	currentTrack,
	onTrackUpdate,
}: UseLikeOptions): UseLikeReturn {
	const [isLikeLoading, setIsLikeLoading] = useState(false);
	const likeStatusRequestRef = useRef<string | null>(null);
	const currentTrackRef = useRef<AudioFile | undefined>(currentTrack);

	useEffect(() => {
		currentTrackRef.current = currentTrack;
	}, [currentTrack]);

	useEffect(() => {
		if (!currentTrack?.id || !onTrackUpdate) return;
		if (likeStatusRequestRef.current === currentTrack.id) return;

		likeStatusRequestRef.current = currentTrack.id;
		const requestId = currentTrack.id;

		const loadLikeStatus = async () => {
			try {
				const response = await getLikeStatusRequest(requestId);
				if (!response.success) return;
				if (likeStatusRequestRef.current !== requestId) return;

				const latestTrack = currentTrackRef.current;
				if (!latestTrack || latestTrack.id !== requestId) return;
				if (latestTrack.isLiked === response.data.isLiked) return;

				onTrackUpdate({
					...latestTrack,
					isLiked: response.data.isLiked,
				});
			} catch (error) {
				console.error("Failed to load like status:", error);
			}
		};

		void loadLikeStatus();
	}, [currentTrack?.id, onTrackUpdate]);

	const handleLikeToggle = useCallback(async () => {
		if (!currentTrack || isLikeLoading) return;

		setIsLikeLoading(true);
		try {
			const response = await toggleLikeRequest(currentTrack.id);
			if (response.success && onTrackUpdate) {
				onTrackUpdate({
					...currentTrack,
					isLiked: response.data.isLiked,
				});
			}
		} catch (error) {
			console.error("Failed to toggle like:", error);
		} finally {
			setIsLikeLoading(false);
		}
	}, [currentTrack, isLikeLoading, onTrackUpdate]);

	return {
		isLikeLoading,
		handleLikeToggle,
	};
}
