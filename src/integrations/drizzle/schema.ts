import { defineRelations } from "drizzle-orm";
import * as pg from "drizzle-orm/pg-core";

import { defaultResumeData, type ResumeData } from "../../schema/resume/data";
import { generateId } from "../../utils/string";

export const user = pg.pgTable(
  "user",
  {
    id: pg
      .uuid("id")
      .notNull()
      .primaryKey()
      .$defaultFn(() => generateId()),
    image: pg.text("image"),
    name: pg.text("name").notNull(),
    email: pg.text("email").notNull().unique(),
    emailVerified: pg.boolean("email_verified").notNull().default(false),
    username: pg.text("username").notNull().unique(),
    displayUsername: pg.text("display_username").notNull().unique(),
    twoFactorEnabled: pg.boolean("two_factor_enabled").notNull().default(false),
    lastActiveAt: pg.timestamp("last_active_at", { withTimezone: true }),
    createdAt: pg.timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: pg
      .timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date()),
  },
  (t) => [pg.index().on(t.createdAt.asc())],
);

export const session = pg.pgTable(
  "session",
  {
    id: pg
      .uuid("id")
      .notNull()
      .primaryKey()
      .$defaultFn(() => generateId()),
    token: pg.text("token").notNull().unique(),
    ipAddress: pg.text("ip_address"),
    userAgent: pg.text("user_agent"),
    userId: pg
      .uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    expiresAt: pg.timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: pg.timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: pg
      .timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date()),
  },
  (t) => [pg.index().on(t.token, t.userId), pg.index().on(t.expiresAt)],
);

export const account = pg.pgTable(
  "account",
  {
    id: pg
      .uuid("id")
      .notNull()
      .primaryKey()
      .$defaultFn(() => generateId()),
    accountId: pg.text("account_id").notNull(),
    providerId: pg.text("provider_id").notNull().default("credential"),
    userId: pg
      .uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    scope: pg.text("scope"),
    idToken: pg.text("id_token"),
    password: pg.text("password"),
    accessToken: pg.text("access_token"),
    refreshToken: pg.text("refresh_token"),
    accessTokenExpiresAt: pg.timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: pg.timestamp("refresh_token_expires_at", { withTimezone: true }),
    createdAt: pg.timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: pg
      .timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date()),
  },
  (t) => [pg.index().on(t.userId)],
);

export const verification = pg.pgTable(
  "verification",
  {
    id: pg
      .uuid("id")
      .notNull()
      .primaryKey()
      .$defaultFn(() => generateId()),
    identifier: pg.text("identifier").notNull().unique(),
    value: pg.text("value").notNull(),
    expiresAt: pg.timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: pg.timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: pg
      .timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date()),
  },
  (t) => [pg.index().on(t.identifier)],
);

export const twoFactor = pg.pgTable(
  "two_factor",
  {
    id: pg
      .uuid("id")
      .notNull()
      .primaryKey()
      .$defaultFn(() => generateId()),
    userId: pg
      .uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    secret: pg.text("secret").notNull(),
    backupCodes: pg.text("backup_codes").notNull(),
    createdAt: pg.timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: pg
      .timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date()),
  },
  (t) => [pg.index().on(t.userId), pg.index().on(t.secret)],
);

export const passkey = pg.pgTable(
  "passkey",
  {
    id: pg
      .uuid("id")
      .notNull()
      .primaryKey()
      .$defaultFn(() => generateId()),
    name: pg.text("name"),
    aaguid: pg.text("aaguid"),
    publicKey: pg.text("public_key").notNull(),
    credentialID: pg.text("credential_id").notNull(),
    counter: pg.integer("counter").notNull(),
    deviceType: pg.text("device_type").notNull(),
    backedUp: pg.boolean("backed_up").notNull().default(false),
    transports: pg.text("transports").notNull(),
    userId: pg
      .uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: pg.timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: pg
      .timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date()),
  },
  (t) => [pg.index().on(t.userId)],
);

export const resume = pg.pgTable(
  "resume",
  {
    id: pg
      .uuid("id")
      .notNull()
      .primaryKey()
      .$defaultFn(() => generateId()),
    name: pg.text("name").notNull(),
    slug: pg.text("slug").notNull(),
    tags: pg.text("tags").array().notNull().default([]),
    isPublic: pg.boolean("is_public").notNull().default(false),
    isLocked: pg.boolean("is_locked").notNull().default(false),
    password: pg.text("password"),
    data: pg
      .jsonb("data")
      .notNull()
      .$type<ResumeData>()
      .$defaultFn(() => defaultResumeData),
    userId: pg
      .uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: pg.timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: pg
      .timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date()),
  },
  (t) => [
    pg.unique().on(t.slug, t.userId),
    pg.index().on(t.userId),
    pg.index().on(t.createdAt.asc()),
    pg.index().on(t.userId, t.updatedAt.desc()),
    pg.index().on(t.isPublic, t.slug, t.userId),
  ],
);

