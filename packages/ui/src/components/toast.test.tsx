import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Toaster, toast } from "./toast";

describe("Toaster", () => {
	it("renders a toast added through the manager", async () => {
		render(<Toaster />);

		toast.add({ type: "success", title: "Resume published", description: "It is now live." });

		await waitFor(() => expect(screen.getByText("Resume published")).toBeInTheDocument());
		expect(screen.getByText("It is now live.")).toBeInTheDocument();
	});

	it("removes a toast when closed by id", async () => {
		render(<Toaster />);

		const id = toast.add({ description: "Temporary", timeout: 0 });
		await waitFor(() => expect(screen.getByText("Temporary")).toBeInTheDocument());

		toast.close(id);
		await waitFor(() => expect(screen.queryByText("Temporary")).not.toBeInTheDocument());
	});

	it("upserts a toast reusing the same id", async () => {
		render(<Toaster />);

		const id = toast.add({ id: "upsert", description: "Saving…", timeout: 0 });
		toast.add({ id, type: "success", description: "Saved." });

		await waitFor(() => expect(screen.getByText("Saved.")).toBeInTheDocument());
		expect(screen.queryByText("Saving…")).not.toBeInTheDocument();
	});
});
