import type { ReactNode } from "react";
import { useState } from "react";
import Button from "../../ui/Button";
import Input from "../../ui/Input";

const sections = [
	{ id: "audio", title: "Audio" },
	{ id: "card", title: "Card" },
	{ id: "story", title: "Story" },
	{ id: "sync", title: "Sync" },
];

type HelpSectionProps = {
	id: string;
	title: string;
	subtitle: string;
	children: ReactNode;
};

const HelpSection = ({ id, title, subtitle, children }: HelpSectionProps) => {
	return (
		<section
			id={id}
			className="rounded-3xl border border-border/70 bg-surface/90 p-8 shadow-sm"
		>
			<h2 className="text-xl font-semibold text-text">{title}</h2>
			<p className="mt-2 text-sm text-muted">{subtitle}</p>
			<div className="mt-6 space-y-5">{children}</div>
		</section>
	);
};

type InfoCardProps = {
	title: string;
	children: ReactNode;
};

const InfoCard = ({ title, children }: InfoCardProps) => {
	return (
		<div className="rounded-2xl border border-border/80 bg-surface/60 p-4">
			<p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
				{title}
			</p>
			<div className="mt-3 text-sm text-muted space-y-2">{children}</div>
		</div>
	);
};

type ControlRowProps = {
	label: string;
	children: ReactNode;
};

const ControlRow = ({ label, children }: ControlRowProps) => {
	return (
		<div className="flex flex-wrap items-center gap-2">
			<span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
				{label}
			</span>
			{children}
		</div>
	);
};

