import express, { Router } from "express";
import cors from "cors";
import { z } from "zod";
import pg from "pg";
class ApiError extends Error {
  status;
  code;
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}
const notFound = (_req, _res, next) => {
  next(new ApiError(404, "NOT_FOUND", "Route not found."));
};
function fromPostgres(error) {
  const code = error?.code;
  switch (code) {
    case "42501":
      return new ApiError(403, "FORBIDDEN", "Anda tiada kebenaran untuk operasi ini.");
    case "23505":
      return new ApiError(409, "CONFLICT", "Rekod dengan kunci yang sama sudah wujud.");
    case "23514":
    case "22023":
      return new ApiError(400, "BAD_REQUEST", "Nilai tidak sah.");
    case "P0002":
      return new ApiError(404, "NOT_FOUND", "Rekod tidak dijumpai.");
    default:
      return null;
  }
}
const errorHandler = (error, _req, res, next) => {
  const mapped = error instanceof ApiError ? error : fromPostgres(error);
  if (mapped) {
    res.status(mapped.status).json({ error: { code: mapped.code, message: mapped.message } });
    return;
  }
  console.error(error);
  res.status(500).json({ error: { code: "INTERNAL", message: "Ralat pelayan tidak dijangka." } });
};
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required (Neon PostgreSQL connection string).");
}
const pool = new pg.Pool({
  connectionString,
  max: Number(process.env.PG_POOL_MAX ?? 5),
  idleTimeoutMillis: 1e4,
  connectionTimeoutMillis: 1e4
});
async function withUser(userId, fn) {
  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query("select set_config('app.user_id', $1, true)", [userId]);
    await client.query("set local role app_user");
    const result = await fn(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback").catch(() => void 0);
    throw error;
  } finally {
    client.release();
  }
}
const baseUrl = () => {
  const url = process.env.NEON_AUTH_BASE_URL;
  if (!url) {
    throw new Error("NEON_AUTH_BASE_URL is required (Neon Auth base URL).");
  }
  return url.replace(/\/$/, "");
};
const authCookieName = () => {
  const configured = process.env.NEON_AUTH_COOKIE_NAME;
  if (configured) return configured;
  return baseUrl().startsWith("https://") ? "__Secure-neon-auth.session_token" : "neon-auth.session_token";
};
const origin = () => process.env.NEON_AUTH_TRUSTED_ORIGIN ?? process.env.CORS_ORIGIN ?? "http://localhost:5173";
function sessionCookieFrom(headers) {
  const setCookies = headers.getSetCookie?.() ?? [];
  for (const raw of setCookies) {
    const pair = raw.split(";")[0].trim();
    if (pair.includes("session_token=")) return pair;
  }
  return null;
}
async function call(path, body, cookiePair) {
  const response = await fetch(`${baseUrl()}/${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: origin(),
      ...cookiePair ? { cookie: cookiePair } : {}
    },
    body: JSON.stringify(body ?? {})
  });
  const payload = await response.json().catch(() => null);
  return {
    ok: response.ok,
    status: response.status,
    sessionCookie: sessionCookieFrom(response.headers),
    user: payload?.user ?? null,
    message: payload?.message ?? null
  };
}
const neonAuth = {
  signUp: (input) => call("sign-up/email", input),
  signIn: (input) => call("sign-in/email", input),
  signOut: (cookiePair) => call("sign-out", {}, cookiePair),
  updateUser: (cookiePair, input) => call("update-user", input, cookiePair),
  changePassword: (cookiePair, input) => call("change-password", input, cookiePair),
  requestPasswordReset: (input) => call("request-password-reset", input),
  /** Validates the session cookie pair and returns the current user. */
  async getSession(cookiePair) {
    if (!cookiePair) return null;
    const response = await fetch(`${baseUrl()}/get-session`, {
      headers: { cookie: cookiePair, origin: origin() }
    });
    if (!response.ok) return null;
    const payload = await response.json().catch(() => null);
    return payload?.user ?? null;
  }
};
function readSessionToken(req) {
  const header = req.headers.cookie;
  if (!header) return null;
  const names = /* @__PURE__ */ new Set([authCookieName(), "__Secure-neon-auth.session_token", "neon-auth.session_token"]);
  for (const part of header.split(";")) {
    const pair = part.trim();
    const [rawName] = pair.split("=");
    if (names.has(rawName) && pair.length > rawName.length + 1) {
      return pair;
    }
  }
  return null;
}
function requireSession(options = {}) {
  return async (req, _res, next) => {
    try {
      const token = readSessionToken(req);
      const user = await neonAuth.getSession(token);
      if (!token || !user) {
        if (options.optional) return next();
        return next(new ApiError(401, "UNAUTHORIZED", "Sesi tamat. Sila log masuk semula."));
      }
      const profile = await withUser(user.id, async (db) => {
        const result = await db.query("select * from public.upsert_self_profile($1)", [user.email]);
        return result.rows[0];
      });
      req.sessionToken = token;
      req.authUser = user;
      req.profile = profile;
      return next();
    } catch (error) {
      return next(error);
    }
  };
}
function requireActive(req, _res, next) {
  if (req.profile?.status !== "active") {
    return next(new ApiError(403, "FORBIDDEN", "Akaun belum diluluskan pentadbir."));
  }
  return next();
}
function requireAdmin(req, _res, next) {
  if (req.profile?.role !== "admin" || req.profile.status !== "active") {
    return next(new ApiError(403, "FORBIDDEN", "Akses pentadbir diperlukan."));
  }
  return next();
}
const iso$2 = (value) => value instanceof Date ? value.toISOString() : value;
const mapRow$2 = (row) => ({
  id: row.id,
  email: row.email,
  name: row.name,
  role: row.role,
  status: row.status,
  created_at: iso$2(row.created_at),
  updated_at: iso$2(row.updated_at)
});
async function renameProfile(db, name) {
  const result = await db.query(
    "update public.profiles set name = $1, updated_at = now() where id = nullif(current_setting('app.user_id', true), '')::uuid returning *",
    [name]
  );
  return result.rows[0] ? mapRow$2(result.rows[0]) : null;
}
async function listMembers(db) {
  const result = await db.query("select * from public.profiles order by status, role desc, name");
  return result.rows.map(mapRow$2);
}
async function setMembership(db, id, role, status) {
  const result = await db.query("select * from public.admin_set_membership($1, $2, $3) as row", [id, role, status]);
  return result.rows[0] ? mapRow$2(result.rows[0]) : null;
}
const membershipSchema = z.object({
  role: z.enum(["teacher", "admin"]).nullish(),
  status: z.enum(["pending", "active", "disabled"]).nullish()
});
function createAdminRoutes() {
  const router = Router();
  const admin = [requireSession(), requireAdmin];
  router.get("/admin/members", ...admin, async (req, res, next) => {
    try {
      res.json({ members: await withUser(req.profile.id, (db) => listMembers(db)) });
    } catch (error) {
      next(error);
    }
  });
  router.patch("/admin/members/:id", ...admin, async (req, res, next) => {
    try {
      const parsed = membershipSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ApiError(400, "BAD_REQUEST", "Peranan atau status tidak sah.");
      }
      const profile = await withUser(
        req.profile.id,
        (db) => setMembership(db, String(req.params.id), parsed.data.role ?? null, parsed.data.status ?? null)
      );
      if (!profile) {
        throw new ApiError(404, "NOT_FOUND", "Ahli tidak dijumpai.");
      }
      res.json({ profile });
    } catch (error) {
      next(error);
    }
  });
  return router;
}
const credentialsSchema = z.object({
  email: z.string().trim().email().max(200),
  password: z.string().min(8).max(200)
});
const registerSchema = credentialsSchema.extend({
  name: z.string().trim().min(1).max(120)
});
const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: z.string().min(8).max(200)
});
const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1e3;
function setSessionCookie(res, cookiePair) {
  const [name, ...value] = cookiePair.split("=");
  const attributes = [
    `${name}=${value.join("=")}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${Math.floor(SESSION_MAX_AGE_MS / 1e3)}`
  ];
  if (process.env.NODE_ENV === "production") attributes.push("Secure");
  res.setHeader("Set-Cookie", attributes.join("; "));
}
function clearSessionCookie(res) {
  res.clearCookie(authCookieName(), { path: "/" });
}
async function profileFor(userId, email) {
  return withUser(userId, async (db) => {
    const result = await db.query("select * from public.upsert_self_profile($1)", [email]);
    return result.rows[0];
  });
}
function createAuthRoutes() {
  const router = Router();
  router.post("/auth/register", async (req, res, next) => {
    try {
      const parsed = registerSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ApiError(400, "BAD_REQUEST", "E-mel atau kata laluan tidak sah (minimum 8 aksara).");
      }
      const result = await neonAuth.signUp(parsed.data);
      if (!result.ok || !result.sessionCookie || !result.user) {
        throw new ApiError(400, "BAD_REQUEST", result.message ?? "Pendaftaran gagal.");
      }
      setSessionCookie(res, result.sessionCookie);
      const profile = await profileFor(result.user.id, result.user.email);
      res.status(201).json({ user: result.user, profile });
    } catch (error) {
      next(error);
    }
  });
  router.post("/auth/login", async (req, res, next) => {
    try {
      const parsed = credentialsSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ApiError(400, "BAD_REQUEST", "E-mel atau kata laluan tidak sah.");
      }
      const result = await neonAuth.signIn(parsed.data);
      if (!result.ok || !result.sessionCookie || !result.user) {
        throw new ApiError(401, "UNAUTHORIZED", "E-mel atau kata laluan salah.");
      }
      setSessionCookie(res, result.sessionCookie);
      const profile = await profileFor(result.user.id, result.user.email);
      res.json({ user: result.user, profile });
    } catch (error) {
      next(error);
    }
  });
  router.post("/auth/logout", async (req, res, next) => {
    try {
      const cookiePair = readSessionToken(req);
      if (cookiePair) {
        await neonAuth.signOut(cookiePair).catch(() => void 0);
      }
      clearSessionCookie(res);
      res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  });
  router.post("/auth/change-password", requireSession(), async (req, res, next) => {
    try {
      const parsed = changePasswordSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ApiError(400, "BAD_REQUEST", "Kata laluan baharu perlu sekurang-kurangnya 8 aksara.");
      }
      const result = await neonAuth.changePassword(req.sessionToken, parsed.data);
      if (!result.ok) {
        throw new ApiError(400, "BAD_REQUEST", result.message ?? "Kata laluan semasa tidak sah.");
      }
      clearSessionCookie(res);
      res.json({ ok: true, reauthenticate: true });
    } catch (error) {
      next(error);
    }
  });
  router.post("/auth/forgot-password", async (req, res, next) => {
    try {
      const parsed = z.object({ email: z.string().trim().email() }).safeParse(req.body);
      if (!parsed.success) {
        throw new ApiError(400, "BAD_REQUEST", "E-mel tidak sah.");
      }
      await neonAuth.requestPasswordReset({
        email: parsed.data.email,
        redirectTo: process.env.APP_ORIGIN ?? "http://localhost:5173/reset-password"
      });
      res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  });
  return router;
}
const iso$1 = (value) => value instanceof Date ? value.toISOString() : value;
function mapRow$1(row) {
  return {
    id: row.id,
    user_id: row.user_id,
    tarikh: iso$1(row.tarikh).slice(0, 10),
    hari: row.hari,
    tahun: row.tahun,
    kelas: row.kelas,
    masa: row.masa,
    subjek: row.subjek,
    content: row.content ?? {},
    status: row.status ?? "draft",
    created_at: iso$1(row.created_at),
    updated_at: iso$1(row.updated_at)
  };
}
const likeTerm = (term) => `%${term.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
async function listRecords(db, userId, query) {
  const offset = (query.page - 1) * query.pageSize;
  const params = [userId];
  let filter = "";
  if (query.search) {
    params.push(likeTerm(query.search));
    filter = `and (subjek ilike $2 escape '\\' or kelas ilike $2 escape '\\' or hari ilike $2 escape '\\' or masa ilike $2 escape '\\')`;
  }
  params.push(query.pageSize, offset);
  const result = await db.query(
    `select *, count(*) over() as total_count
       from public.rph_records
      where user_id = $1 ${filter}
      order by tarikh desc, created_at desc
      limit $${params.length - 1} offset $${params.length}`,
    params
  );
  return {
    data: result.rows.map(mapRow$1),
    totalCount: Number(result.rows[0]?.total_count ?? 0),
    page: query.page,
    pageSize: query.pageSize
  };
}
async function createRecord(db, userId, input) {
  const result = await db.query(
    `insert into public.rph_records (user_id, tarikh, hari, tahun, kelas, masa, subjek, content, status)
     values ($1, $2, $3, $4, $5, $6, $7, $8, coalesce($9, 'draft'))
     returning *`,
    [
      userId,
      input.tarikh,
      input.hari,
      input.tahun,
      input.kelas,
      input.masa,
      input.subjek,
      JSON.stringify(input.content ?? {}),
      input.status ?? null
    ]
  );
  return mapRow$1(result.rows[0]);
}
async function updateRecord(db, id, input) {
  const fields = [];
  const params = [id];
  const push = (column, value) => {
    params.push(value);
    fields.push(`${column} = $${params.length}`);
  };
  if (input.tarikh !== void 0) push("tarikh", input.tarikh);
  if (input.hari !== void 0) push("hari", input.hari);
  if (input.tahun !== void 0) push("tahun", input.tahun);
  if (input.kelas !== void 0) push("kelas", input.kelas);
  if (input.masa !== void 0) push("masa", input.masa);
  if (input.subjek !== void 0) push("subjek", input.subjek);
  if (input.content !== void 0) push("content", JSON.stringify(input.content));
  if (input.status !== void 0) push("status", input.status);
  if (fields.length === 0) {
    return null;
  }
  const result = await db.query(
    `update public.rph_records
        set ${fields.join(", ")}, updated_at = now()
      where id = $1
      returning *`,
    params
  );
  return result.rows[0] ? mapRow$1(result.rows[0]) : null;
}
async function deleteRecord(db, id) {
  const result = await db.query("delete from public.rph_records where id = $1 returning id", [id]);
  return result.rowCount === 1;
}
const iso = (value) => value instanceof Date ? value.toISOString() : value;
const mapRow = (row) => ({
  id: row.id,
  subjek: row.subjek,
  tahun: row.tahun,
  bidang: row.bidang,
  sk: row.sk,
  sp: Array.isArray(row.sp) ? row.sp : [],
  spi: Array.isArray(row.spi) ? row.spi : [],
  created_at: iso(row.created_at),
  updated_at: iso(row.updated_at)
});
async function listDskp(db, query) {
  const params = [];
  const filters = [];
  if (query.search) {
    params.push(likeTerm(query.search));
    filters.push(`(subjek ilike $${params.length} escape '\\' or sk ilike $${params.length} escape '\\' or coalesce(bidang, '') ilike $${params.length} escape '\\')`);
  }
  if (query.subjek) {
    params.push(query.subjek);
    filters.push(`subjek = $${params.length}`);
  }
  if (query.tahun !== void 0) {
    params.push(query.tahun);
    filters.push(`tahun = $${params.length}`);
  }
  const where = filters.length ? `where ${filters.join(" and ")}` : "";
  params.push(query.pageSize, (query.page - 1) * query.pageSize);
  const result = await db.query(
    `select *, count(*) over() as total_count
       from public.referensi_rph
      ${where}
      order by subjek, tahun, coalesce(bidang, ''), sk
      limit $${params.length - 1} offset $${params.length}`,
    params
  );
  return {
    data: result.rows.map(mapRow),
    totalCount: Number(result.rows[0]?.total_count ?? 0),
    page: query.page,
    pageSize: query.pageSize
  };
}
async function getDskpMeta(db) {
  const result = await db.query(
    "select distinct subjek, tahun from public.referensi_rph order by subjek, tahun"
  );
  return {
    subjects: [...new Set(result.rows.map((row) => row.subjek))],
    years: [...new Set(result.rows.map((row) => row.tahun))].sort((a, b) => a - b)
  };
}
async function upsertDskp(db, id, input) {
  const result = await db.query(
    "select * from public.admin_upsert_dskp($1, $2, $3, $4, $5, $6, $7) as row",
    [
      id,
      input.subjek,
      input.tahun,
      input.bidang ?? null,
      input.sk,
      JSON.stringify(input.sp ?? []),
      JSON.stringify(input.spi ?? [])
    ]
  );
  return mapRow(result.rows[0]);
}
async function deleteDskp(db, id) {
  const result = await db.query("select public.admin_delete_dskp($1)", [id]);
  return result.rows[0]?.admin_delete_dskp ?? false;
}
const spiItem = z.object({ tp: z.number().int().min(0), desc: z.string().min(1) });
const dskpSchema = z.object({
  subjek: z.string().trim().min(1).max(120),
  tahun: z.number().int().min(1).max(6),
  bidang: z.string().trim().max(160).nullish(),
  sk: z.string().trim().min(1).max(400),
  sp: z.array(z.string().trim().min(1)).min(1),
  spi: z.array(spiItem).default([])
});
const listSchema$1 = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(500).default(25),
  search: z.string().trim().max(120).optional(),
  subjek: z.string().trim().max(120).optional(),
  tahun: z.coerce.number().int().min(1).max(6).optional()
});
function createDskpRoutes() {
  const router = Router();
  const member = [requireSession(), requireActive];
  router.get("/dskp/meta", ...member, async (req, res, next) => {
    try {
      res.json(await withUser(req.profile.id, (db) => getDskpMeta(db)));
    } catch (error) {
      next(error);
    }
  });
  router.get("/dskp", ...member, async (req, res, next) => {
    try {
      const query = listSchema$1.safeParse(req.query);
      if (!query.success) {
        throw new ApiError(400, "BAD_REQUEST", "Parameter carian DSKP tidak sah.");
      }
      res.json(await withUser(req.profile.id, (db) => listDskp(db, query.data)));
    } catch (error) {
      next(error);
    }
  });
  router.post("/dskp", requireSession(), requireAdmin, async (req, res, next) => {
    try {
      const parsed = dskpSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ApiError(400, "BAD_REQUEST", "DSKP mesti ada subjek, tahun, SK dan sekurang-kurangnya satu SP.");
      }
      const record = await withUser(req.profile.id, (db) => upsertDskp(db, null, parsed.data));
      res.status(201).json({ record });
    } catch (error) {
      next(error);
    }
  });
  router.put("/dskp/:id", requireSession(), requireAdmin, async (req, res, next) => {
    try {
      const parsed = dskpSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ApiError(400, "BAD_REQUEST", "DSKP mesti ada subjek, tahun, SK dan sekurang-kurangnya satu SP.");
      }
      const record = await withUser(req.profile.id, (db) => upsertDskp(db, String(req.params.id), parsed.data));
      res.json({ record });
    } catch (error) {
      next(error);
    }
  });
  router.delete("/dskp/:id", requireSession(), requireAdmin, async (req, res, next) => {
    try {
      const deleted = await withUser(req.profile.id, (db) => deleteDskp(db, String(req.params.id)));
      if (!deleted) {
        throw new ApiError(404, "NOT_FOUND", "Rekod DSKP tidak dijumpai.");
      }
      res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  });
  return router;
}
const renameSchema = z.object({ name: z.string().trim().min(1).max(120) });
function createProfileRoutes() {
  const router = Router();
  router.get("/session", requireSession({ optional: true }), (req, res) => {
    res.json({
      user: req.authUser ?? null,
      profile: req.profile ?? null,
      role: req.profile?.role ?? null,
      status: req.profile?.status ?? null
    });
  });
  router.patch("/profile", requireSession(), requireActive, async (req, res, next) => {
    try {
      const parsed = renameSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ApiError(400, "BAD_REQUEST", "Nama tidak sah.");
      }
      const profile = await withUser(req.profile.id, (db) => renameProfile(db, parsed.data.name));
      if (!profile) {
        throw new ApiError(404, "NOT_FOUND", "Profil tidak dijumpai.");
      }
      res.json({ profile });
    } catch (error) {
      next(error);
    }
  });
  return router;
}
const contentSchema = z.object({
  bidang: z.string().optional(),
  tajukStandardKandungan: z.string().optional(),
  objektif: z.string().optional(),
  aktiviti: z.string().optional(),
  refleksi: z.string().optional(),
  sp: z.array(z.string()).optional(),
  spi: z.array(z.object({ tp: z.number(), desc: z.string() })).optional()
});
const recordSchema = z.object({
  tarikh: z.string().min(1),
  hari: z.string().min(1),
  tahun: z.number().int().min(1).max(6),
  kelas: z.string().min(1),
  masa: z.string().min(1),
  subjek: z.string().min(1),
  content: contentSchema.default({}),
  status: z.enum(["draft", "published"]).optional()
});
const patchSchema = recordSchema.partial();
const listSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().max(120).default("")
});
function createRecordRoutes() {
  const router = Router();
  const active = [requireSession(), requireActive];
  router.get("/records", ...active, async (req, res, next) => {
    try {
      const query = listSchema.safeParse(req.query);
      if (!query.success) {
        throw new ApiError(400, "BAD_REQUEST", "Parameter senarai tidak sah.");
      }
      const result = await withUser(req.profile.id, (db) => listRecords(db, req.profile.id, query.data));
      res.json(result);
    } catch (error) {
      next(error);
    }
  });
  router.post("/records", ...active, async (req, res, next) => {
    try {
      const parsed = recordSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ApiError(400, "BAD_REQUEST", "Data rekod tidak lengkap atau tidak sah.");
      }
      const record = await withUser(req.profile.id, (db) => createRecord(db, req.profile.id, parsed.data));
      res.status(201).json({ record });
    } catch (error) {
      next(error);
    }
  });
  router.patch("/records/:id", ...active, async (req, res, next) => {
    try {
      const body = patchSchema.safeParse(req.body);
      if (!body.success) {
        throw new ApiError(400, "BAD_REQUEST", "Data rekod tidak sah.");
      }
      const record = await withUser(req.profile.id, (db) => updateRecord(db, String(req.params.id), body.data));
      if (!record) {
        throw new ApiError(404, "NOT_FOUND", "Rekod tidak dijumpai atau bukan milik anda.");
      }
      res.json({ record });
    } catch (error) {
      next(error);
    }
  });
  router.delete("/records/:id", ...active, async (req, res, next) => {
    try {
      const deleted = await withUser(req.profile.id, (db) => deleteRecord(db, String(req.params.id)));
      if (!deleted) {
        throw new ApiError(404, "NOT_FOUND", "Rekod tidak dijumpai atau bukan milik anda.");
      }
      res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  });
  return router;
}
function createApp() {
  const app = express();
  const allowedOrigins = (process.env.CORS_ORIGIN ?? process.env.APP_ORIGIN ?? "http://localhost:5173").split(",").map((origin2) => origin2.trim()).filter(Boolean);
  app.disable("x-powered-by");
  app.use(
    cors({
      credentials: true,
      origin: (origin2, callback) => callback(null, !origin2 || allowedOrigins.includes(origin2))
    })
  );
  app.use(express.json({ limit: "1mb" }));
  app.use((_req, res, next) => {
    res.setHeader("x-content-type-options", "nosniff");
    res.setHeader("referrer-policy", "strict-origin-when-cross-origin");
    res.setHeader("x-frame-options", "DENY");
    next();
  });
  app.get("/api/health", (_req, res) => res.json({ ok: true }));
  app.use("/api", createAuthRoutes());
  app.use("/api", createProfileRoutes());
  app.use("/api", createRecordRoutes());
  app.use("/api", createDskpRoutes());
  app.use("/api", createAdminRoutes());
  app.use("/api", notFound);
  app.use(errorHandler);
  return app;
}
export {
  createApp
};
