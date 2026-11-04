import { describe, expect, it } from "vitest";
import { GET } from "@/pages/social-card.png";

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

describe("social card", () => {
	it("is a 1200×630 PNG", async () => {
		const response = await GET();
		const bytes = new Uint8Array(await response.arrayBuffer());
		const view = new DataView(bytes.buffer);

		expect(response.headers.get("Content-Type")).toBe("image/png");
		expect([...bytes.subarray(0, 8)]).toEqual(PNG_SIGNATURE);
		expect(new TextDecoder().decode(bytes.subarray(12, 16))).toBe("IHDR");
		expect(view.getUint32(16)).toBe(1200);
		expect(view.getUint32(20)).toBe(630);
	});
});
