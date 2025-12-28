import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, RotateCcw } from "lucide-react";
import type React from "react";
import Button from "../../../ui/Button";

interface ReconvertConfirmModalProps {
	isOpen: boolean;
	isReconverting: boolean;
	trackTitle?: string;
	onConfirm: () => void;
	onCancel: () => void;
}

export const ReconvertConfirmModal: React.FC<ReconvertConfirmModalProps> = ({
	isOpen,
	isReconverting,
	trackTitle,
	onConfirm,
	onCancel,
}) => {
	return (
		<AnimatePresence>
			{isOpen && (
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					className="fixed inset-0 bg-surface/70 z-50 flex items-center justify-center p-4 transition-colors duration-300"
					onClick={onCancel}
				>
					<motion.div
						initial={{ opacity: 0, scale: 0.95, y: 20 }}
						animate={{ opacity: 1, scale: 1, y: 0 }}
						exit={{ opacity: 0, scale: 0.95, y: 20 }}
						transition={{ duration: 0.2, ease: "easeOut" }}
						className="bg-surface/95 border border-border/50 rounded-xl p-6 max-w-md w-full shadow-lg"
						onClick={(e) => e.stopPropagation()}
					>
						<div className="flex items-center gap-3 mb-4">
							<div className="p-2 rounded-full bg-kaho/20">
								<AlertTriangle className="w-5 h-5 text-kaho" />
							</div>
							<h3 className="text-lg font-semibold text-text">
								Re-encode Track
							</h3>
						</div>

						<div className="mb-6">
							<p className="text-text mb-2">
								Are you sure you want to re-encode this track?
							</p>
							{trackTitle && (
								<p className="text-sm text-text bg-border/80 rounded-lg p-3 border border-border/50">
									<span className="font-medium">Track:</span> {trackTitle}
								</p>
							)}
							<p className="text-xs text-text mt-3">
								This process may take a few moments and will replace the current
								audio file.
							</p>
						</div>

						<div className="flex gap-3 justify-end">
							<Button
								onClick={onCancel}
								disabled={isReconverting}
								variant="soft"
								tone="megu"
							>
								Cancel
							</Button>
							<Button
								onClick={onConfirm}
								disabled={isReconverting}
								tone="kaho"
								className="flex items-center gap-2"
							>
								{isReconverting ? (
									<>
										<RotateCcw className="w-4 h-4 animate-spin" />
										Re-encoding...
									</>
								) : (
									<>
										<RotateCcw className="w-4 h-4" />
										Re-encode
									</>
								)}
							</Button>
						</div>
					</motion.div>
				</motion.div>
			)}
		</AnimatePresence>
	);
};
