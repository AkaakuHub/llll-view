import { Eye } from "lucide-react";
import type React from "react";

interface CardImageAssets {
	images: {
		full: boolean;
		half: boolean;
		middleVertical: boolean;
	};
}

interface SeriesCard {
	id: number;
	cardSeriesId: number;
	characterId: number;
	name?: string;
	rarity: number;
	evolveTimes: number;
	style: number;
	mood: number;
	assets: CardImageAssets;
}

interface SeriesCardsPanelProps {
	seriesCards: SeriesCard[];
	getImageUrl: (cardId: number, type: string) => string;
	hasAnyImage: (assets?: CardImageAssets) => boolean;
	onSelectCard: (cardId: number) => void;
}

const SeriesCardsPanel: React.FC<SeriesCardsPanelProps> = ({
	seriesCards,
	getImageUrl,
	hasAnyImage,
	onSelectCard,
}) => {
	return (
		<div className="bg-surface border border-border rounded-xl p-4">
			<h2 className="text-lg font-semibold text-text mb-3">Series Cards</h2>
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
				{seriesCards
					.filter((seriesCard) => seriesCard.evolveTimes <= 2)
					.map((seriesCard) => {
						const type = seriesCard.assets?.images.full
							? "full"
							: seriesCard.assets?.images.middleVertical
								? "middle_vertical"
								: "half";
						return (
							<button
								key={seriesCard.id}
								type="button"
								className="group text-left cursor-pointer rounded-xl border border-border bg-surface overflow-hidden"
								onClick={() => onSelectCard(seriesCard.id)}
							>
								<div className="relative aspect-[16/9] overflow-hidden bg-surface flex items-center justify-center">
									{hasAnyImage(seriesCard.assets) ? (
										<img
											src={getImageUrl(seriesCard.id, type)}
											alt={seriesCard.name || `Card ${seriesCard.id}`}
											className="w-full h-full object-cover"
										/>
									) : (
										<Eye className="h-5 w-5 text-muted" />
									)}
								</div>
								<div className="px-3 py-2">
									<p className="text-sm text-text line-clamp-1">
										{seriesCard.name || `Card ${seriesCard.id}`}
									</p>
									<p className="text-xs text-muted">
										Stage {seriesCard.evolveTimes}
									</p>
								</div>
							</button>
						);
					})}
			</div>
		</div>
	);
};

export default SeriesCardsPanel;
