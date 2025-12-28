import {
	ClipboardList,
	Database as DatabaseIcon,
	FileSearch,
	Search,
	Table,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { fetcher } from "../../../lib/fetcher";
import Button from "../../ui/Button";

interface Database {
	name: string;
	type: string;
	description: string;
	recordCount?: number;
}

export default function DatabaseViewer() {
	const [databases, setDatabases] = useState<Database[]>([]);
	const [selectedTable, setSelectedTable] = useState<string>("");
	const [data, setData] = useState<Record<string, unknown>[]>([]);
	const [columns, setColumns] = useState<string[]>([]);
	const [loading, setLoading] = useState(false);
	const [searchQuery, setSearchQuery] = useState<string>("");
	const [totalRecords, setTotalRecords] = useState<number>(0);

	const loadDatabases = useCallback(async () => {
		try {
			const response = await fetcher("/database/list");
			const result = await response.json();
			setDatabases(result.databases || []);
		} catch (error) {
			console.error("Failed to load databases:", error);
		}
	}, []);

	useEffect(() => {
		loadDatabases();
	}, [loadDatabases]);

	const handleTableSelect = async (tableName: string) => {
		setSelectedTable(tableName);
		setLoading(true);
		setSearchQuery("");
		await loadTableData(tableName);
	};

	const loadTableData = async (tableName: string, search?: string) => {
		try {
			const searchParam = search ? `&search=${encodeURIComponent(search)}` : "";
			const response = await fetcher(
				`/database/table/${tableName}?limit=100&offset=0${searchParam}`,
			);
			const result = await response.json();

			if (result.error) {
				console.error("Error loading table data:", result.error);
				setData([]);
				setColumns([]);
				setTotalRecords(0);
			} else {
				setData(result.data || []);
				setColumns(result.columns || []);
				setTotalRecords(result.total || 0);
			}
		} catch (error) {
			console.error("Failed to load table data:", error);
			setData([]);
			setColumns([]);
			setTotalRecords(0);
		} finally {
			setLoading(false);
		}
	};

	const handleSearch = async () => {
		if (!selectedTable) return;
		setLoading(true);
		await loadTableData(selectedTable, searchQuery);
	};

	return (
		<div className="bg-surface rounded-lg p-6 border border-border">
			<div className="space-y-4">
				{/* Header */}
				<div className="text-center mb-6">
					<h2 className="text-2xl font-bold text-text mb-2">
						<span className="inline-flex items-center justify-center gap-2">
							<DatabaseIcon className="h-6 w-6" />
							Database Viewer
						</span>
					</h2>
					<p className="text-muted">Browse and search master data tables</p>
				</div>

				{/* Table Selection */}
				<div className="bg-surface rounded-lg p-4 border border-border">
					<label
						htmlFor="database-table-select"
						className="block text-sm font-medium mb-2 text-text"
					>
						<span className="inline-flex items-center gap-2">
							<Table className="h-4 w-4" />
							Table Selection
						</span>
					</label>
					<select
						id="database-table-select"
						value={selectedTable}
						onChange={(e) => handleTableSelect(e.target.value)}
						className="w-full bg-border border border-border rounded-md px-3 py-2 text-text focus:border-primary-500 focus:outline-none cursor-pointer"
					>
						<option value="">Select a table</option>
						{databases.map((db) => (
							<option key={db.name} value={db.name}>
								{db.name} ({db.recordCount} records) - {db.description}
							</option>
						))}
					</select>
				</div>

				{/* Table Search */}
				{selectedTable && (
					<div className="bg-surface rounded-lg p-4 border border-border">
						<div className="flex space-x-2">
							<input
								type="text"
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								placeholder="Search within the table..."
								className="flex-1 bg-border border border-border rounded-md px-3 py-2 text-text placeholder-muted focus:border-primary-500 focus:outline-none"
								onKeyDown={(e) => e.key === "Enter" && handleSearch()}
							/>
							<Button
								onClick={handleSearch}
								tone="megu"
								className="rounded-md cursor-pointer"
							>
								<span className="inline-flex items-center gap-2">
									<Search className="h-4 w-4" />
									Search
								</span>
							</Button>
						</div>
					</div>
				)}

				{/* Loading */}
				{loading && (
					<div className="text-center py-8">
						<div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-muted"></div>
						<div className="mt-2 text-muted">Loading...</div>
					</div>
				)}

				{/* Table Data */}
				{selectedTable && !loading && (
					<div className="bg-surface rounded-lg border border-border">
						<div className="px-4 py-3 border-b border-border">
							<h3 className="text-lg font-semibold text-text">
								<span className="inline-flex items-center gap-2">
									<ClipboardList className="h-5 w-5" />
									{selectedTable} ({totalRecords} records)
								</span>
							</h3>
						</div>

						{data.length > 0 && (
							<div className="overflow-x-auto">
								<table className="w-full">
									<thead className="bg-border">
										<tr>
											{columns.map((column) => (
												<th
													key={column}
													className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider border-b border-border"
												>
													{column}
												</th>
											))}
										</tr>
									</thead>
									<tbody className="divide-y divide-border">
										{data.map((row) => (
											<tr
												key={columns
													.map((column) =>
														row[column] !== null && row[column] !== undefined
															? String(row[column])
															: "",
													)
													.join("|")}
												className="hover:bg-border transition-colors"
											>
												{columns.map((column) => (
													<td
														key={column}
														className="px-4 py-3 text-sm text-text whitespace-nowrap"
													>
														{row[column] !== null && row[column] !== undefined
															? String(row[column])
															: "-"}
													</td>
												))}
											</tr>
										))}
									</tbody>
								</table>
							</div>
						)}

						{data.length === 0 && (
							<div className="text-center py-8 text-muted">
								<span className="inline-flex items-center gap-2">
									<FileSearch className="h-5 w-5" />
									No data found
								</span>
							</div>
						)}
					</div>
				)}

				{!selectedTable && !loading && (
					<div className="text-center py-8 text-muted">
						<span className="inline-flex items-center gap-2">
							<Table className="h-5 w-5" />
							Select a table to view data
						</span>
					</div>
				)}
			</div>
		</div>
	);
}
