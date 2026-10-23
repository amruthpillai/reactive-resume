import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, expect, it, vi } from "vite-plus/test";

const envMock = vi.hoisted(() => ({
	APP_URL: "https://resume.example.com",
	STORAGE_BACKEND: "local",
	LOCAL_STORAGE_PATH: "",
}));
vi.mock("@reactive-resume/env/server", () => ({ env: envMock }));
vi.mock("@reactive-resume/api/features/storage", async (original) => ({
	...(await original<typeof import("@reactive-resume/api/features/storage")>()),
	isPublicUploadOwner: async () => true,
}));

let storage: ReturnType<typeof import("@reactive-resume/api/features/storage").getStorageService>;
let handleUpload: typeof import("./uploads").handleUpload;
beforeAll(async () => {
	envMock.LOCAL_STORAGE_PATH = await mkdtemp(join(tmpdir(), "resume-private-upload-"));
	storage = (await import("@reactive-resume/api/features/storage")).getStorageService();
	({ handleUpload } = await import("./uploads"));
});
afterAll(async () => {
	await rm(envMock.LOCAL_STORAGE_PATH, { recursive: true, force: true });
});

it("stores a private local attachment for authenticated reads and excludes it from public uploads", async () => {
	const key = "uploads/user-1/agent/thread-1/attachment-1";
	const data = new TextEncoder().encode("private attachment");
	await storage.write({ key, data, contentType: "text/plain", private: true });
	const stored = await storage.read(key);
	expect(stored).not.toBeNull();
	expect(Uint8Array.from(stored?.data ?? [])).toEqual(data);
	if (process.platform !== "win32")
		expect((await stat(join(envMock.LOCAL_STORAGE_PATH, key))).mode & 0o777).toBe(0o600);
	expect((await handleUpload(new Request(`${envMock.APP_URL}/api/${key}`))).status).toBe(404);
});

it.each(["uploads/user-1/pictures/private", "uploads/../agent/thread-1/private", "uploads/user-1/agent/../private"])(
	"rejects private writes outside the canonical attachment namespace: %s",
	async (key) => {
		await expect(
			storage.write({ key, data: new Uint8Array([1]), contentType: "text/plain", private: true }),
		).rejects.toThrow();
		expect(await storage.read(key)).toBeNull();
	},
);

it("migrates guest upload pictures so they are accessible via the new user URL and removed from the old URL", async () => {
	const { migrateUserStorage } = await import("@reactive-resume/api/features/storage");
	const guestKey = "uploads/guest-user/pictures/avatar.png";
	const pngData = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
	await storage.write({ key: guestKey, data: pngData, contentType: "image/png" });
	await storage.write({
		key: "uploads/guest-user/agent/thread-1/attachment-1",
		data: pngData,
		contentType: "image/png",
		private: true,
	});

	const beforeResponse = await handleUpload(new Request(`${envMock.APP_URL}/api/${guestKey}`));
	expect(beforeResponse.status).toBe(200);

	const cleanup = await migrateUserStorage("guest-user", "registered-user");
	// Sources remain usable until the database transition succeeds.
	expect((await handleUpload(new Request(`${envMock.APP_URL}/api/${guestKey}`))).status).toBe(200);
	await cleanup?.();

	const oldResponse = await handleUpload(new Request(`${envMock.APP_URL}/api/${guestKey}`));
	expect(oldResponse.status).toBe(404);

	const newKey = "uploads/registered-user/pictures/avatar.png";
	const newResponse = await handleUpload(new Request(`${envMock.APP_URL}/api/${newKey}`));
	expect(newResponse.status).toBe(200);
	expect(new Uint8Array(await newResponse.arrayBuffer())).toEqual(pngData);
	if (process.platform !== "win32")
		expect(
			(await stat(join(envMock.LOCAL_STORAGE_PATH, "uploads/registered-user/agent/thread-1/attachment-1"))).mode &
				0o777,
		).toBe(0o600);
});

it("lists single file key when prefix points directly to an existing file", async () => {
	const key = "uploads/test-user/pictures/avatar.png";
	await storage.write({ key, data: new Uint8Array([1, 2, 3]), contentType: "image/png" });
	const results = await storage.list(key);
	expect(results).toEqual([key]);
});
