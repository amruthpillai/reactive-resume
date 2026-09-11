import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

it("rewrites Ubuntu APT sources while preserving unrelated repositories and signature settings", () => {
	const workflow = readFileSync(new URL("../.github/workflows/e2e.yml", import.meta.url), "utf8");
	const expression = workflow.match(/-exec sed -i -E '([^']+)'/)?.[1];
	if (!expression) throw new Error("Ubuntu mirror rewrite is missing");
	const input = [
		"deb http://archive.ubuntu.com/ubuntu noble main",
		"URIs: http://us.archive.ubuntu.com/ubuntu/",
		"URIs: https://security.ubuntu.com/ubuntu/",
		"Signed-By: /usr/share/keyrings/ubuntu-archive-keyring.gpg",
		"URIs: mirror+file:/etc/apt/blacksmith-ubuntu-mirrors.txt",
		"deb https://packages.microsoft.com/ubuntu/24.04/prod noble main",
	].join("\n");
	const output = execFileSync("sed", ["-E", expression], { input, encoding: "utf8" });
	expect(output.trimEnd()).toBe(
		input
			.replace("http://archive.ubuntu.com/ubuntu", "https://mirrors.edge.kernel.org/ubuntu")
			.replace("http://us.archive.ubuntu.com/ubuntu", "https://mirrors.edge.kernel.org/ubuntu")
			.replace("https://security.ubuntu.com/ubuntu", "https://mirrors.edge.kernel.org/ubuntu"),
	);
});
