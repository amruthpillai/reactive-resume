import type { BrowserContext, Page } from "@playwright/test";
import type { E2EAccount } from "./data";
import { test as base, expect } from "@playwright/test";
import { createAuthenticatedContext } from "./auth";
import { createAccount } from "./data";
import { deleteE2EUser } from "./db";

type Fixtures = {
	account: E2EAccount;
	authContext: BrowserContext;
	authPage: Page;
};

export const test = base.extend<Fixtures>({
	account: async ({}, use, testInfo) => {
		const account = createAccount(testInfo);

		try {
			await use(account);
		} finally {
			await deleteE2EUser(account);
		}
	},
	authContext: async ({ browser, request, account, baseURL }, use) => {
		const context = await createAuthenticatedContext(browser, request, account, baseURL ?? "http://localhost:3000");

		try {
			await use(context);

			await context.close();
		}
	},
	authPage: async ({ authContext }, use) => {
		const page = await authContext.newPage();

		try {
			await use(page);
		} finally {
			await page.close();
		}
	},
});

export { expect };
