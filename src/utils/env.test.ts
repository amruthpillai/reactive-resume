import { describe, expect, it, vi } from "vite-plus/test";

const createEnvMock = vi.fn<(config: unknown) => unknown>((config: unknown) => config);

vi.mock("@t3-oss/env-core", () => ({
  createEnv: createEnvMock,
}));

describe("env configuration", () => {
  it("builds createEnv config with expected server schemas", async () => {
    await import("./env");

    expect(createEnvMock).toHaveBeenCalledOnce();

    const config = createEnvMock.mock.calls[0][0] as {
      clientPrefix: string;
      runtimeEnv: NodeJS.ProcessEnv;
      emptyStringAsUndefined: boolean;
      server: Record<string, unknown>;
    };

    expect(config.clientPrefix).toBe("VITE_");
    expect(config.runtimeEnv).toBe(process.env);
    expect(config.emptyStringAsUndefined).toBe(true);
    expect(config.server.APP_URL).toBeDefined();
    expect(config.server.DATABASE_URL).toBeDefined();
    expect(config.server.AUTH_SECRET).toBeDefined();
    expect(config.server.OAUTH_SCOPES).toBeDefined();
    expect(config.server.S3_FORCE_PATH_STYLE).toBeDefined();
    expect(config.server.FLAG_DISABLE_SIGNUPS).toBeDefined();

    const parsedScopes = (config.server.OAUTH_SCOPES as { parse: (value: string) => string[] }).parse(
      "openid profile email",
    );
    expect(parsedScopes).toEqual(["openid", "profile", "email"]);
  });
});
