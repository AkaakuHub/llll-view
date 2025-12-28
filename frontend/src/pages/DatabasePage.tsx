import type React from "react";
import DatabaseStatus from "../components/page/DatabasePage/DatabaseStatus";
import DatabaseViewer from "../components/page/DatabasePage/DatabaseViewer";

const DatabasePage: React.FC = () => {
	return (
		<div className="min-h-screen-safe bg-surface p-6 transition-colors duration-300">
			<div className="max-w-6xl mx-auto">
				<div className="mb-8">
					<h1 className="text-3xl font-bold text-text mb-2">
						Database Management
					</h1>
				</div>

				<div className="space-y-6">
					<DatabaseStatus />
					<DatabaseViewer />
				</div>
			</div>
		</div>
	);
};

export default DatabasePage;
