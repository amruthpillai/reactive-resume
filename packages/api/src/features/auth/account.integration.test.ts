import { createHmac, randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createRouterClient } from "@orpc/server";
import { Pool } from "pg";
import { auth } from "@reactive-resume/auth/config";
import { db, withDatabasePool } from "@reactive-resume/db/client";
import * as schema from "@reactive-resume/db/schema";
import { env } from "@reactive-resume/env/server";
import { authRouter } from "./router";

// Like the OAuth CI checks, this uses a disposable, migrated database, with isolated fixture tables.
describe.skipIf(!process.env.OAUTH_TEST_DATABASE_URL)("account wrapper ownership", () => {
	const schemaName = `account_test_${randomUUID().replaceAll("-", "")}`;
	let admin: Pool;
	let pool: Pool;

	beforeAll(async () => {
		admin = new Pool({ connectionString: process.env.OAUTH_TEST_DATABASE_URL });
		await admin.query(`CREATE SCHEMA ${schemaName}`);
		for (const table of ["user", "session", "apikey", "oauth_resource", "jwks"]) {
			await admin.query(`CREATE TABLE ${schemaName}."${table}" (LIKE public."${table}" INCLUDING ALL)`);
		}
		pool = new Pool({
			connectionString: process.env.OAUTH_TEST_DATABASE_URL,
			options: `-c search_path=${schemaName}`,
		});
	});

	afterAll(async () => {
		await pool?.end();
		await admin?.query(`DROP SCHEMA IF EXISTS ${schemaName} CASCADE`);
		await admin?.end();
	});

	it("confines concurrent account calls to their authenticated users, despite another user's cookie", async () => {
		await withDatabasePool(pool, async () => {
			const methods = ["session", "bearer", "apiKey"] as const;
			const users = await db
				.insert(schema.user)
				.values(
					["foreign", ...methods].map((id) => ({
						id,
						name: id,
						email: `${id}@example.test`,
						username: id.toLowerCase(),
						displayUsername: id.toLowerCase(),
					})),
				)
				.returning();
			const foreign = users[0];
			if (!foreign) throw new Error("Missing foreign-user fixture");
			const authContext = await auth.$context;
			const session = await authContext.internalAdapter.createSession(foreign.id);
			const signature = createHmac("sha256", env.AUTH_SECRET).update(session.token).digest("base64");
			const cookie = `${authContext.authCookies.sessionToken.name}=${encodeURIComponent(`${session.token}.${signature}`)}`;
			const headers = new Headers({ cookie });
			expect((await auth.api.getSession({ headers }))?.user.id).toBe(foreign.id);
			const foreignKey = await auth.api.createApiKey({ body: { userId: foreign.id, name: "Foreign" } });

			await Promise.all(
				methods.map(async (method, index) => {
					const user = users[index + 1];
					if (!user) throw new Error(`Missing ${method} fixture`);
					const ownKey = await auth.api.createApiKey({ body: { userId: user.id, name: method } });
					const resHeaders = new Headers();
					const client = createRouterClient(authRouter, {
						context: {
							locale: "en-US",
							reqHeaders: headers,
							resHeaders,
							authentication: { user, method, permissions: ["read", "write", "delete"] },
						},
					});
					const username = `saved-${method.toLowerCase()}`;
					await expect(client.updateProfile({ name: "Saved", username, image: null })).resolves.toEqual({
						status: true,
					});
					await expect(client.updateProfile({ username: foreign.username })).rejects.toMatchObject({
						code: "USERNAME_IS_ALREADY_TAKEN",
						status: 400,
					});
					const listed = await client.apiKeys.list();
					expect(listed.total).toBe(1);
					expect(listed.apiKeys.map((key) => key.id)).toEqual([ownKey.id]);
					expect(listed.apiKeys[0]).not.toHaveProperty("key");
					expect(listed.apiKeys[0]).not.toHaveProperty("metadata");
					expect(JSON.stringify(listed)).not.toContain(ownKey.key);
					await expect(client.apiKeys.delete({ keyId: foreignKey.id })).rejects.toMatchObject({ status: 404 });
					await expect(client.apiKeys.delete({ keyId: ownKey.id })).resolves.toEqual({ success: true });
					expect((await client.apiKeys.list()).apiKeys).toEqual([]);
					expect(resHeaders.has("set-cookie")).toBe(false);
				}),
			);
			const saved = await db.select().from(schema.user);
			expect(saved.find((user) => user.id === foreign.id)?.name).toBe("foreign");
			for (const method of methods) {
				expect(saved.find((user) => user.id === method)).toMatchObject({
					name: "Saved",
					username: `saved-${method.toLowerCase()}`,
					displayUsername: `saved-${method.toLowerCase()}`,
				});
			}
			expect((await db.select().from(schema.apikey)).map((key) => key.id)).toEqual([foreignKey.id]);
			expect(await db.select().from(schema.session)).toHaveLength(1);
			await expect(auth.api.listApiKeys({})).rejects.toMatchObject({ statusCode: 401 });
			const response = await auth.handler(
				new Request(`${env.APP_URL}/api/auth/update-user`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ name: "Must not save" }),
				}),
			);
			expect(response.status).toBe(401);
		});
	});
});
