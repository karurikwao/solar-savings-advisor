import crypto from "node:crypto";
import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const { Pool } = pg;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, "dist");
const port = Number.parseInt(process.env.PORT || "80", 10);
const databaseUrl = process.env.DATABASE_URL || "";
const adminToken = process.env.ADMIN_TOKEN || "";
const configuredAdminEmail = process.env.ADMIN_EMAIL || "";
const configuredAdminPassword = process.env.ADMIN_INITIAL_PASSWORD || process.env.ADMIN_PASSWORD || "";
const resendApiKey = process.env.RESEND_API_KEY || "";
const resendFromEmail = process.env.RESEND_FROM_EMAIL || "Solar Savings Advisor <onboarding@resend.dev>";
const appBaseUrl = (process.env.APP_BASE_URL || "").replace(/\/+$/, "");
const sessionCookieName = "ssa_admin_session";
const sessionTtlMs = Number.parseInt(process.env.ADMIN_SESSION_TTL_HOURS || "168", 10) * 60 * 60 * 1000;
const passwordResetTtlMs = Number.parseInt(process.env.ADMIN_PASSWORD_RESET_MINUTES || "60", 10) * 60 * 1000;
const migrationLockName = "solar_savings_advisor_migrations";

const pool = databaseUrl
  ? new Pool({
      connectionString: databaseUrl,
      ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined,
      max: Number.parseInt(process.env.DATABASE_POOL_SIZE || "5", 10),
    })
  : null;

const submissionCategories = new Set([
  "quote_follow_up",
  "contact",
  "solar_report",
  "calculator",
  "profile",
  "other",
]);

const statuses = new Set(["new", "reviewing", "contacted", "qualified", "closed", "spam"]);

const defaultAdPlacements = [
  ["home-hero", "Homepage hero CTA", "homepage.hero"],
  ["homepage-inline", "Homepage inline CTA", "homepage.inline"],
  ["homepage-promo", "Homepage bottom promo panel", "homepage.bottom"],
  ["tools-index-hero", "Tools index hero", "tools.index.hero"],
  ["calculator-results", "Calculator results CTA", "tools.detail.results"],
  ["tools-detail-sidebar", "Tool detail sidebar", "tools.detail.sidebar"],
  ["questions-index-hero", "Questions index hero", "questions.index.hero"],
  ["question-inline", "Question detail inline CTA", "questions.detail.inline"],
  ["question-sidebar", "Question detail sidebar", "questions.detail.sidebar"],
  ["question-bottom", "Question detail bottom CTA", "questions.detail.bottom"],
  ["compare-index-hero", "Comparison index hero", "compare.index.hero"],
  ["comparison-affiliate", "Comparison detail sidebar card", "compare.detail.sidebar"],
  ["compare-table", "Comparison table affiliate buttons", "compare.detail.table"],
  ["compare-bottom", "Comparison detail bottom CTA", "compare.detail.bottom"],
  ["guides-index-hero", "Guides index hero", "guides.index.hero"],
  ["guide-banner", "Guide detail inline banner", "guides.detail.inline"],
  ["guide-bottom", "Guide detail bottom CTA", "guides.detail.bottom"],
  ["providers-index-hero", "Providers index hero", "providers.index.hero"],
  ["installer-quote", "Provider detail quote buttons", "providers.detail.card"],
  ["providers-detail-bottom", "Provider detail bottom CTA", "providers.detail.bottom"],
  ["report-hero", "Report page hero CTA", "report.hero"],
  ["report-results", "Report results CTA", "report.results"],
  ["bottom-lead", "Bottom lead form CTA", "global.bottom"],
  ["global-footer", "Global footer CTA", "global.footer"],
  ["partner-card", "Partner cards", "global.partners"],
];

const mimeTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".csv", "text/csv; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".ico", "image/x-icon"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".map", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".txt", "text/plain; charset=utf-8"],
  [".webp", "image/webp"],
  [".xml", "application/xml; charset=utf-8"],
]);

function sendJson(res, status, payload, headers = {}) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    ...headers,
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
  });
  res.end(body);
}

function sendText(res, status, body, contentType = "text/plain; charset=utf-8", headers = {}) {
  res.writeHead(status, {
    ...headers,
    "Content-Type": contentType,
    "Content-Length": Buffer.byteLength(body),
  });
  res.end(body);
}

