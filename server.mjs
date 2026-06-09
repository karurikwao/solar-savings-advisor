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

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
  });
  res.end(body);
}

function sendText(res, status, body, contentType = "text/plain; charset=utf-8") {
  res.writeHead(status, {
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

function safeObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return JSON.parse(JSON.stringify(value));
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

function requireAdmin(req, url, res) {
  if (!adminToken) {
    sendJson(res, 503, { error: "admin_token_unconfigured" });
    return false;
  }

  const header = req.headers.authorization || "";
  const bearer = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  const token = bearer || req.headers["x-admin-token"] || url.searchParams.get("token") || "";

  if (token !== adminToken) {
    sendJson(res, 401, { error: "admin_auth_required" });
    return false;
  }

  return true;
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

  if (url.pathname === "/api/admin/submissions" && req.method === "GET") {
    if (!requireAdmin(req, url, res)) return true;
    try {
      sendJson(res, 200, await listSubmissions(url));
    } catch (error) {
      sendJson(res, 503, { error: error.message });
    }
    return true;
  }

  if (url.pathname === "/api/admin/submissions.csv" && req.method === "GET") {
    if (!requireAdmin(req, url, res)) return true;
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
    if (!requireAdmin(req, url, res)) return true;
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