export const resumeStatistics = pg.pgTable("resume_statistics", {
  id: pg
    .uuid("id")
    .notNull()
    .primaryKey()
    .$defaultFn(() => generateId()),
  views: pg.integer("views").notNull().default(0),
  downloads: pg.integer("downloads").notNull().default(0),
  lastViewedAt: pg.timestamp("last_viewed_at", { withTimezone: true }),
  lastDownloadedAt: pg.timestamp("last_downloaded_at", { withTimezone: true }),
  resumeId: pg
    .uuid("resume_id")
    .unique()
    .notNull()
    .references(() => resume.id, { onDelete: "cascade" }),
  createdAt: pg.timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: pg
    .timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date()),
});

export const apikey = pg.pgTable(
  "apikey",
  {
    id: pg
      .uuid("id")
      .notNull()
      .primaryKey()
      .$defaultFn(() => generateId()),
    name: pg.text("name"),
    start: pg.text("start"),
    prefix: pg.text("prefix"),
    key: pg.text("key").notNull(),
    configId: pg.text("config_id").notNull().default("default"),
    referenceId: pg
      .uuid("reference_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    refillInterval: pg.integer("refill_interval"),
    refillAmount: pg.integer("refill_amount"),
    lastRefillAt: pg.timestamp("last_refill_at", { withTimezone: true }),
    enabled: pg.boolean("enabled").notNull().default(true),
    rateLimitEnabled: pg.boolean("rate_limit_enabled").notNull().default(false),
    rateLimitTimeWindow: pg.integer("rate_limit_time_window").default(86400000),
    rateLimitMax: pg.integer("rate_limit_max").default(10),
    requestCount: pg.integer("request_count").notNull().default(0),
    remaining: pg.integer("remaining"),
    lastRequest: pg.timestamp("last_request", { withTimezone: true }),
    expiresAt: pg.timestamp("expires_at", { withTimezone: true }),
    createdAt: pg.timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: pg
      .timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date()),
    permissions: pg.text("permissions"),
    metadata: pg.jsonb("metadata"),
  },
  (t) => [
    pg.index().on(t.referenceId),
    pg.index().on(t.key),
    pg.index().on(t.configId),
    pg.index().on(t.enabled, t.referenceId),
  ],
);

export const jwks = pg.pgTable("jwks", {
  id: pg
    .uuid("id")
    .notNull()
    .primaryKey()
    .$defaultFn(() => generateId()),
  publicKey: pg.text("public_key").notNull(),
  privateKey: pg.text("private_key").notNull(),
  createdAt: pg.timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: pg.timestamp("expires_at", { withTimezone: true }),
});

export const oauthClient = pg.pgTable(
  "oauth_client",
  {
    id: pg
      .uuid("id")
      .notNull()
      .primaryKey()
      .$defaultFn(() => generateId()),
    clientId: pg.text("client_id").notNull().unique(),
    clientSecret: pg.text("client_secret"),
    disabled: pg.boolean("disabled").default(false),
    skipConsent: pg.boolean("skip_consent"),
    enableEndSession: pg.boolean("enable_end_session"),
    subjectType: pg.text("subject_type"),
    scopes: pg.text("scopes").array(),
    userId: pg.uuid("user_id").references(() => user.id, { onDelete: "cascade" }),
    createdAt: pg.timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: pg
      .timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date()),
    name: pg.text("name"),
    uri: pg.text("uri"),
    icon: pg.text("icon"),
    contacts: pg.text("contacts").array(),
    tos: pg.text("tos"),
    policy: pg.text("policy"),
    softwareId: pg.text("software_id"),
    softwareVersion: pg.text("software_version"),
    softwareStatement: pg.text("software_statement"),
    redirectUris: pg.text("redirect_uris").array().notNull(),
    postLogoutRedirectUris: pg.text("post_logout_redirect_uris").array(),
    tokenEndpointAuthMethod: pg.text("token_endpoint_auth_method"),
    grantTypes: pg.text("grant_types").array(),
    responseTypes: pg.text("response_types").array(),
    public: pg.boolean("public"),
    type: pg.text("type"),
    requirePKCE: pg.boolean("require_pkce"),
    referenceId: pg.text("reference_id"),
    metadata: pg.jsonb("metadata"),
  },
  (t) => [pg.index().on(t.clientId)],
);

