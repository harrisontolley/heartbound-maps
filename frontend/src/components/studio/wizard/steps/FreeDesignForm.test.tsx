import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// This config doesn't enable Vitest globals, so RTL's auto-cleanup isn't registered;
// unmount between tests so renders don't accumulate in the shared jsdom document.
afterEach(() => {
  cleanup();
  mockApiSend.mockReset();
});

vi.mock("@/lib/export", () => ({
  exportScreenPngBlob: vi.fn(async () => new Blob(["fake-png"], { type: "image/png" })),
  slugify: (s: string) => s.toLowerCase().replace(/\s+/g, "-"),
}));

vi.mock("@/lib/upload/uploadPosterPng", () => ({
  uploadFreePosterPng: vi.fn(async () => ({ url: "https://blob.example/free/london-1.png" })),
}));

const mockApiSend = vi.fn();
// Defining the mock ApiError class inside the factory (rather than importing/
// referencing an outer class) sidesteps vi.mock's hoisting — the factory runs
// before any other module-scope statement in this file.
vi.mock("@/lib/apiClient", () => {
  class ApiError extends Error {
    constructor(
      readonly status: number,
      readonly code: string | null,
      readonly path: string,
    ) {
      super(`request to ${path} failed with ${status}`);
      this.name = "ApiError";
    }
  }
  return {
    apiSend: (...args: unknown[]) => mockApiSend(...args),
    ApiError,
  };
});

import { FreeDesignForm } from "./FreeDesignForm";
import { ApiError } from "@/lib/apiClient";

function fakeSvg(): SVGSVGElement {
  return document.createElementNS("http://www.w3.org/2000/svg", "svg") as SVGSVGElement;
}

async function fillAndSubmit(email: string) {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Email"), email);
  await user.click(screen.getByRole("button", { name: "Email my free design" }));
}

describe("FreeDesignForm", () => {
  it("shows the form with the email input and submit button", () => {
    render(<FreeDesignForm getSvg={fakeSvg} canSubmit />);
    expect(screen.getByText("Get your free design")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toHaveAttribute("type", "email");
    expect(screen.getByRole("button", { name: "Email my free design" })).toBeInTheDocument();
  });

  it("a successful submit (202) shows the sent state with an upsell", async () => {
    mockApiSend.mockResolvedValueOnce({ status: "sent" });
    render(<FreeDesignForm getSvg={fakeSvg} canSubmit />);

    await fillAndSubmit("buyer@example.com");

    expect(await screen.findByText("Check your inbox ✉")).toBeInTheDocument();
    expect(screen.getByText(/buyer@example\.com/)).toBeInTheDocument();
    expect(screen.getByText(/from \$61 with free shipping/)).toBeInTheDocument();
    // The old download buttons must never reappear.
    expect(screen.queryByRole("button", { name: /PNG|SVG/ })).not.toBeInTheDocument();
  });

  it("a 503 (leads_unconfigured) shows the quiet unavailable line and hides the form", async () => {
    mockApiSend.mockRejectedValueOnce(new ApiError(503, "leads_unconfigured", "/leads"));
    render(<FreeDesignForm getSvg={fakeSvg} canSubmit />);

    await fillAndSubmit("buyer@example.com");

    expect(
      await screen.findByText("Free design delivery isn't available right now."),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Email")).not.toBeInTheDocument();
  });

  it("any other failure keeps the form and shows a retry-friendly inline error", async () => {
    mockApiSend.mockRejectedValueOnce(new ApiError(502, "email_send_failed", "/leads"));
    render(<FreeDesignForm getSvg={fakeSvg} canSubmit />);

    await fillAndSubmit("buyer@example.com");

    expect(
      await screen.findByText("Something went wrong — please try again."),
    ).toBeInTheDocument();
    // The form stays so the buyer can retry.
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
  });
});
