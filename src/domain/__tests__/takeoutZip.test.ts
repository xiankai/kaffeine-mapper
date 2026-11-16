import { takeoutZip } from "../../test/fixtures";
import { parseTakeoutZip, TAKEOUT_URL } from "../takeoutZip";

describe("parseTakeoutZip", () => {
  it("reads every saved list and starred places from the archive, skipping junk", () => {
    const { places, lists } = parseTakeoutZip(takeoutZip());
    expect(lists.sort()).toEqual(["Saved Places", "Want to go"]);
    expect(places.map((p) => [p.name, p.lists[0]]).sort()).toEqual([
      ["Bean There", "Want to go"],
      ["Kiln", "Saved Places"],
    ]);
  });

  it("pre-selects Maps (your places) and Saved", () => {
    expect(TAKEOUT_URL).toMatch(/custom\/local_actions,save$/);
  });
});