export const oauthRefreshToken = pg.pgTable(
  "oauth_refresh_token",
  {
    id: pg
      .uuid("id")
      .notNull()
      .primaryKey()
      .$defaultFn(() => generateId()),
    token: pg.text("token").notNull(),
    clientId: pg.text("client_id").notNull(),
    sessionId: pg.uuid("session_id").references(() => session.id, { onDelete: "set null" }),
    userId: pg
      .uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    referenceId: pg.text("reference_id"),
    expiresAt: pg.timestamp("expires_at", { withTimezone: true }),
    createdAt: pg.timestamp("created_at", { withTimezone: true }).defaultNow(),
    revoked: pg.timestamp("revoked", { withTimezone: true }),
    authTime: pg.timestamp("auth_time", { withTimezone: true }),
    scopes: pg.text("scopes").array().notNull(),
  },
  (t) => [pg.index().on(t.token)],
);

export const oauthAccessToken = pg.pgTable(
  "oauth_access_token",
  {
    id: pg
      .uuid("id")
      .notNull()
      .primaryKey()
      .$defaultFn(() => generateId()),
    token: pg.text("token").notNull().unique(),
    clientId: pg.text("client_id").notNull(),
    sessionId: pg.uuid("session_id").references(() => session.id, { onDelete: "set null" }),
    userId: pg.uuid("user_id").references(() => user.id, { onDelete: "cascade" }),
    referenceId: pg.text("reference_id"),
    refreshId: pg.uuid("refresh_id").references(() => oauthRefreshToken.id),
    expiresAt: pg.timestamp("expires_at", { withTimezone: true }),
    createdAt: pg.timestamp("created_at", { withTimezone: true }).defaultNow(),
    scopes: pg.text("scopes").array().notNull(),
  },
  (t) => [pg.index().on(t.token)],
);

export const oauthConsent = pg.pgTable(
  "oauth_consent",
  {
    id: pg
      .uuid("id")
      .notNull()
      .primaryKey()
      .$defaultFn(() => generateId()),
    clientId: pg.text("client_id").notNull(),
    userId: pg.uuid("user_id").references(() => user.id, { onDelete: "cascade" }),
    referenceId: pg.text("reference_id"),
    scopes: pg.text("scopes").array().notNull(),
    createdAt: pg.timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: pg
      .timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date()),
  },
  (t) => [pg.index().on(t.userId, t.clientId)],
);

export const relations = defineRelations(
  {
    user,
    session,
    account,
    verification,
    twoFactor,
    passkey,
    resume,
    resumeStatistics,
    apikey,
    jwks,
    oauthClient,
    oauthRefreshToken,
    oauthAccessToken,
    oauthConsent,
  },
  (r) => ({
    user: {
      sessions: r.many.session(),
      accounts: r.many.account(),
      twoFactors: r.many.twoFactor(),
      passkeys: r.many.passkey(),
      resumes: r.many.resume(),
      apiKeys: r.many.apikey(),
      oauthClients: r.many.oauthClient(),
      oauthRefreshTokens: r.many.oauthRefreshToken(),
      oauthAccessTokens: r.many.oauthAccessToken(),
      oauthConsents: r.many.oauthConsent(),
    },
    session: {
      user: r.one.user({
        from: r.session.userId,
        to: r.user.id,
      }),
    },
    account: {
      user: r.one.user({
        from: r.account.userId,
        to: r.user.id,
      }),
    },
    twoFactor: {
      user: r.one.user({
        from: r.twoFactor.userId,
        to: r.user.id,
      }),
    },
    passkey: {
      user: r.one.user({
        from: r.passkey.userId,
        to: r.user.id,
      }),
    },
    resume: {
      user: r.one.user({
        from: r.resume.userId,
        to: r.user.id,
      }),
      statistics: r.one.resumeStatistics({
        from: r.resume.id,
        to: r.resumeStatistics.resumeId,
      }),
    },
    resumeStatistics: {
      resume: r.one.resume({
        from: r.resumeStatistics.resumeId,
        to: r.resume.id,
      }),
    },
    apikey: {
      user: r.one.user({
        from: r.apikey.referenceId,
        to: r.user.id,
      }),
    },
    oauthClient: {
      user: r.one.user({
        from: r.oauthClient.userId,
        to: r.user.id,
      }),
    },
    oauthRefreshToken: {
      user: r.one.user({
        from: r.oauthRefreshToken.userId,
        to: r.user.id,
      }),
      session: r.one.session({
        from: r.oauthRefreshToken.sessionId,
        to: r.session.id,
      }),
    },
    oauthAccessToken: {
      user: r.one.user({
        from: r.oauthAccessToken.userId,
        to: r.user.id,
      }),
      session: r.one.session({
        from: r.oauthAccessToken.sessionId,
        to: r.session.id,
      }),
      refreshToken: r.one.oauthRefreshToken({
        from: r.oauthAccessToken.refreshId,
        to: r.oauthRefreshToken.id,
      }),
    },
    oauthConsent: {
      user: r.one.user({
        from: r.oauthConsent.userId,
        to: r.user.id,
      }),
    },
  }),
);