function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  const value = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  return (value || req.socket.remoteAddress || "").split(",")[0].trim();
}

function hashValue(value) {
  if (!value) return "";
  return crypto.createHash("sha256").update(value).digest("hex");
}

function safeString(value, maxLength = 500) {
  if (value === undefined || value === null) return "";
  return String(value).trim().slice(0, maxLength);
}

function normalizeEmail(value) {
  return safeString(value, 320).toLowerCase();
}

function safeObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return JSON.parse(JSON.stringify(value));
}

function parseCookies(req) {
  const header = req.headers.cookie || "";
  return Object.fromEntries(
    header
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const index = part.indexOf("=");
        if (index === -1) return [part, ""];
        return [decodeURIComponent(part.slice(0, index)), decodeURIComponent(part.slice(index + 1))];
      })
  );
}

function buildCookie(name, value, options = {}) {
  const parts = [`${encodeURIComponent(name)}=${encodeURIComponent(value)}`, "Path=/", "HttpOnly", "SameSite=Lax"];
  if (options.maxAge !== undefined) parts.push(`Max-Age=${options.maxAge}`);
  if (options.expires) parts.push(`Expires=${options.expires.toUTCString()}`);
  if (process.env.COOKIE_SECURE === "true") parts.push("Secure");
  return parts.join("; ");
}

function getRequestOrigin(req) {
  if (appBaseUrl) return appBaseUrl;
  const proto = safeString(req.headers["x-forwarded-proto"] || "http", 20).split(",")[0] || "http";
  const host = safeString(req.headers["x-forwarded-host"] || req.headers.host || "localhost", 200).split(",")[0];
  return `${proto}://${host}`.replace(/\/+$/, "");
}

function publicAdminUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    name: row.name || row.email,
    role: row.role || "admin",
    lastLoginAt: row.last_login_at || null,
  };
}

async function scrypt(password, salt) {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 64, { N: 16384, r: 8, p: 1 }, (error, key) => {
      if (error) reject(error);
      else resolve(key);
    });
  });
}

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const key = await scrypt(password, salt);
  return `scrypt:${salt}:${key.toString("hex")}`;
}

async function verifyPassword(password, storedHash) {
  const [scheme, salt, keyHex] = safeString(storedHash, 500).split(":");
  if (scheme !== "scrypt" || !salt || !keyHex) return false;
  const expected = Buffer.from(keyHex, "hex");
  const actual = await scrypt(password, salt);
  if (actual.length !== expected.length) return false;
  return crypto.timingSafeEqual(actual, expected);
}

function normalizeCategory(value) {
  const normalized = safeString(value, 80).toLowerCase().replaceAll("-", "_");
  return submissionCategories.has(normalized) ? normalized : "other";
}

function normalizeStatus(value) {
  const normalized = safeString(value, 40).toLowerCase();
  return statuses.has(normalized) ? normalized : "new";
}

