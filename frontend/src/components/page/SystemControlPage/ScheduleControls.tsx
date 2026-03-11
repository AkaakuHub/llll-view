import { useCallback, useEffect, useMemo, useState } from "react";
import { fetcher } from "../../../lib/fetcher";
import Button from "../../ui/Button";
import Input from "../../ui/Input";
import Toggle from "../../ui/Toggle";

const scheduleModeOptions = [
	{ key: "full_sync", label: "Full Synchronization" },
	{ key: "dbonly", label: "Database Only" },
	{ key: "analyze", label: "Analysis Mode" },
	{ key: "force", label: "Force Update" },
	{ key: "convert", label: "Convert Assets" },
	{ key: "master", label: "Generate Master" },
	{ key: "keepraw", label: "Keep Raw" },
] as const;

type ScheduleModeKey = (typeof scheduleModeOptions)[number]["key"];

type Schedule = {
	id: string;
	name: string;
	enabled: boolean;
	timeOfDay: string;
	timezone: string;
	options?: Record<string, boolean>;
	maxRuntimeSeconds?: number | null;
	lastRunAt?: string | null;
	lastStatus?: string | null;
	lastJobId?: string | null;
	nextRunAt?: string | null;
	createdAt: string;
	updatedAt: string;
};

type NotificationSettings = {
	notifyOnlyUpdates: boolean;
	notifyOnFailure: boolean;
	webhooks: Array<{
		id: string;
		mode: "full_log" | "summary" | "music_only";
	}>;
};

type ServerTime = {
	serverTimeIso: string;
	timezone: string;
	utcOffsetMinutes: number;
};

type ScheduleFormState = {
	id?: string;
	name: string;
	enabled: boolean;
	timeOfDay: string;
	timezone: string;
	mode: ScheduleModeKey;
	maxRuntimeMinutes: string;
};

const defaultOptions: Record<Exclude<ScheduleModeKey, "full_sync">, boolean> = {
	dbonly: false,
	analyze: false,
	force: false,
	convert: false,
	master: false,
	keepraw: false,
};

const formatOffset = (offsetMinutes: number) => {
	const sign = offsetMinutes >= 0 ? "+" : "-";
	const abs = Math.abs(offsetMinutes);
	const hours = String(Math.trunc(abs / 60)).padStart(2, "0");
	const mins = String(abs % 60).padStart(2, "0");
	return `${sign}${hours}:${mins}`;
};

const formatTimeInZone = (iso: string, timeZone: string) => {
	return new Date(iso).toLocaleString(undefined, {
		timeZone,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
		hour12: false,
	});
};

const DEFAULT_TIMEZONE = "Asia/Tokyo";

const notificationModeOptions = [
	{ value: "full_log", label: "Full Log" },
	{ value: "summary", label: "Summary" },
	{ value: "music_only", label: "Music Only" },
] as const;

const scheduleOptionsToMode = (
	options?: Record<string, boolean>,
): ScheduleModeKey => {
	if (options?.dbonly) return "dbonly";
	if (options?.analyze) return "analyze";
	if (options?.force) return "force";
	if (options?.convert) return "convert";
	if (options?.master) return "master";
	if (options?.keepraw) return "keepraw";
	return "full_sync";
};

const scheduleModeToOptions = (
	mode: ScheduleModeKey,
): Record<Exclude<ScheduleModeKey, "full_sync">, boolean> => ({
	...defaultOptions,
	...(mode === "full_sync" ? {} : { [mode]: true }),
});

const buildFormState = (
	schedule: Schedule | null,
	fallbackTimezone: string,
): ScheduleFormState => {
	if (!schedule) {
		return {
			name: "Daily Sync",
			enabled: true,
			timeOfDay: "12:00",
			timezone: fallbackTimezone || DEFAULT_TIMEZONE,
			mode: "full_sync",
			maxRuntimeMinutes: "-1",
		};
	}

	const maxRuntimeMinutes =
		schedule.maxRuntimeSeconds === null ||
		schedule.maxRuntimeSeconds === undefined
			? "-1"
			: String(Math.ceil(schedule.maxRuntimeSeconds / 60));

	return {
		id: schedule.id,
		name: schedule.name,
		enabled: schedule.enabled,
		timeOfDay: schedule.timeOfDay,
		timezone: schedule.timezone,
		mode: scheduleOptionsToMode(schedule.options),
		maxRuntimeMinutes,
	};
};

