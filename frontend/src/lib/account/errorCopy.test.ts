import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/apiClient";
import { describeError } from "./errorCopy";

describe("describeError", () => {
  it("maps 401/403 to an auth error", () => {
    expect(describeError(new ApiError(401, "unauthorized", "/account/orders")).kind).toBe("auth");
    expect(describeError(new ApiError(403, null, "/account/orders")).kind).toBe("auth");
  });

  it("maps 404 to not-found", () => {
    expect(describeError(new ApiError(404, "not_found", "/account/orders/PP-1")).kind).toBe(
      "notfound",
    );
  });

  it("maps 5xx and other non-2xx to a server error", () => {
    expect(describeError(new ApiError(500, null, "/account/rewards")).kind).toBe("server");
    expect(describeError(new ApiError(401 + 0, "auth_unconfigured", "/account/profile")).kind).toBe(
      "auth",
    );
    expect(describeError(new ApiError(503, null, "/account/profile")).kind).toBe("server");
  });

  it("maps a thrown non-ApiError (fetch rejection) to a network error", () => {
    expect(describeError(new TypeError("Failed to fetch")).kind).toBe("network");
  });

  it("never leaks the status code or path into user-facing copy", () => {
    const { title, message } = describeError(new ApiError(401, "unauthorized", "/account/orders"));
    expect(`${title} ${message}`).not.toMatch(/401|\/account|→/);
  });
});
