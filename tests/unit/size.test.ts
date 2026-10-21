import { describe, it, expect } from "vitest";
import { parseSize } from "@/domain/size";
import { ParkingError } from "@/domain/errors";

function codeOf(input: unknown): string | undefined {
  try {
    parseSize(input);
  } catch (e) {
    expect(e).toBeInstanceOf(ParkingError);
    return (e as ParkingError).code;
  }
  return undefined;
}

describe("parseSize (R2)", () => {
  it("accepts small and large", () => {
    expect(parseSize("small")).toBe("small");
    expect(parseSize("large")).toBe("large");
  });

  it.each([["Small"], ["LARGE"], [" small"], ["medium"], [""], [null], [undefined], [1], [{}], [["small"]]])(
    "rejects %j with INVALID_INPUT",
    (input) => {
      expect(codeOf(input)).toBe("INVALID_INPUT");
    },
  );
});
