import { describe, it, expect } from "vitest";
import { resolveCustomized, DEFAULT_CUSTOMIZATION } from "./customize";
import { getTemplate } from "./registry";

const vintage = getTemplate("vintage-cartography"); // has border + ornate rose
const bold = getTemplate("bold-modern"); // border: null, rose: "none"

describe("resolveCustomized", () => {
  it("returns the base unchanged with default customization", () => {
    const { template, display, text } = resolveCustomized(
      vintage,
      DEFAULT_CUSTOMIZATION,
    );
    expect(template.paper).toBe(vintage.paper);
    expect(template.ink).toBe(vintage.ink);
    expect(template.rose).toBe(vintage.rose);
    expect(template.border).toBe(vintage.border);
    expect(display).toEqual({
      legend: true,
      distances: true,
      north: true,
      footer: true,
    });
    expect(text).toEqual({ title: null, subtitle: null, footer: null });
  });

  it("applies color overrides and ignores blank ones", () => {
    const { template } = resolveCustomized(vintage, {
      ...DEFAULT_CUSTOMIZATION,
      paperOverride: "#123456",
      inkOverride: "   ", // blank → ignored
    });
    expect(template.paper).toBe("#123456");
    expect(template.ink).toBe(vintage.ink);
  });

  it("toggles decoration booleans, falling back when null", () => {
    const off = resolveCustomized(vintage, {
      ...DEFAULT_CUSTOMIZATION,
      textureOn: false,
      roseOn: false,
    }).template;
    expect(off.texture).toBe(false);
    expect(off.rose).toBe("none");

    const untouched = resolveCustomized(vintage, DEFAULT_CUSTOMIZATION).template;
    expect(untouched.texture).toBe(vintage.texture);
  });

  it("border toggle handles templates with and without a base border", () => {
    expect(
      resolveCustomized(vintage, { ...DEFAULT_CUSTOMIZATION, borderOn: false })
        .template.border,
    ).toBeNull();
    // bold has no border; enabling falls back to ink.
    expect(
      resolveCustomized(bold, { ...DEFAULT_CUSTOMIZATION, borderOn: true })
        .template.border,
    ).toBe(bold.ink);
  });

  it("re-enabling the rose on a roseless template restores a sensible style", () => {
    const { template } = resolveCustomized(bold, {
      ...DEFAULT_CUSTOMIZATION,
      roseOn: true,
    });
    expect(template.rose).toBe("tick");
  });

  it("passes through text overrides and visibility flags", () => {
    const { text, display } = resolveCustomized(vintage, {
      ...DEFAULT_CUSTOMIZATION,
      titleText: "  Our Travels  ",
      footerText: "",
      showLegend: false,
    });
    expect(text.title).toBe("  Our Travels  "); // trimming happens at render time
    expect(text.footer).toBeNull(); // blank → null
    expect(display.legend).toBe(false);
  });

  it("does not mutate the base template", () => {
    const before = vintage.paper;
    resolveCustomized(vintage, { ...DEFAULT_CUSTOMIZATION, paperOverride: "#000000" });
    expect(vintage.paper).toBe(before);
  });
});