export default function HelpViewer() {
	const [storySearch, setStorySearch] = useState("フワラー");

	return (
		<div className="grid gap-8 lg:grid-cols-[240px_minmax(0,1fr)]">
			<aside className="hidden lg:block">
				<div className="sticky top-6 rounded-2xl border border-border/20 bg-surface/70 p-4 shadow-sm backdrop-blur">
					<p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
						On this page
					</p>
					<nav className="mt-4 space-y-2 text-sm">
						{sections.map((section) => (
							<a
								key={section.id}
								href={`#${section.id}`}
								className="block rounded-lg px-3 py-2 text-muted transition-colors hover:bg-surface/80 cursor-pointer"
							>
								{section.title}
							</a>
						))}
					</nav>
				</div>
			</aside>

			<div className="space-y-10">
				<header className="rounded-3xl border border-border/30 bg-surface/80 p-8 shadow-lg backdrop-blur">
					<p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
						Help Center
					</p>
					<h1 className="mt-3 text-3xl font-semibold text-text">
						LLLL View Usage Guide
					</h1>
					<p className="mt-3 text-sm text-muted">
						This page explains how to use the core viewers and tools in LLLL
						View. All buttons in this page is just a placeholder.
					</p>
				</header>

				<HelpSection
					id="sync"
					title="System Control"
					subtitle="Use System Control to refresh databases and fetch assets."
				>
					<div className="grid gap-4 lg:grid-cols-2">
						<InfoCard title="System Control">
							<p>Sync tools run on the backend.</p>
							<ul className="list-disc pl-5">
								<li>"Check System status" detects backend binary existence.</li>
								<li>"Build System Tool" can compile backend binary</li>
								<li>
									"Full Synchronnization" refreshes all databases and assets.
									Use this basically.
								</li>
							</ul>
							<ControlRow label="Status">
								<Button tone="saya" size="sm" onClick={() => {}}>
									Check System Status
								</Button>
								<Button tone="kozu" size="sm" onClick={() => {}}>
									Build System Tool
								</Button>
							</ControlRow>
						</InfoCard>
					</div>
				</HelpSection>

				<HelpSection
					id="audio"
					title="Audio Converter"
					subtitle="Convert ACB files."
				>
					<div className="grid gap-4 lg:grid-cols-2">
						<InfoCard title="Audio Converter">
							<p>
								Use Audio Converter Tab first to scan ACB bundles, then convert
								them to playable files.
							</p>
							<ul className="list-disc pl-5">
								<li>"Scan ACB Files" to detect new ACB files.</li>
								<li>
									Search by filename and filter by category or status. Basically
									use "bgm_live_" which refers to songs.
								</li>
							</ul>
							<ControlRow label="Quick Actions">
								<Button tone="saya" size="sm" onClick={() => {}}>
									Scan ACB Files
								</Button>
								<Button tone="kaho" size="sm" onClick={() => {}}>
									Convert All
								</Button>
							</ControlRow>
						</InfoCard>
					</div>
				</HelpSection>

				<HelpSection
					id="card"
					title="Card Illustrations"
					subtitle="Browse illustrations, preview assets."
				>
					<div className="grid gap-4 lg:grid-cols-2">
						<InfoCard title="Card Illustrations">
							<p>
								Browse the full card catalog with powerful filtering and
								sorting.
							</p>
							<ul className="list-disc pl-5">
								<li>"Sync All" to fetch missing or updated card data.</li>
								<li>
									"Extract All" to convert all card assets to viewable files.
								</li>
							</ul>
							<ControlRow label="Data">
								<Button tone="hime" size="sm" onClick={() => {}}>
									Sync All
								</Button>
								<Button tone="kozu" size="sm" onClick={() => {}}>
									Extract All
								</Button>
							</ControlRow>
						</InfoCard>

						<InfoCard title="Card Detail">
							<p>
								Open a card to see its full image, effect movie, and voice
								lines.
							</p>
							<ul className="list-disc pl-5">
								<li>Sync a single series if data is missing or outdated.</li>
								<li>Extract assets for the selected card only.</li>
							</ul>
							<ControlRow label="Card Actions">
								<Button tone="hime" size="sm" onClick={() => {}}>
									Sync Series
								</Button>
								<Button tone="kozu" size="sm" onClick={() => {}}>
									Extract Assets
								</Button>
							</ControlRow>
						</InfoCard>
					</div>
				</HelpSection>

				<HelpSection
					id="story"
					title="Story"
					subtitle="Search for stories, open dialogue, and convert voice or BGM."
				>
					<div className="grid gap-4 lg:grid-cols-2">
						<InfoCard title="Story Search">
							<p>
								Search by title/description or by exact dialogue text. Dialogue
								search requires indexing.
							</p>
							<div className="flex flex-wrap items-center gap-2">
								<Button variant="soft" tone="megu" size="sm" onClick={() => {}}>
									Title
								</Button>
								<Button variant="soft" tone="megu" size="sm" onClick={() => {}}>
									Dialogue
								</Button>
								<Button
									variant="outline"
									tone="megu"
									size="sm"
									onClick={() => {}}
								>
									Reindex
								</Button>
							</div>
							<div className="mt-3 grid gap-2">
								<Input
									value={storySearch}
									onChange={(e) => setStorySearch(e.target.value)}
									placeholder="Search by title, description, or ID..."
								/>
								<Button tone="saya" size="sm" onClick={() => {}}>
									Search
								</Button>
							</div>
						</InfoCard>

						<InfoCard title="Story Details">
							<p>
								When a story is selected, you can convert missing assets and
								reload the view after updates.
							</p>
							<ul className="list-disc pl-5">
								<li>Convert voices, backgrounds, BGM, and SE on demand.</li>
								<li>Reload assets if you updated files externally.</li>
								<li>
									Autoplay follows dialogue order when voices are available.
								</li>
							</ul>
							<ControlRow label="Conversion">
								<Button tone="saya" size="sm" onClick={() => {}}>
									Convert story voices
								</Button>
								<Button tone="saya" size="sm" onClick={() => {}}>
									Convert backgrounds
								</Button>
								<Button tone="saya" size="sm" onClick={() => {}}>
									Convert BGM
								</Button>
								<Button tone="saya" size="sm" onClick={() => {}}>
									Convert SE
								</Button>
								<Button variant="soft" tone="saya" size="sm" onClick={() => {}}>
									Reload assets
								</Button>
							</ControlRow>
						</InfoCard>
					</div>
				</HelpSection>
			</div>
		</div>
	);
}
