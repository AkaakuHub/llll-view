import HelpViewer from "../components/page/HelpPage/HelpViewer";

const HelpPage: React.FC = () => {
	return (
		<div className="min-h-screen-safe bg-surface p-6 transition-colors duration-300">
			<div className="container mx-auto px-4 max-w-6xl">
				<HelpViewer />
			</div>
		</div>
	);
};

export default HelpPage;
