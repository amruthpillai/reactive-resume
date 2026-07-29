import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { generateOpenApiSpec } from "./generator";

export async function generateOpenApiDocumentation(
	target = fileURLToPath(new URL("../../../../docs/spec.json", import.meta.url)),
) {
	const packageJson = JSON.parse(await readFile(new URL("../../../../package.json", import.meta.url), "utf8")) as {
		version: string;
	};
	const spec = await generateOpenApiSpec({ appUrl: "https://rxresu.me", version: packageJson.version });
	await writeFile(target, `${JSON.stringify(spec, null, "\t")}\n`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
	await generateOpenApiDocumentation(process.argv[2]);
}