const ScheduleControls = () => {
	const [serverTime, setServerTime] = useState<ServerTime | null>(null);
	const [clientNow, setClientNow] = useState<Date>(new Date());
	const [schedules, setSchedules] = useState<Schedule[]>([]);
	const [settings, setSettings] = useState<NotificationSettings | null>(null);
	const [loading, setLoading] = useState(false);
	const [savingSettings, setSavingSettings] = useState(false);

	const clientTimezone = useMemo(
		() => Intl.DateTimeFormat().resolvedOptions().timeZone,
		[],
	);
	const clientOffset = useMemo(
		() => formatOffset(-clientNow.getTimezoneOffset()),
		[clientNow],
	);

	const loadServerTime = useCallback(async () => {
		try {
			const response = await fetcher("/time");
			const data = await response.json();
			setServerTime(data);
		} catch (error) {
			console.error("Failed to load server time:", error);
		}
	}, []);

	const loadSchedules = useCallback(async () => {
		try {
			setLoading(true);
			const response = await fetcher("/sometool/schedules");
			const data = await response.json();
			setSchedules(data || []);
		} catch (error) {
			console.error("Failed to load schedules:", error);
		} finally {
			setLoading(false);
		}
	}, []);

	const loadSettings = useCallback(async () => {
		try {
			const response = await fetcher("/sometool/settings/notifications");
			const data = await response.json();
			setSettings(data);
		} catch (error) {
			console.error("Failed to load settings:", error);
		}
	}, []);

	useEffect(() => {
		loadServerTime();
		loadSchedules();
		loadSettings();
	}, [loadServerTime, loadSchedules, loadSettings]);

	const handleSaveSettings = async (next: NotificationSettings) => {
		const previous = settings;
		setSettings(next);
		setSavingSettings(true);
		try {
			await fetcher("/sometool/settings/notifications", {
				method: "POST",
				body: JSON.stringify(next),
			});
		} catch (error) {
			console.error("Failed to save settings:", error);
			setSettings(previous);
		} finally {
			setSavingSettings(false);
		}
	};

	const handleSaveSchedule = async (form: ScheduleFormState) => {
		const parsedMaxRuntime = Number.parseInt(form.maxRuntimeMinutes, 10);
		if (Number.isNaN(parsedMaxRuntime)) {
			console.error("Max Runtime is invalid.");
			return;
		}
		const maxRuntimeSeconds =
			Number.isNaN(parsedMaxRuntime) || parsedMaxRuntime === -1
				? null
				: Math.max(1, parsedMaxRuntime) * 60;

		const payload = {
			id: form.id,
			name: form.name.trim() || "Schedule",
			enabled: form.enabled,
			timeOfDay: form.timeOfDay,
			timezone: form.timezone,
			options: scheduleModeToOptions(form.mode),
			maxRuntimeSeconds,
		};

		try {
			await fetcher("/sometool/schedules", {
				method: "POST",
				body: JSON.stringify(payload),
			});
			await loadSchedules();
		} catch (error) {
			console.error("Failed to save schedule:", error);
		}
	};

	const handleDeleteSchedule = async (id: string) => {
		try {
			await fetcher(`/sometool/schedules/${id}`, { method: "DELETE" });
			await loadSchedules();
		} catch (error) {
			console.error("Failed to delete schedule:", error);
		}
	};

	const handleRunNow = async (id: string) => {
		try {
			await fetcher(`/sometool/schedules/${id}/run-now`, { method: "POST" });
			await loadSchedules();
		} catch (error) {
			console.error("Failed to run schedule:", error);
		}
	};

	const serverOffset = serverTime
		? formatOffset(serverTime.utcOffsetMinutes)
		: "";

	return (
		<div className="bg-surface rounded-lg p-6 border border-border shadow-lg">
			<div className="space-y-6">
				<div className="flex items-start justify-between gap-4">
					<div>
						<h3 className="text-lg font-semibold text-text">
							Schedule & Notifications
						</h3>
						<p className="text-sm text-muted">
							Server and client times are shown to avoid timezone mismatches.
						</p>
					</div>
					<Button
						onClick={() => {
							setClientNow(new Date());
							loadServerTime();
						}}
						variant="soft"
						tone="megu"
						size="sm"
						className="cursor-pointer"
					>
						Refresh Time
					</Button>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div className="bg-muted/20 rounded-lg p-4 border border-border">
						<div className="text-xs uppercase text-muted mb-2">Server Time</div>
						<div className="text-sm text-text">
							{serverTime
								? `${formatTimeInZone(serverTime.serverTimeIso, serverTime.timezone)}`
								: "Loading..."}
						</div>
						<div className="text-xs text-muted mt-1">
							{serverTime ? `${serverTime.timezone} (UTC${serverOffset})` : ""}
						</div>
					</div>
					<div className="bg-muted/20 rounded-lg p-4 border border-border">
						<div className="text-xs uppercase text-muted mb-2">Client Time</div>
						<div className="text-sm text-text">
							{clientNow.toLocaleString(undefined, {
								year: "numeric",
								month: "2-digit",
								day: "2-digit",
								hour: "2-digit",
								minute: "2-digit",
								second: "2-digit",
								hour12: false,
							})}
						</div>
						<div className="text-xs text-muted mt-1">
							{`${clientTimezone} (UTC${clientOffset})`}
						</div>
					</div>
				</div>

				<div className="bg-surface border border-border rounded-lg p-4">
					<div className="flex items-center justify-between mb-3">
						<h4 className="text-sm font-semibold text-text">
							Discord Notifications
						</h4>
						{savingSettings && (
							<div className="text-xs text-muted">Saving...</div>
						)}
					</div>
					{settings ? (
						<div className="space-y-4 text-sm text-text">
							<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
								<div className="flex items-center justify-between gap-2 bg-muted/20 rounded-md p-3 border border-border">
									<span>Notify Only Updates</span>
									<Toggle
										checked={settings.notifyOnlyUpdates}
										onChange={(checked) => {
											const next = {
												...settings,
												notifyOnlyUpdates: checked,
											};
											void handleSaveSettings(next);
										}}
										className="cursor-pointer"
									/>
								</div>
								<div className="flex items-center justify-between gap-2 bg-muted/20 rounded-md p-3 border border-border">
									<span>Notify on Failure</span>
									<Toggle
										checked={settings.notifyOnFailure}
										onChange={(checked) => {
											const next = {
												...settings,
												notifyOnFailure: checked,
											};
											void handleSaveSettings(next);
										}}
										className="cursor-pointer"
									/>
								</div>
							</div>

							<div className="border border-border rounded-lg overflow-hidden">
								<div className="grid grid-cols-[minmax(0,1fr)_150px] bg-muted/15 px-3 py-2 text-xs uppercase tracking-wide text-muted">
									<span>Webhook</span>
									<span>Mode</span>
								</div>
								{settings.webhooks.length > 0 ? (
									settings.webhooks.map((webhook) => (
										<div
											key={webhook.id}
											className="grid grid-cols-[minmax(0,1fr)_150px] items-center gap-3 px-3 py-3 border-t border-border"
										>
											<div className="min-w-0">
												<div className="font-medium text-text truncate">
													{webhook.id}
												</div>
												<div className="text-xs text-muted">
													{webhook.mode === "music_only"
														? 'Receives only "New song is added!" file notifications.'
														: webhook.mode === "summary"
															? "Receives regular notifications with log summary."
															: "Receives regular notifications with full output log."}
												</div>
											</div>
											<select
												value={webhook.mode}
												onChange={(event) => {
													const next = {
														...settings,
														webhooks: settings.webhooks.map((item) =>
															item.id === webhook.id
																? {
																		...item,
																		mode: event.target
																			.value as NotificationSettings["webhooks"][number]["mode"],
																	}
																: item,
														),
													};
													void handleSaveSettings(next);
												}}
												className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-saya cursor-pointer"
											>
												{notificationModeOptions.map((option) => (
													<option key={option.value} value={option.value}>
														{option.label}
													</option>
												))}
											</select>
										</div>
									))
								) : (
									<div className="px-3 py-4 text-sm text-muted">
										No Discord webhooks configured in
										<code className="ml-1">DISCORD_WEBHOOK_URL</code>.
									</div>
								)}
							</div>
						</div>
					) : (
						<div className="text-sm text-muted">Loading settings...</div>
					)}
				</div>

				<div className="space-y-4">
					<ScheduleEditor
						mode="new"
						fallbackTimezone={serverTime?.timezone || DEFAULT_TIMEZONE}
						onSave={handleSaveSchedule}
						onRunNow={null}
						loading={loading}
						serverTimezone={serverTime?.timezone}
					/>

					{schedules.map((schedule) => (
						<ScheduleEditor
							key={schedule.id}
							mode="existing"
							schedule={schedule}
							fallbackTimezone={serverTime?.timezone || DEFAULT_TIMEZONE}
							onSave={handleSaveSchedule}
							onDelete={handleDeleteSchedule}
							onRunNow={handleRunNow}
							loading={loading}
							serverTimezone={serverTime?.timezone}
						/>
					))}
				</div>
			</div>
		</div>
	);
};

