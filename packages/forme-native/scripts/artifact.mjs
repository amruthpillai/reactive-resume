import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const packageRoot = fileURLToPath(new URL("../", import.meta.url));
export const binaryPaths = ["ios/include/forme_native.h", "ios/FormeNative.xcframework", "android/src/main/jniLibs"];
export const requiredFiles = [
	"ios/include/forme_native.h",
	"ios/FormeNative.xcframework/Info.plist",
	"ios/FormeNative.xcframework/ios-arm64/libforme_native.a",
	"ios/FormeNative.xcframework/ios-arm64/Headers/forme_native.h",
	"ios/FormeNative.xcframework/ios-arm64-simulator/libforme_native.a",
	"ios/FormeNative.xcframework/ios-arm64-simulator/Headers/forme_native.h",
	...["arm64-v8a", "armeabi-v7a", "x86_64"].map((abi) => `android/src/main/jniLibs/${abi}/libforme_native.so`),
];

export function sha256(bytes) {
	return createHash("sha256").update(bytes).digest("hex");
}

export async function identity() {
	const hash = createHash("sha256");
	async function visit(directory) {
		for (const entry of (await readdir(join(packageRoot, directory), { withFileTypes: true })).sort((a, b) =>
			a.name.localeCompare(b.name, "en"),
		)) {
			if (directory === "rust" && entry.name === "target") continue;
			const path = `${directory}/${entry.name}`;
			if (entry.isDirectory()) await visit(path);
			else if (entry.isFile()) {
				hash.update(`${path}\0${sha256(await readFile(join(packageRoot, path)))}\0`);
			} else throw new Error(`Unexpected non-file Rust input: ${path}`);
		}
	}
	await visit("rust");
	const { version } = JSON.parse(await readFile(join(packageRoot, "package.json"), "utf8"));
	if (!/^[0-9A-Za-z.+-]+$/.test(version)) throw new Error("Invalid forme-native package version");
	const sourceHash = hash.digest("hex");
	return { version, sourceHash, tag: `forme-native-v${version}-${sourceHash}` };
}

export async function checkBinaries(root) {
	for (const path of requiredFiles) {
		const info = await stat(join(root, path));
		if (!info.isFile() || info.size === 0) throw new Error(`Missing or empty binary input: ${path}`);
	}
}

async function main() {
	const build = await identity();
	if (process.argv[2] === "identity") {
		console.log(JSON.stringify(build));
		return;
	}
	if (process.argv[2] !== "pack" || !process.argv[3]) {
		throw new Error("Usage: node scripts/artifact.mjs identity | pack <output-directory> [release-base-URL]");
	}
	await checkBinaries(packageRoot);
	const output = resolve(process.argv[3]);
	await mkdir(output, { recursive: true });
	const archive = join(output, `${build.tag}.tar.gz`);
	execFileSync("tar", ["-czf", archive, "-C", packageRoot, ...binaryPaths], {
		env: { ...process.env, COPYFILE_DISABLE: "1" },
		stdio: "inherit",
	});
	const url = process.argv[4]
		? `${process.argv[4].replace(/\/$/, "")}/${build.tag}/${build.tag}.tar.gz`
		: pathToFileURL(archive).href;
	const manifest = { schemaVersion: 1, artifacts: [{ ...build, url, sha256: sha256(await readFile(archive)) }] };
	await writeFile(join(output, "prebuilt.json"), `${JSON.stringify(manifest, null, 2)}\n`);
	console.log(JSON.stringify({ ...build, archive, manifest: join(output, "prebuilt.json") }));
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
	main().catch((error) => {
		console.error(error.message);
		process.exitCode = 1;
	});
}
