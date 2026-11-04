export type Scene = "day" | "night";

export const IASI_TIME_ZONE = "Europe/Bucharest";
export const NIGHT_FROM = 20;
export const NIGHT_UNTIL = 7;

let clock: Intl.DateTimeFormat | undefined;

export function iasiTime(date: Date): { hour: number; minute: number; label: string } {
	clock ??= new Intl.DateTimeFormat("en-GB", {
		timeZone: IASI_TIME_ZONE,
		hour: "2-digit",
		minute: "2-digit",
		hourCycle: "h23",
	});
	const parts = clock.formatToParts(date);
	const part = (type: Intl.DateTimeFormatPartTypes) =>
		Number(parts.find((p) => p.type === type)?.value ?? 0);
	const hour = part("hour") % 24;
	const minute = part("minute");
	return {
		hour,
		minute,
		label: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
	};
}

export function isNightHour(hour: number): boolean {
	return hour >= NIGHT_FROM || hour < NIGHT_UNTIL;
}

export function sceneAt(date: Date): Scene {
	return isNightHour(iasiTime(date).hour) ? "night" : "day";
}

export function msUntilNextMinute(date: Date): number {
	return 60_000 - (date.getTime() % 60_000);
}