async function readJsonBody(req, maxBytes = 150_000) {
  const chunks = [];
  let length = 0;

  for await (const chunk of req) {
    length += chunk.length;
    if (length > maxBytes) {
      throw new Error("Request body is too large");
    }
    chunks.push(chunk);
  }

  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

async function seedAdminUser(client) {
  const email = normalizeEmail(configuredAdminEmail);
  if (!email) return;

  const existing = await client.query("SELECT id, password_hash FROM admin_users WHERE email = $1", [email]);
  if (!existing.rows.length) {
    const passwordHash = configuredAdminPassword ? await hashPassword(configuredAdminPassword) : null;
    await client.query(
      `
        INSERT INTO admin_users (id, email, name, password_hash)
        VALUES ($1, $2, $3, $4)
      `,
      [crypto.randomUUID(), email, "Solar Savings Admin", passwordHash]
    );
    return;
  }

  if (configuredAdminPassword && !existing.rows[0].password_hash) {
    await client.query(
      `
        UPDATE admin_users
        SET password_hash = $1, updated_at = now()
        WHERE id = $2
      `,
      [await hashPassword(configuredAdminPassword), existing.rows[0].id]
    );
  }
}

async function seedAdPlacements(client) {
  for (const [placementId, label, templateArea] of defaultAdPlacements) {
    await client.query(
      `
        INSERT INTO ad_placements (placement_id, label, template_area)
        VALUES ($1, $2, $3)
        ON CONFLICT (placement_id) DO UPDATE
        SET label = COALESCE(NULLIF(ad_placements.label, ''), EXCLUDED.label),
            template_area = COALESCE(NULLIF(ad_placements.template_area, ''), EXCLUDED.template_area)
      `,
      [placementId, label, templateArea]
    );
  }
}

async function migrate() {
  if (!pool) {
    console.warn("DATABASE_URL is not configured; submission APIs will report database_unconfigured.");
    return;
  }

  const client = await pool.connect();
  try {
    await client.query("SELECT pg_advisory_lock(hashtext($1))", [migrationLockName]);
    await client.query(`
      CREATE TABLE IF NOT EXISTS app_submissions (
        id text PRIMARY KEY,
        category text NOT NULL,
        status text NOT NULL DEFAULT 'new',
        contact_name text,
        contact_email text,
        contact_phone text,
        zip text,
        interest text,
        page_slug text,
        placement_id text,
        source text,
        offer_id text,
        partner_id text,
        payload jsonb NOT NULL DEFAULT '{}'::jsonb,
        result_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
        user_agent text,
        ip_hash text,
        admin_notes text NOT NULL DEFAULT '',
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await client.query("CREATE INDEX IF NOT EXISTS app_submissions_category_created_idx ON app_submissions (category, created_at DESC)");
    await client.query("CREATE INDEX IF NOT EXISTS app_submissions_status_created_idx ON app_submissions (status, created_at DESC)");
    await client.query("CREATE INDEX IF NOT EXISTS app_submissions_email_idx ON app_submissions (contact_email)");
    await client.query(`
      CREATE TABLE IF NOT EXISTS admin_users (
        id text PRIMARY KEY,
        email text NOT NULL UNIQUE,
        name text NOT NULL DEFAULT '',
        password_hash text,
        role text NOT NULL DEFAULT 'admin',
        status text NOT NULL DEFAULT 'active',
        last_login_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS admin_sessions (
        id text PRIMARY KEY,
        user_id text NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
        token_hash text NOT NULL UNIQUE,
        expires_at timestamptz NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        last_seen_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await client.query("CREATE INDEX IF NOT EXISTS admin_sessions_user_idx ON admin_sessions (user_id)");
    await client.query("CREATE INDEX IF NOT EXISTS admin_sessions_expires_idx ON admin_sessions (expires_at)");
    await client.query(`
      CREATE TABLE IF NOT EXISTS admin_password_resets (
        id text PRIMARY KEY,
        user_id text NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
        token_hash text NOT NULL UNIQUE,
        expires_at timestamptz NOT NULL,
        used_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await client.query("CREATE INDEX IF NOT EXISTS admin_password_resets_user_idx ON admin_password_resets (user_id)");
    await client.query(`
      CREATE TABLE IF NOT EXISTS ad_placements (
        placement_id text PRIMARY KEY,
        label text NOT NULL DEFAULT '',
        template_area text NOT NULL DEFAULT '',
        enabled boolean NOT NULL DEFAULT false,
        snippet text NOT NULL DEFAULT '',
        notes text NOT NULL DEFAULT '',
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await seedAdminUser(client);
    await seedAdPlacements(client);
  } finally {
    await client.query("SELECT pg_advisory_unlock(hashtext($1))", [migrationLockName]).catch(() => {});
    client.release();
  }
}

function submissionRecordFromBody(body, req) {
  const fields = safeObject(body.fields);
  const contact = safeObject(body.contact);
  const profile = safeObject(body.profile);
  const metadata = safeObject(body.metadata);
  const resultSummary = safeObject(body.resultSummary || body.result || {});
  const category = normalizeCategory(body.category || body.type || metadata.category);
  const sourcePayload = { ...body, receivedAt: new Date().toISOString() };
  delete sourcePayload.adminToken;

  return {
    id: crypto.randomUUID(),
    category,
    status: "new",
    contactName: safeString(contact.name || fields.name || body.name, 200),
    contactEmail: safeString(contact.email || fields.email || body.email, 320).toLowerCase(),
    contactPhone: safeString(contact.phone || fields.phone || body.phone, 80),
    zip: safeString(contact.zip || fields.zip || profile.zip || body.zip, 40),
    interest: safeString(fields.interest || body.interest || metadata.interest, 120),
    pageSlug: safeString(body.pageSlug || fields.pageSlug || metadata.pageSlug, 250),
    placementId: safeString(body.placementId || fields.placementId || metadata.placementId, 120),
    source: safeString(body.source || fields.source || metadata.source, 120),
    offerId: safeString(body.offerId || fields.offerId || metadata.offerId, 120),
    partnerId: safeString(body.partnerId || fields.partnerId || metadata.partnerId, 120),
    payload: sourcePayload,
    resultSummary,
    userAgent: safeString(req.headers["user-agent"], 500),
    ipHash: hashValue(getClientIp(req)),
  };
}

async function insertSubmission(record) {
  if (!pool) {
    throw new Error("database_unconfigured");
  }

  await pool.query(
    `
      INSERT INTO app_submissions (
        id, category, status, contact_name, contact_email, contact_phone, zip, interest,
        page_slug, placement_id, source, offer_id, partner_id, payload, result_summary,
        user_agent, ip_hash
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8,
        $9, $10, $11, $12, $13, $14::jsonb, $15::jsonb,
        $16, $17
      )
    `,
    [
      record.id,
      record.category,
      record.status,
      record.contactName,
      record.contactEmail,
      record.contactPhone,
      record.zip,
      record.interest,
      record.pageSlug,
      record.placementId,
      record.source,
      record.offerId,
      record.partnerId,
      JSON.stringify(record.payload),
      JSON.stringify(record.resultSummary),
      record.userAgent,
      record.ipHash,
    ]
  );
}

async function getAdminFromSession(req) {
  if (!pool) return null;
  const cookies = parseCookies(req);
  const sessionToken = cookies[sessionCookieName];
  if (!sessionToken) return null;
  const tokenHash = hashValue(sessionToken);
  const result = await pool.query(
    `
      SELECT u.*
      FROM admin_sessions s
      JOIN admin_users u ON u.id = s.user_id
      WHERE s.token_hash = $1
        AND s.expires_at > now()
        AND u.status = 'active'
      LIMIT 1
    `,
    [tokenHash]
  );
  const user = result.rows[0];
  if (!user) return null;
  await pool.query("UPDATE admin_sessions SET last_seen_at = now() WHERE token_hash = $1", [tokenHash]);
  return publicAdminUser(user);
}

async function getAdminFromRequest(req, url) {
  const sessionAdmin = await getAdminFromSession(req);
  if (sessionAdmin) return sessionAdmin;

  const header = req.headers.authorization || "";
  const bearer = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  const token = bearer || req.headers["x-admin-token"] || url.searchParams.get("token") || "";
  if (adminToken && token === adminToken) {
    return { id: "legacy-token", email: "token-admin", name: "Token Admin", role: "admin", legacy: true };
  }
  return null;
}

async function requireAdmin(req, url, res) {
  const admin = await getAdminFromRequest(req, url);
  if (!admin) {
    sendJson(res, 401, { error: "admin_auth_required" });
    return null;
  }
  return admin;
}

function rowFromSubmission(row) {
  return {
    id: row.id,
    category: row.category,
    status: row.status,
    contactName: row.contact_name || "",
    contactEmail: row.contact_email || "",
    contactPhone: row.contact_phone || "",
    zip: row.zip || "",
    interest: row.interest || "",
    pageSlug: row.page_slug || "",
    placementId: row.placement_id || "",
    source: row.source || "",
    offerId: row.offer_id || "",
    partnerId: row.partner_id || "",
    payload: row.payload || {},
    resultSummary: row.result_summary || {},
    userAgent: row.user_agent || "",
    adminNotes: row.admin_notes || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function listSubmissions(url) {
  if (!pool) throw new Error("database_unconfigured");

  const category = normalizeCategory(url.searchParams.get("category") || "");
  const status = safeString(url.searchParams.get("status"), 40);
  const hasCategoryFilter = submissionCategories.has(category) && category !== "other";
  const hasStatusFilter = statuses.has(status);
  const limit = Math.min(Math.max(Number.parseInt(url.searchParams.get("limit") || "100", 10), 1), 500);
  const offset = Math.max(Number.parseInt(url.searchParams.get("offset") || "0", 10), 0);
  const where = [];
  const params = [];

  if (hasCategoryFilter) {
    params.push(category);
    where.push(`category = $${params.length}`);
  }

  if (hasStatusFilter) {
    params.push(status);
    where.push(`status = $${params.length}`);
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const rowsQuery = `
    SELECT *
    FROM app_submissions
    ${whereSql}
    ORDER BY created_at DESC
    LIMIT $${params.length + 1}
    OFFSET $${params.length + 2}
  `;

  const [rowsResult, countsResult] = await Promise.all([
    pool.query(rowsQuery, [...params, limit, offset]),
    pool.query(`
      SELECT category, status, count(*)::int AS count
      FROM app_submissions
      GROUP BY category, status
      ORDER BY category, status
    `),
  ]);

  return {
    rows: rowsResult.rows.map(rowFromSubmission),
    counts: countsResult.rows,
    limit,
    offset,
  };
}

function csvEscape(value) {
  const text = typeof value === "object" ? JSON.stringify(value) : String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

function submissionsToCsv(rows) {
  const headers = [
    "createdAt",
    "category",
    "status",
    "contactName",
    "contactEmail",
    "contactPhone",
    "zip",
    "interest",
    "pageSlug",
    "placementId",
    "source",
    "offerId",
    "partnerId",
    "adminNotes",
    "resultSummary",
    "payload",
  ];
  const lines = [headers.join(",")];
  rows.forEach((row) => {
    lines.push(headers.map((header) => csvEscape(row[header])).join(","));
  });
  return lines.join("\n");
}

async function updateSubmission(id, body) {
  if (!pool) throw new Error("database_unconfigured");

  const nextStatus = body.status ? normalizeStatus(body.status) : null;
  const nextCategory = body.category ? normalizeCategory(body.category) : null;
  const nextNotes = body.adminNotes !== undefined ? safeString(body.adminNotes, 5_000) : null;
  const sets = [];
  const params = [];

  if (nextStatus) {
    params.push(nextStatus);
    sets.push(`status = $${params.length}`);
  }
  if (nextCategory) {
    params.push(nextCategory);
    sets.push(`category = $${params.length}`);
  }
  if (nextNotes !== null) {
    params.push(nextNotes);
    sets.push(`admin_notes = $${params.length}`);
  }

  if (!sets.length) return null;

  params.push(id);
  const result = await pool.query(
    `
      UPDATE app_submissions
      SET ${sets.join(", ")}, updated_at = now()
      WHERE id = $${params.length}
      RETURNING *
    `,
    params
  );
  return result.rows[0] ? rowFromSubmission(result.rows[0]) : null;
}

async function createAdminSession(userId) {
  if (!pool) throw new Error("database_unconfigured");
  const token = crypto.randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + sessionTtlMs);
  await pool.query(
    `
      INSERT INTO admin_sessions (id, user_id, token_hash, expires_at)
      VALUES ($1, $2, $3, $4)
    `,
    [crypto.randomUUID(), userId, hashValue(token), expiresAt]
  );
  return {
    token,
    cookie: buildCookie(sessionCookieName, token, { maxAge: Math.floor(sessionTtlMs / 1000) }),
  };
}

async function loginAdmin(body) {
  if (!pool) throw new Error("database_unconfigured");
  const email = normalizeEmail(body.email);
  const password = safeString(body.password, 1_000);
  if (!email || !password) return null;

  const result = await pool.query("SELECT * FROM admin_users WHERE email = $1 AND status = 'active' LIMIT 1", [email]);
  const user = result.rows[0];
  if (!user?.password_hash || !(await verifyPassword(password, user.password_hash))) return null;

  await pool.query("DELETE FROM admin_sessions WHERE expires_at <= now()");
  await pool.query("UPDATE admin_users SET last_login_at = now(), updated_at = now() WHERE id = $1", [user.id]);
  const session = await createAdminSession(user.id);
  return { user: publicAdminUser({ ...user, last_login_at: new Date().toISOString() }), session };
}

async function logoutAdmin(req) {
  if (!pool) return;
  const sessionToken = parseCookies(req)[sessionCookieName];
  if (!sessionToken) return;
  await pool.query("DELETE FROM admin_sessions WHERE token_hash = $1", [hashValue(sessionToken)]);
}

async function sendPasswordResetEmail(email, resetUrl) {
  if (!resendApiKey) {
    console.warn("RESEND_API_KEY is not configured; password reset email was not sent.");
    return false;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: resendFromEmail,
      to: [email],
      subject: "Reset your Solar Savings Advisor admin password",
      text: `Use this link to reset your Solar Savings Advisor admin password: ${resetUrl}`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.5;">
          <h1 style="font-size: 20px;">Reset your admin password</h1>
          <p>Use the button below to set a new Solar Savings Advisor admin password.</p>
          <p><a href="${resetUrl}" style="background:#0F172A;color:#ffffff;display:inline-block;padding:12px 18px;border-radius:8px;text-decoration:none;">Reset password</a></p>
          <p style="color:#667085;font-size:13px;">This link expires in ${Math.round(passwordResetTtlMs / 60000)} minutes.</p>
        </div>
      `,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`resend_${response.status}:${body.slice(0, 200)}`);
  }

  return true;
}

async function requestPasswordReset(body, req) {
  if (!pool) throw new Error("database_unconfigured");
  const email = normalizeEmail(body.email);
  if (!email) return { ok: true };

  const result = await pool.query("SELECT id, email FROM admin_users WHERE email = $1 AND status = 'active' LIMIT 1", [email]);
  const user = result.rows[0];
  if (!user) return { ok: true };

  const token = crypto.randomBytes(32).toString("base64url");
  const resetUrl = `${getRequestOrigin(req)}/admin/leads/?reset=${encodeURIComponent(token)}`;
  await pool.query(
    `
      INSERT INTO admin_password_resets (id, user_id, token_hash, expires_at)
      VALUES ($1, $2, $3, $4)
    `,
    [crypto.randomUUID(), user.id, hashValue(token), new Date(Date.now() + passwordResetTtlMs)]
  );

  try {
    await sendPasswordResetEmail(user.email, resetUrl);
  } catch (error) {
    console.error(`Password reset email failed: ${error.message}`);
  }

  return { ok: true };
}

async function resetAdminPassword(body) {
  if (!pool) throw new Error("database_unconfigured");
  const token = safeString(body.token, 500);
  const password = safeString(body.password, 1_000);
  if (password.length < 10) throw new Error("password_too_short");

  const result = await pool.query(
    `
      SELECT r.id AS reset_id, u.*
      FROM admin_password_resets r
      JOIN admin_users u ON u.id = r.user_id
      WHERE r.token_hash = $1
        AND r.expires_at > now()
        AND r.used_at IS NULL
        AND u.status = 'active'
      LIMIT 1
    `,
    [hashValue(token)]
  );
  const row = result.rows[0];
  if (!row) return null;

  await pool.query("UPDATE admin_users SET password_hash = $1, updated_at = now() WHERE id = $2", [
    await hashPassword(password),
    row.id,
  ]);
  await pool.query("UPDATE admin_password_resets SET used_at = now() WHERE id = $1", [row.reset_id]);
  await pool.query("DELETE FROM admin_sessions WHERE user_id = $1", [row.id]);
  const session = await createAdminSession(row.id);
  return { user: publicAdminUser(row), session };
}

function normalizePlacementId(value) {
  const normalized = safeString(value, 120).toLowerCase();
  return normalized.replace(/[^a-z0-9_-]/g, "");
}

function rowFromAdPlacement(row) {
  return {
    placementId: row.placement_id,
    label: row.label || row.placement_id,
    templateArea: row.template_area || "",
    enabled: Boolean(row.enabled),
    snippet: row.snippet || "",
    notes: row.notes || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function listAdPlacements() {
  if (!pool) throw new Error("database_unconfigured");
  const result = await pool.query("SELECT * FROM ad_placements ORDER BY template_area, placement_id");
  return result.rows.map(rowFromAdPlacement);
}

async function updateAdPlacement(placementId, body) {
  if (!pool) throw new Error("database_unconfigured");
  const id = normalizePlacementId(placementId);
  if (!id) throw new Error("invalid_placement");
  const label = safeString(body.label, 180) || id;
  const templateArea = safeString(body.templateArea, 180);
  const snippet = safeString(body.snippet, 100_000);
  const notes = safeString(body.notes, 5_000);
  const enabled = Boolean(body.enabled);

  const result = await pool.query(
    `
      INSERT INTO ad_placements (placement_id, label, template_area, enabled, snippet, notes)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (placement_id) DO UPDATE
      SET label = EXCLUDED.label,
          template_area = EXCLUDED.template_area,
          enabled = EXCLUDED.enabled,
          snippet = EXCLUDED.snippet,
          notes = EXCLUDED.notes,
          updated_at = now()
      RETURNING *
    `,
    [id, label, templateArea, enabled, snippet, notes]
  );
  return rowFromAdPlacement(result.rows[0]);
}

async function getPublicAdPlacement(placementId) {
  if (!pool) return null;
  const id = normalizePlacementId(placementId);
  if (!id) return null;
  const result = await pool.query(
    "SELECT placement_id, enabled, snippet, updated_at FROM ad_placements WHERE placement_id = $1 LIMIT 1",
    [id]
  );
  const row = result.rows[0];
  if (!row?.enabled || !row.snippet) return null;
  return {
    placementId: row.placement_id,
    enabled: true,
    snippet: row.snippet,
    updatedAt: row.updated_at,
  };
}

async function handleApi(req, res, url) {
  if (req.method === "GET" && url.pathname === "/api/health") {
    if (!pool) {
      sendJson(res, 200, { ok: true, database: "unconfigured" });
      return true;
    }
    try {
      await pool.query("SELECT 1");
      sendJson(res, 200, { ok: true, database: "connected" });
    } catch (error) {
      sendJson(res, 503, { ok: false, database: "error", message: error.message });
    }
    return true;
  }

  if (req.method === "POST" && url.pathname === "/api/submissions") {
    try {
      const body = await readJsonBody(req);
      const record = submissionRecordFromBody(body, req);
      await insertSubmission(record);
      sendJson(res, 201, { ok: true, id: record.id, category: record.category });
    } catch (error) {
      const isDatabaseMissing = error.message === "database_unconfigured";
      sendJson(res, isDatabaseMissing ? 503 : 400, {
        ok: false,
        error: isDatabaseMissing ? "database_unconfigured" : "submission_failed",
        message: isDatabaseMissing ? "Database is not configured for submissions." : error.message,
      });
    }
    return true;
  }

  const publicAdMatch = url.pathname.match(/^\/api\/ads\/([^/]+)$/);
  if (publicAdMatch && req.method === "GET") {
    try {
      const placement = await getPublicAdPlacement(publicAdMatch[1]);
      sendJson(
        res,
        200,
        placement || { enabled: false },
        { "Cache-Control": "no-store" }
      );
    } catch (error) {
      sendJson(res, 200, { enabled: false });
    }
    return true;
  }

  if (url.pathname === "/api/admin/auth/session" && req.method === "GET") {
    const admin = await getAdminFromRequest(req, url);
    if (!admin) sendJson(res, 401, { error: "admin_auth_required" });
    else sendJson(res, 200, { ok: true, user: admin });
    return true;
  }

  if (url.pathname === "/api/admin/auth/login" && req.method === "POST") {
    try {
      const result = await loginAdmin(await readJsonBody(req));
      if (!result) {
        sendJson(res, 401, { error: "invalid_credentials" });
        return true;
      }
      sendJson(res, 200, { ok: true, user: result.user }, { "Set-Cookie": result.session.cookie });
    } catch (error) {
      sendJson(res, 503, { error: error.message });
    }
    return true;
  }

  if (url.pathname === "/api/admin/auth/logout" && req.method === "POST") {
    await logoutAdmin(req).catch(() => {});
    sendJson(
      res,
      200,
      { ok: true },
      { "Set-Cookie": buildCookie(sessionCookieName, "", { maxAge: 0, expires: new Date(0) }) }
    );
    return true;
  }

  if (url.pathname === "/api/admin/auth/request-reset" && req.method === "POST") {
    try {
      await requestPasswordReset(await readJsonBody(req), req);
      sendJson(res, 200, { ok: true });
    } catch (error) {
      sendJson(res, 503, { error: error.message });
    }
    return true;
  }

  if (url.pathname === "/api/admin/auth/reset-password" && req.method === "POST") {
    try {
      const result = await resetAdminPassword(await readJsonBody(req));
      if (!result) {
        sendJson(res, 400, { error: "invalid_or_expired_reset" });
        return true;
      }
      sendJson(res, 200, { ok: true, user: result.user }, { "Set-Cookie": result.session.cookie });
    } catch (error) {
      const status = error.message === "password_too_short" ? 400 : 503;
      sendJson(res, status, { error: error.message });
    }
    return true;
  }

  if (url.pathname === "/api/admin/submissions" && req.method === "GET") {
    if (!(await requireAdmin(req, url, res))) return true;
    try {
      sendJson(res, 200, await listSubmissions(url));
    } catch (error) {
      sendJson(res, 503, { error: error.message });
    }
    return true;
  }

  if (url.pathname === "/api/admin/submissions.csv" && req.method === "GET") {
    if (!(await requireAdmin(req, url, res))) return true;
    try {
      const csvUrl = new URL(url.href);
      csvUrl.searchParams.set("limit", "500");
      const submissions = await listSubmissions(csvUrl);
      sendText(res, 200, submissionsToCsv(submissions.rows), "text/csv; charset=utf-8");
    } catch (error) {
      sendJson(res, 503, { error: error.message });
    }
    return true;
  }

  const updateMatch = url.pathname.match(/^\/api\/admin\/submissions\/([^/]+)$/);
  if (updateMatch && req.method === "PATCH") {
    if (!(await requireAdmin(req, url, res))) return true;
    try {
      const body = await readJsonBody(req);
      const row = await updateSubmission(updateMatch[1], body);
      if (!row) sendJson(res, 404, { error: "not_found" });
      else sendJson(res, 200, { ok: true, row });
    } catch (error) {
      sendJson(res, 503, { error: error.message });
    }
    return true;
  }

  if (url.pathname === "/api/admin/ad-placements" && req.method === "GET") {
    if (!(await requireAdmin(req, url, res))) return true;
    try {
      sendJson(res, 200, { rows: await listAdPlacements() });
    } catch (error) {
      sendJson(res, 503, { error: error.message });
    }
    return true;
  }

  const adPlacementMatch = url.pathname.match(/^\/api\/admin\/ad-placements\/([^/]+)$/);
  if (adPlacementMatch && (req.method === "PUT" || req.method === "PATCH")) {
    if (!(await requireAdmin(req, url, res))) return true;
    try {
      const row = await updateAdPlacement(adPlacementMatch[1], await readJsonBody(req));
      sendJson(res, 200, { ok: true, row });
    } catch (error) {
      sendJson(res, 503, { error: error.message });
    }
    return true;
  }

  return false;
}

async function resolveStaticFile(pathname) {
  const decoded = decodeURIComponent(pathname);
  const normalized = path.normalize(decoded).replace(/^(\.\.[/\\])+/, "");
  const withoutLeadingSlash = normalized.replace(/^[/\\]+/, "");
  const candidates = [];

  if (decoded.endsWith("/")) {
    candidates.push(path.join(distDir, withoutLeadingSlash, "index.html"));
  } else {
    candidates.push(path.join(distDir, withoutLeadingSlash));
    candidates.push(path.join(distDir, withoutLeadingSlash, "index.html"));
    candidates.push(path.join(distDir, `${withoutLeadingSlash}.html`));
  }

  for (const candidate of candidates) {
    const resolved = path.resolve(candidate);
    if (!resolved.startsWith(path.resolve(distDir))) continue;
    try {
      const stat = await fs.stat(resolved);
      if (stat.isFile()) return resolved;
    } catch {
      // Try the next candidate.
    }
  }

  return null;
}

async function serveStatic(req, res, url) {
  const file = await resolveStaticFile(url.pathname);
  if (!file) {
    sendText(res, 404, "Not found");
    return;
  }

  const body = await fs.readFile(file);
  const ext = path.extname(file).toLowerCase();
  res.writeHead(200, {
    "Content-Type": mimeTypes.get(ext) || "application/octet-stream",
    "Content-Length": body.length,
  });
  res.end(body);
}

await migrate();

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
    if (url.pathname.startsWith("/api/") && (await handleApi(req, res, url))) return;
    await serveStatic(req, res, url);
  } catch (error) {
    sendJson(res, 500, { error: "server_error", message: error.message });
  }
});

server.listen(port, "0.0.0.0", () => {
  console.log(`Solar Savings Advisor server listening on ${port}`);
});