type ScheduleEditorProps = {
	mode: "new" | "existing";
	fallbackTimezone: string;
	schedule?: Schedule;
	loading: boolean;
	serverTimezone?: string;
	onSave: (form: ScheduleFormState) => Promise<void>;
	onDelete?: (id: string) => Promise<void>;
	onRunNow: ((id: string) => Promise<void>) | null;
};

const ScheduleEditor = ({
	mode,
	schedule,
	fallbackTimezone,
	loading,
	serverTimezone,
	onSave,
	onDelete,
	onRunNow,
}: ScheduleEditorProps) => {
	const [form, setForm] = useState<ScheduleFormState>(() =>
		buildFormState(schedule ?? null, fallbackTimezone),
	);
	const [saving, setSaving] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	useEffect(() => {
		setForm(buildFormState(schedule ?? null, fallbackTimezone));
	}, [schedule, fallbackTimezone]);

	const handleSave = async () => {
		const trimmedName = form.name.trim();
		if (!trimmedName) {
			setErrorMessage("Name is required.");
			return;
		}
		if (!/^\d{2}:\d{2}$/.test(form.timeOfDay)) {
			setErrorMessage("Time must be in HH:mm format.");
			return;
		}
		const trimmedTimezone = form.timezone.trim();
		if (!trimmedTimezone) {
			setErrorMessage("Timezone is required.");
			return;
		}
		if (!/^-?\d+$/.test(form.maxRuntimeMinutes)) {
			setErrorMessage("Max Runtime must be a number (use -1 for no limit).");
			return;
		}
		if (
			timezoneOptions.length > 0 &&
			!timezoneOptions.includes(trimmedTimezone)
		) {
			setErrorMessage("Timezone must be a valid IANA timezone.");
			return;
		}
		const runtimeValue = Number.parseInt(form.maxRuntimeMinutes, 10);
		if (runtimeValue < -1) {
			setErrorMessage("Max Runtime must be -1 or a positive number.");
			return;
		}

		setErrorMessage(null);
		setSaving(true);
		try {
			await onSave({
				...form,
				name: trimmedName,
				timezone: trimmedTimezone,
			});
			if (mode === "new") {
				setForm(buildFormState(null, fallbackTimezone));
			}
		} finally {
			setSaving(false);
		}
	};

	const timezoneOptions = useMemo(() => {
		if (!("supportedValuesOf" in Intl)) return [];
		try {
			return (Intl as unknown as { supportedValuesOf: (v: string) => string[] })
				.supportedValuesOf("timeZone")
				.sort();
		} catch {
			return [];
		}
	}, []);

	const nextRunServer =
		schedule?.nextRunAt && serverTimezone
			? formatTimeInZone(schedule.nextRunAt, serverTimezone)
			: null;
	const nextRunClient = schedule?.nextRunAt
		? new Date(schedule.nextRunAt).toLocaleString()
		: null;
	const idPrefix = schedule?.id ?? "new";

	return (
		<div className="bg-surface border border-border rounded-lg p-4 space-y-4">
			<div className="flex items-center justify-between gap-4">
				<div>
					<h4 className="text-sm font-semibold text-text">
						{mode === "new" ? "Create Schedule" : form.name}
					</h4>
					{mode === "existing" && schedule?.lastStatus && (
						<p className="text-xs text-muted">
							Last: {schedule.lastStatus}
							{schedule.lastRunAt
								? ` @ ${new Date(schedule.lastRunAt).toLocaleString()}`
								: ""}
						</p>
					)}
				</div>
				{mode === "existing" && schedule && (
					<div className="text-xs text-muted">ID: {schedule.id}</div>
				)}
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				<div>
					<label
						className="block text-xs text-muted mb-1"
						htmlFor={`${idPrefix}-name`}
					>
						Name
					</label>
					<Input
						id={`${idPrefix}-name`}
						value={form.name}
						onChange={(event) =>
							setForm((prev) => ({ ...prev, name: event.target.value }))
						}
						className="cursor-pointer"
					/>
				</div>
				<div>
					<div className="text-xs text-muted mb-1">Enabled</div>
					<div className="flex items-center justify-between bg-muted/20 border border-border rounded-lg px-3 py-2">
						<span className="text-sm text-text">
							{form.enabled ? "Enabled" : "Disabled"}
						</span>
						<Toggle
							checked={form.enabled}
							onChange={(checked) =>
								setForm((prev) => ({ ...prev, enabled: checked }))
							}
							className="cursor-pointer"
						/>
					</div>
				</div>
				<div>
					<label
						className="block text-xs text-muted mb-1"
						htmlFor={`${idPrefix}-time`}
					>
						Time (HH:mm)
					</label>
					<Input
						id={`${idPrefix}-time`}
						type="time"
						value={form.timeOfDay}
						onChange={(event) =>
							setForm((prev) => ({ ...prev, timeOfDay: event.target.value }))
						}
						className="cursor-pointer"
					/>
				</div>
				<div>
					<label
						className="block text-xs text-muted mb-1"
						htmlFor={`${idPrefix}-timezone`}
					>
						Timezone
					</label>
					{timezoneOptions.length > 0 ? (
						<select
							id={`${idPrefix}-timezone`}
							value={form.timezone}
							onChange={(event) =>
								setForm((prev) => ({
									...prev,
									timezone: event.target.value,
								}))
							}
							className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-saya cursor-pointer"
						>
							{timezoneOptions.map((zone) => (
								<option key={zone} value={zone}>
									{zone}
								</option>
							))}
						</select>
					) : (
						<Input
							id={`${idPrefix}-timezone`}
							value={form.timezone}
							onChange={(event) =>
								setForm((prev) => ({
									...prev,
									timezone: event.target.value,
								}))
							}
							className="cursor-pointer"
						/>
					)}
				</div>
				<div>
					<label
						className="block text-xs text-muted mb-1"
						htmlFor={`${idPrefix}-max-runtime`}
					>
						Max Runtime (minutes, -1 = no limit)
					</label>
					<Input
						id={`${idPrefix}-max-runtime`}
						type="number"
						min={-1}
						value={form.maxRuntimeMinutes}
						onChange={(event) =>
							setForm((prev) => ({
								...prev,
								maxRuntimeMinutes: event.target.value,
							}))
						}
						onBlur={() => {
							if (form.maxRuntimeMinutes.trim() === "") {
								setForm((prev) => ({ ...prev, maxRuntimeMinutes: "-1" }));
							}
						}}
						placeholder="-1 for no limit"
						className="cursor-pointer"
					/>
				</div>
			</div>

			<div>
				<label
					className="block text-xs text-muted mb-1"
					htmlFor={`${idPrefix}-mode`}
				>
					Mode
				</label>
				<select
					id={`${idPrefix}-mode`}
					value={form.mode}
					onChange={(event) =>
						setForm((prev) => ({
							...prev,
							mode: event.target.value as ScheduleModeKey,
						}))
					}
					className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-saya cursor-pointer"
				>
					{scheduleModeOptions.map((option) => (
						<option key={option.key} value={option.key}>
							{option.label}
						</option>
					))}
				</select>
			</div>

			{mode === "existing" && schedule && (
				<div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-muted">
					<div className="bg-muted/10 border border-border rounded-md p-3">
						<div className="text-[11px] uppercase text-muted mb-1">
							Next Run (Server)
						</div>
						<div className="text-text">{nextRunServer || "--"}</div>
					</div>
					<div className="bg-muted/10 border border-border rounded-md p-3">
						<div className="text-[11px] uppercase text-muted mb-1">
							Next Run (Client)
						</div>
						<div className="text-text">{nextRunClient || "--"}</div>
					</div>
				</div>
			)}

			<div className="flex flex-wrap items-center gap-3">
				<Button
					onClick={handleSave}
					loading={saving}
					disabled={loading}
					tone="saya"
					size="md"
					className="cursor-pointer"
				>
					{mode === "new" ? "Add Schedule" : "Save Changes"}
				</Button>
				{errorMessage && (
					<div className="text-xs text-tuzu">{errorMessage}</div>
				)}
				{mode === "existing" && schedule && onRunNow && (
					<Button
						onClick={() => onRunNow(schedule.id)}
						disabled={loading}
						variant="soft"
						tone="kozu"
						size="md"
						className="cursor-pointer"
					>
						Run Now
					</Button>
				)}
				{mode === "existing" && schedule && onDelete && (
					<Button
						onClick={() => onDelete(schedule.id)}
						disabled={loading}
						variant="soft"
						tone="tuzu"
						size="md"
						className="cursor-pointer"
					>
						Delete
					</Button>
				)}
			</div>
		</div>
	);
};

export default ScheduleControls;
