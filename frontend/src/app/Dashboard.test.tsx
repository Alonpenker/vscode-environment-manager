import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server } from "@/test/server";
import { renderWithProviders } from "@/test/renderWithProviders";
import Dashboard from "./Dashboard";

describe("Dashboard", () => {
  it("renders the environment grid from the API", async () => {
    renderWithProviders(<Dashboard />);
    expect(
      await screen.findByRole("heading", { name: "demo", level: 3 }, { timeout: 3000 }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "alpha", level: 3 }),
    ).toBeInTheDocument();
    // Metrics: total = 2.
    expect(screen.getByText("Total environments")).toBeInTheDocument();
  });

  it("shows the empty state when there are no environments", async () => {
    server.use(http.get("/api/environments", () => HttpResponse.json([])));
    renderWithProviders(<Dashboard />);
    expect(
      await screen.findByText("No active environments", undefined, {
        timeout: 3000,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /launch first environment/i }),
    ).toBeInTheDocument();
  });

  it("shows an inline error panel when the list request fails", async () => {
    server.use(
      http.get("/api/environments", () =>
        HttpResponse.json(
          { detail: "boom" },
          { status: 500 },
        ),
      ),
    );
    renderWithProviders(<Dashboard />);
    expect(
      await screen.findByText(/couldn’t load environments/i, undefined, {
        timeout: 3000,
      }),
    ).toBeInTheDocument();
  });

  it("opens the launch dialog from the header", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Dashboard />);
    await screen.findByRole("heading", { name: "demo", level: 3 }, { timeout: 3000 });
    await user.click(
      screen.getByRole("button", { name: /launch environment/i }),
    );
    expect(
      await screen.findByRole("dialog"),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/workspace folder/i)).toBeInTheDocument();
  });
});
