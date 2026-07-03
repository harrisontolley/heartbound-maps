import { afterEach, describe, expect, it, vi } from "vitest";
import { isWebGLAvailable } from "./webgl";

function stubGetContext(impl: (kind: string) => unknown) {
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(
    impl as never,
  );
}

describe("isWebGLAvailable", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("true when webgl2 is available", () => {
    vi.stubGlobal("WebGLRenderingContext", function () {});
    stubGetContext((kind) => (kind === "webgl2" ? {} : null));
    expect(isWebGLAvailable()).toBe(true);
  });

  it("true when only webgl1 is available", () => {
    vi.stubGlobal("WebGLRenderingContext", function () {});
    stubGetContext((kind) => (kind === "webgl" ? {} : null));
    expect(isWebGLAvailable()).toBe(true);
  });

  it("false when no context can be created (blocklisted driver)", () => {
    vi.stubGlobal("WebGLRenderingContext", function () {});
    stubGetContext(() => null);
    expect(isWebGLAvailable()).toBe(false);
  });

  it("false when the browser has no WebGLRenderingContext at all", () => {
    vi.stubGlobal("WebGLRenderingContext", undefined);
    stubGetContext(() => ({}));
    expect(isWebGLAvailable()).toBe(false);
  });

  it("false when getContext throws", () => {
    vi.stubGlobal("WebGLRenderingContext", function () {});
    stubGetContext(() => {
      throw new Error("blocked");
    });
    expect(isWebGLAvailable()).toBe(false);
  });
});
