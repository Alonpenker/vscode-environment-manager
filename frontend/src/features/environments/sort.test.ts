import { describe, expect, it } from "vitest";
import { makeEnvironment } from "@/test/fixtures";
import { sortEnvironments } from "./useEnvironments";

const withName = (id: string, status: "running" | "stopped" | "creating" | "error", name: string) =>
  makeEnvironment({
    id,
    status,
    workspace: {
      requested_path: name,
      resolved_host_path: `/host/${name}`,
      container_path: `/workspaces/${name}`,
    },
  });

describe("sortEnvironments", () => {
  it("orders by status priority then name", () => {
    const input = [
      withName("e", "error", "zeta"),
      withName("s", "stopped", "beta"),
      withName("c", "creating", "gamma"),
      withName("r", "running", "alpha"),
    ];
    const result = sortEnvironments(input, null).map((e) => e.id);
    expect(result).toEqual(["r", "c", "s", "e"]);
  });

  it("sorts alphabetically within the same status", () => {
    const input = [
      withName("b", "running", "banana"),
      withName("a", "running", "apple"),
    ];
    const result = sortEnvironments(input, null).map((e) => e.id);
    expect(result).toEqual(["a", "b"]);
  });

  it("floats the highlighted environment to the top", () => {
    const input = [
      withName("r", "running", "alpha"),
      withName("h", "stopped", "zeta"),
    ];
    const result = sortEnvironments(input, "h").map((e) => e.id);
    expect(result[0]).toBe("h");
  });
});
