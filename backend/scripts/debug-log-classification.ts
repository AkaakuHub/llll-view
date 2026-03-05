import * as fs from "node:fs";
import * as path from "node:path";
import {
	detectTentativeCategory,
	extractUpdatedEntries,
	summarizeReportedCounts,
	toReportedCategory,
} from "../src/sometool/log-classifier";

type ClassifiedEntry = {
	entry: string;
	tentative: string;
	reported: string;
};

function usage(): never {
	console.error(
		"Usage: node dist-scripts/scripts/debug-log-classification.js <log-file-path>",
	);
	process.exit(1);
}

function main(): void {
	const args = process.argv.slice(2).filter((arg) => arg !== "--");
	const inputPath = args[0];
	if (!inputPath) usage();

	const resolvedPath = path.resolve(inputPath);
	if (!fs.existsSync(resolvedPath)) {
		console.error(`File not found: ${resolvedPath}`);
		process.exit(1);
	}

	const outputLog = fs.readFileSync(resolvedPath, "utf8");
	const updatedEntries = extractUpdatedEntries(outputLog);
	const reportedCounts = summarizeReportedCounts(outputLog);

	const classified: ClassifiedEntry[] = updatedEntries.map((entry) => {
		const tentative = detectTentativeCategory(entry);
		const reported = toReportedCategory(tentative);
		return {
			entry,
			tentative,
			reported,
		};
	});

	classified.sort((a, b) => {
		if (a.reported !== b.reported) return a.reported.localeCompare(b.reported);
		if (a.tentative !== b.tentative) return a.tentative.localeCompare(b.tentative);
		return a.entry.localeCompare(b.entry);
	});

	console.log(`# File: ${resolvedPath}`);
	console.log(`# Updated entries: ${updatedEntries.length}`);
	console.log(
		`# Reported counts: sound=${reportedCounts.sound}, story=${reportedCounts.story}, unclassified=${reportedCounts.unclassified}`,
	);
	console.log("");
	console.log("reported\ttentative\tentry");
	for (const row of classified) {
		console.log(`${row.reported}\t${row.tentative}\t${row.entry}`);
	}
}

main();
