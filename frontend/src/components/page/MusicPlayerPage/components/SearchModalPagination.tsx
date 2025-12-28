import type React from "react";
import Button from "../../../ui/Button";

interface PaginationProps {
	currentPage: number;
	totalItems: number;
	itemsPerPage: number;
	onPageChange: (page: number) => void;
	isLoading?: boolean;
}

const MiniButton: React.FC<{
	onClick: () => void;
	disabled: boolean;
	children: React.ReactNode;
}> = ({ onClick, disabled, children }) => (
	<Button
		asMotion
		whileHover={{ scale: 1.05 }}
		whileTap={{ scale: 0.95 }}
		onClick={onClick}
		disabled={disabled}
		variant="outline"
		tone="megu"
		size="sm"
		className="text-sm border-text/20 hover:bg-surface/10"
	>
		{children}
	</Button>
);

export const Pagination: React.FC<PaginationProps> = ({
	currentPage,
	totalItems,
	itemsPerPage,
	onPageChange,
	isLoading = false,
}) => {
	const totalPages = Math.ceil(totalItems / itemsPerPage);

	if (totalPages <= 1) return null;

	return (
		<div className="flex text-text items-center justify-between border-t border-border/10 py-2">
			<div className="text-sm">
				{(currentPage - 1) * itemsPerPage + 1} -{" "}
				{Math.min(currentPage * itemsPerPage, totalItems)} /{" "}
				{totalItems.toLocaleString()} Songs
			</div>
			<div className="flex items-center gap-2">
				<MiniButton
					onClick={() => onPageChange(1)}
					disabled={currentPage === 1 || isLoading}
				>
					First
				</MiniButton>
				<MiniButton
					onClick={() => onPageChange(currentPage - 1)}
					disabled={currentPage === 1 || isLoading}
				>
					Back
				</MiniButton>
				<span className="px-3 py-1 text-sm">
					{currentPage} / {totalPages.toLocaleString()}
				</span>
				<MiniButton
					onClick={() => onPageChange(currentPage + 1)}
					disabled={currentPage >= totalPages || isLoading}
				>
					Next
				</MiniButton>
				<MiniButton
					onClick={() => onPageChange(totalPages)}
					disabled={currentPage >= totalPages || isLoading}
				>
					Last
				</MiniButton>
			</div>
		</div>
	);
};
