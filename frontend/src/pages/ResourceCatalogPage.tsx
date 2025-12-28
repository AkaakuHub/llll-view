import type React from "react";
import CatalogViewer from "../components/page/ResourceCatalogPage/CatalogViewer";

const CatalogPage: React.FC = () => {
	return (
		<div className="min-h-screen-safe bg-surface p-6 transition-colors duration-300">
			<div className="max-w-6xl mx-auto">
				<div className="mb-8">
					<h1 className="text-3xl font-bold text-text mb-2">
						Resource Catalog
					</h1>
				</div>

				<CatalogViewer />
			</div>
		</div>
	);
};

export default CatalogPage;
