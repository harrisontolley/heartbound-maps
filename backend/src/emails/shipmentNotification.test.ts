import { describe, expect, it } from "vitest";
import { shipmentNotificationEmail } from "./shipmentNotification.js";

// Pure template — no I/O. One template parameterized on "shipped" | "delivered".
// Covers: framing per kind, carrier/tracking-number/tracking-url rendering
// (and graceful omission when absent), the /track link, and escaping.

const tracking = { carrier: "UPS", number: "1Z999AA10123456784", url: "https://ups.example.com/track/1Z999" };

function baseInput(overrides: Record<string, unknown> = {}) {
  return {
    kind: "shipped" as const,
    orderNumber: "HB-ABCD1234",
    tracking,
    trackUrl: "https://heartboundmaps.example.com/track",
    ...overrides,
  };
}

describe("shipmentNotificationEmail", () => {
  it("returns a non-empty subject, html, and text", () => {
    const { subject, html, text } = shipmentNotificationEmail(baseInput());
    expect(subject).toBeTruthy();
    expect(html).toBeTruthy();
    expect(text).toBeTruthy();
  });

  it("includes the order number in the subject", () => {
    const { subject } = shipmentNotificationEmail(baseInput());
    expect(subject).toContain("HB-ABCD1234");
  });

  it('frames "shipped" as on its way, with a grammatical "has shipped" subject', () => {
    const { subject, html, text } = shipmentNotificationEmail(baseInput({ kind: "shipped" }));
    expect(subject.toLowerCase()).toContain("shipped");
    expect(subject).toContain("has shipped");
    for (const content of [html.toLowerCase(), text.toLowerCase()]) {
      expect(content).toContain("on its way");
    }
  });

  it('frames "delivered" as arrived, distinctly from "shipped"', () => {
    const shipped = shipmentNotificationEmail(baseInput({ kind: "shipped" }));
    const delivered = shipmentNotificationEmail(baseInput({ kind: "delivered" }));
    expect(delivered.subject).not.toBe(shipped.subject);
    for (const content of [delivered.html.toLowerCase(), delivered.text.toLowerCase()]) {
      expect(content).toContain("arrived");
    }
  });

  it('subject reads "has been delivered", not the carrier-speak "has delivered"', () => {
    const { subject } = shipmentNotificationEmail(baseInput({ kind: "delivered" }));
    expect(subject).toContain("has been delivered");
    expect(subject).not.toContain("has delivered");
  });

  it("renders the carrier, tracking number, and tracking url when present", () => {
    const { html, text } = shipmentNotificationEmail(baseInput());
    for (const content of [html, text]) {
      expect(content).toContain("UPS");
      expect(content).toContain("1Z999AA10123456784");
      expect(content).toContain("https://ups.example.com/track/1Z999");
    }
  });

  it("omits tracking details entirely when no tracking is present (no broken/undefined output)", () => {
    const { html, text } = shipmentNotificationEmail(baseInput({ tracking: undefined }));
    for (const content of [html, text]) {
      expect(content).not.toContain("undefined");
      expect(content).not.toContain("null");
    }
  });

  it("renders only the fields present when tracking is partial (carrier only, no number/url)", () => {
    const { html, text } = shipmentNotificationEmail(baseInput({ tracking: { carrier: "USPS" } }));
    for (const content of [html, text]) {
      expect(content).toContain("USPS");
      expect(content).not.toContain("undefined");
    }
  });

  it("includes the /track link when trackUrl is provided", () => {
    const { html, text } = shipmentNotificationEmail(baseInput({ trackUrl: "https://heartboundmaps.example.com/track" }));
    expect(html).toContain("https://heartboundmaps.example.com/track");
    expect(text).toContain("https://heartboundmaps.example.com/track");
  });

  it("gracefully omits the track link when trackUrl is null", () => {
    const { html } = shipmentNotificationEmail(baseInput({ trackUrl: null }));
    expect(html).not.toContain("undefined");
    expect(html).not.toContain("null");
  });

  it("HTML-escapes the tracking carrier/number (order-derived data flows through unsanitized)", () => {
    const { html } = shipmentNotificationEmail(
      baseInput({ tracking: { carrier: `<script>alert(1)</script>`, number: "123" } }),
    );
    expect(html).not.toContain("<script>");
  });

  it("copy contains no em/en dashes, no exclamation marks, and never the word poster", () => {
    for (const kind of ["shipped", "delivered"] as const) {
      const { subject, html, text } = shipmentNotificationEmail(baseInput({ kind }));
      for (const content of [subject, html.replace("<!doctype html>", ""), text]) {
        expect(content).not.toMatch(/[—–]/);
        expect(content).not.toMatch(/!/);
        expect(content.toLowerCase()).not.toContain("poster");
      }
    }
  });
});
