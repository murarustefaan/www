import { describe, expect, it } from "vitest";
import { iasiTime, isNightHour, msUntilNextMinute, sceneAt } from "./iasi-time";

describe("iasiTime", () => {
	it("reads summer time as UTC+3", () => {
		expect(iasiTime(new Date("2026-07-15T11:32:00Z"))).toEqual({
			hour: 14,
			minute: 32,
			label: "14:32",
		});
	});

	it("reads winter time as UTC+2", () => {
		expect(iasiTime(new Date("2026-01-15T11:32:00Z")).label).toBe("13:32");
	});

	it("pads midnight and early hours", () => {
		expect(iasiTime(new Date("2026-01-14T22:05:00Z")).label).toBe("00:05");
		expect(iasiTime(new Date("2026-01-15T07:09:00Z")).label).toBe("09:09");
	});

	it("follows the spring clock change", () => {
		expect(iasiTime(new Date("2026-03-29T00:59:00Z")).label).toBe("02:59");
		expect(iasiTime(new Date("2026-03-29T01:00:00Z")).label).toBe("04:00");
	});
});

describe("isNightHour", () => {
	it("is night from 20:00 until 07:00", () => {
		const night = Array.from({ length: 24 }, (_, h) => h).filter(isNightHour);
		expect(night).toEqual([0, 1, 2, 3, 4, 5, 6, 20, 21, 22, 23]);
	});
});

describe("sceneAt", () => {
	it.each([
		["2026-07-15T16:59:00Z", "day"],
		["2026-07-15T17:00:00Z", "night"],
		["2026-07-15T03:59:00Z", "night"],
		["2026-07-15T04:00:00Z", "day"],
		["2026-01-15T17:59:00Z", "day"],
		["2026-01-15T18:00:00Z", "night"],
		["2026-01-15T04:59:00Z", "night"],
		["2026-01-15T05:00:00Z", "day"],
	])("at %s it is %s in Iași", (iso, scene) => {
		expect(sceneAt(new Date(iso))).toBe(scene);
	});

	it("uses Iași time, not the visitor's", () => {
		expect(sceneAt(new Date("2026-07-15T22:00:00-07:00"))).toBe("day");
	});
});

describe("msUntilNextMinute", () => {
	it("counts to the top of the next minute", () => {
		expect(msUntilNextMinute(new Date("2026-07-15T11:32:45.250Z"))).toBe(14_750);
		expect(msUntilNextMinute(new Date("2026-07-15T11:32:00.000Z"))).toBe(60_000);
	});
});
