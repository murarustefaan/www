import { describe, expect, it } from "vitest";
import { ROWS, stitch, TOOTH } from "./embroidery";

const row = (r: number) => Array.from({ length: TOOTH }, (_, k) => stitch(k, r));

describe("stitch", () => {
	it("stitches every cell of the band", () => {
		for (let r = 0; r < ROWS; r++) expect(row(r)).not.toContain(0);
	});

	it("narrows the crimson tooth by one stitch a side on each row as the black one widens", () => {
		for (let r = 0; r < ROWS; r++) {
			expect(row(r).filter((v) => v === 1)).toHaveLength(TOOTH - 2 * r);
			expect(row(r).filter((v) => v === 2)).toHaveLength(2 * r);
		}
	});

	it("repeats every tooth", () => {
		for (let r = 0; r < ROWS; r++)
			for (let k = 0; k < TOOTH; k++) expect(stitch(k + TOOTH * 3, r)).toBe(stitch(k, r));
	});

	it("is mirror-symmetric within a tooth", () => {
		for (let r = 0; r < ROWS; r++) expect(row(r)).toEqual([...row(r)].reverse());
	});
});
