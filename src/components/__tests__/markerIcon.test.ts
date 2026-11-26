import { escapeHtml, markerHtml, markerSize } from "../markerIcon";

describe("markerHtml", () => {
  const base = { ring: "#2f8f5b", visited: true };

  it("renders each kind with the score ring and visit state", () => {
    expect(markerHtml({ ...base, kind: "dot" })).toBe(
      '<span class="map-marker map-marker-dot map-marker-visited" style="--ring:#2f8f5b"></span>',
    );
    expect(markerHtml({ ...base, visited: false, kind: "cafe" })).toContain(
      'map-marker-saved" style="--ring:#2f8f5b">☕</span>',
    );
    expect(
      markerHtml({ ...base, kind: "initials", initials: "<B>" }),
    ).toContain(">&lt;B&gt;</span>");
  });

  it("puts the logo over the initials and escapes its URL", () => {
    const html = markerHtml({
      ...base,
      kind: "logo",
      initials: "SB",
      logo: 'https://x/a.png?w=64&"q"',
    });
    expect(html).toContain(
      'SB<img src="https://x/a.png?w=64&amp;&quot;q&quot;" alt=""',
    );
  });

  it("sizes dots smaller than badges", () => {
    expect(markerSize({ ...base, kind: "dot" })).toBeLessThan(
      markerSize({ ...base, kind: "cafe" }),
    );
    expect(escapeHtml(`'`)).toBe("&#39;");
  });
});
