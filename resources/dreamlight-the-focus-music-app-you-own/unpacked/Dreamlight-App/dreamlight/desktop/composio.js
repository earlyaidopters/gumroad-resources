const fs = require("fs");
const os = require("os");
const path = require("path");

const BASE_URL = "https://backend.composio.dev/api/v3";
const TOOLKIT_SLUG = "googlecalendar";
const CREATE_EVENT_TOOL = "GOOGLECALENDAR_CREATE_EVENT";
const LIST_EVENTS_TOOL = "GOOGLECALENDAR_EVENTS_LIST";
const DEFAULT_USER_ID = "default";
const DEFAULT_TIMEOUT_MS = 15000;

const STATUS_RANK = {
  ACTIVE: 6,
  INITIATED: 5,
  INITIALIZING: 5,
  EXPIRED: 4,
  INACTIVE: 3,
  REVOKED: 2,
  FAILED: 1,
};

function defaultConfigPath() {
  return path.join(os.homedir(), ".config", "dreamlight", "composio.json");
}

function cleanString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function readCredentials({ configPath = defaultConfigPath(), env = process.env } = {}) {
  try {
    const raw = fs.readFileSync(configPath, "utf8");
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return { ok: false, code: "INVALID_CONFIG", message: "Could not parse ~/.config/dreamlight/composio.json." };
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { ok: false, code: "INVALID_CONFIG", message: "Invalid format in ~/.config/dreamlight/composio.json." };
    }
    const userApiKey = cleanString(parsed.userApiKey);
    const orgId = cleanString(parsed.orgId);
    const projectId = cleanString(parsed.projectId);
    const userId = cleanString(parsed.userId);
    if (!userApiKey || !orgId || !projectId) {
      return {
        ok: false,
        code: "INCOMPLETE_CONFIG",
        message: "composio.json requires userApiKey, orgId, and projectId.",
      };
    }
    return {
      ok: true,
      source: "file",
      credentials: { userApiKey, orgId, projectId, userId: userId || null },
    };
  } catch (error) {
    if (error && error.code !== "ENOENT") {
      return { ok: false, code: "CONFIG_READ_ERROR", message: "Could not read ~/.config/dreamlight/composio.json." };
    }
  }

  const userApiKey = cleanString(env?.COMPOSIO_USER_API_KEY);
  const orgId = cleanString(env?.COMPOSIO_ORG_ID);
  const projectId = cleanString(env?.COMPOSIO_PROJECT_ID);
  const userId = cleanString(env?.COMPOSIO_USER_ID);
  if (!userApiKey || !orgId || !projectId) {
    return { ok: true, source: null, credentials: null };
  }
  return {
    ok: true,
    source: "env",
    credentials: { userApiKey, orgId, projectId, userId: userId || null },
  };
}

function sanitizeMessage(text, credentials) {
  let out = String(text || "Request failed.").replace(/\s+/g, " ").trim();
  if (credentials) {
    for (const secret of [credentials.userApiKey, credentials.orgId, credentials.projectId]) {
      if (secret && secret.length >= 4 && out.includes(secret)) {
        out = out.split(secret).join("[redacted]");
      }
    }
  }
  return out.slice(0, 220) || "Request failed.";
}

function formatNaiveDateTime(date, timeZone) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const map = {};
  for (const part of parts) {
    if (part.type !== "literal") map[part.type] = part.value;
  }
  return `${map.year}-${map.month}-${map.day}T${map.hour}:${map.minute}:${map.second}`;
}

function resolveTimeZone(preferred) {
  const candidate = cleanString(preferred);
  const fallback = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const tz = candidate || fallback;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz }).format(new Date(0));
    return tz;
  } catch {
    return fallback;
  }
}

function parseDate(value) {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function buildCreateEventArguments({ summary, start, end, description, timeZone } = {}) {
  const startDate = parseDate(start);
  const endDate = parseDate(end);
  if (!startDate || !endDate) {
    return { ok: false, code: "INVALID_INPUT", message: "Start and end times are required." };
  }
  const diffMs = endDate.getTime() - startDate.getTime();
  if (diffMs <= 0) {
    return { ok: false, code: "INVALID_INPUT", message: "End time must be after start time." };
  }

  const totalMinutes = Math.min(24 * 60, Math.max(1, Math.round(diffMs / 60000)));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const tz = resolveTimeZone(timeZone);

  const args = {
    calendar_id: "primary",
    summary: cleanString(summary) || "Focus session",
    description: cleanString(description) || "Dreamlight session",
    start_datetime: formatNaiveDateTime(startDate, tz),
    timezone: tz,
    event_duration_hour: hours,
    event_duration_minutes: minutes,
  };

  return { ok: true, arguments: args, startDate, endDate, timeZone: tz };
}

function timestampOf(item) {
  const raw = item?.updated_at || item?.created_at || "";
  const ms = Date.parse(raw);
  return Number.isNaN(ms) ? 0 : ms;
}

function selectCalendarAccount(items, preferredUserId) {
  const calendarItems = (Array.isArray(items) ? items : []).filter((item) => {
    const slug = String(item?.toolkit?.slug || "").toLowerCase();
    if (slug !== TOOLKIT_SLUG) return false;
    if (preferredUserId && item?.user_id && item.user_id !== preferredUserId) return false;
    return true;
  });

  if (!calendarItems.length) return null;

  calendarItems.sort((a, b) => {
    const aDisabled = Boolean(a?.is_disabled);
    const bDisabled = Boolean(b?.is_disabled);
    if (aDisabled !== bDisabled) return aDisabled ? 1 : -1;
    const rankDiff = (STATUS_RANK[String(b?.status || "").toUpperCase()] || 0) -
      (STATUS_RANK[String(a?.status || "").toUpperCase()] || 0);
    if (rankDiff !== 0) return rankDiff;
    return timestampOf(b) - timestampOf(a);
  });

  return calendarItems[0];
}

function selectAuthConfig(items) {
  const list = (Array.isArray(items) ? items : []).filter((item) => {
    const slug = String(item?.toolkit?.slug || "").toLowerCase();
    if (slug && slug !== TOOLKIT_SLUG) return false;
    const status = String(item?.status || "ENABLED").toUpperCase();
    return status === "ENABLED" && !item?.is_disabled;
  });
  if (!list.length) return null;

  list.sort((a, b) => {
    const aManaged = a?.is_composio_managed ? 1 : 0;
    const bManaged = b?.is_composio_managed ? 1 : 0;
    if (bManaged !== aManaged) return bManaged - aManaged;
    const aOauth = String(a?.auth_scheme || "").toUpperCase() === "OAUTH2" ? 1 : 0;
    const bOauth = String(b?.auth_scheme || "").toUpperCase() === "OAUTH2" ? 1 : 0;
    return bOauth - aOauth;
  });
  return list[0];
}

function validateRedirectUrl(raw) {
  const urlString = cleanString(raw);
  if (!urlString) return null;
  try {
    const parsed = new URL(urlString);
    if (parsed.protocol !== "https:") return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

function createComposioClient({
  fetchImpl = (...args) => globalThis.fetch(...args),
  configPath = defaultConfigPath(),
  env = process.env,
  baseUrl = BASE_URL,
  timeoutMs = DEFAULT_TIMEOUT_MS,
} = {}) {
  function getCredentials() {
    return readCredentials({ configPath, env });
  }

  async function apiRequest(endpoint, { method = "GET", body, credentials } = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const headers = {
      "x-user-api-key": credentials.userApiKey,
      "x-org-id": credentials.orgId,
      "x-project-id": credentials.projectId,
      accept: "application/json",
    };
    const init = { method, headers, signal: controller.signal };
    if (body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(body);
    }

    try {
      const response = await fetchImpl(`${baseUrl}${endpoint}`, init);
      const text = await response.text();
      let data = null;
      if (text) {
        try { data = JSON.parse(text); } catch {}
      }

      if (!response.ok) {
        const apiMsg = data?.error?.message || data?.message || data?.error || response.statusText || `HTTP ${response.status}`;
        const code = response.status === 401 || response.status === 403 ? "AUTH_ERROR" : "API_ERROR";
        return {
          ok: false,
          code,
          statusCode: response.status,
          message: sanitizeMessage(apiMsg, credentials),
        };
      }

      return { ok: true, data };
    } catch (error) {
      if (error && error.name === "AbortError") {
        return { ok: false, code: "TIMEOUT", message: "Composio request timed out." };
      }
      return {
        ok: false,
        code: "NETWORK_ERROR",
        message: sanitizeMessage(error?.message || "Could not reach Composio.", credentials),
      };
    } finally {
      clearTimeout(timer);
    }
  }

  async function status() {
    const loaded = getCredentials();
    if (!loaded.ok) return loaded;
    if (!loaded.credentials) {
      return { ok: true, configured: false, connected: false, state: "NOT_CONFIGURED" };
    }

    const creds = loaded.credentials;
    const params = new URLSearchParams({ toolkit_slugs: TOOLKIT_SLUG, limit: "50" });
    if (creds.userId) params.set("user_ids", creds.userId);

    const res = await apiRequest(`/connected_accounts?${params.toString()}`, { credentials: creds });
    if (!res.ok) return res;

    const chosen = selectCalendarAccount(res.data?.items, creds.userId);
    if (!chosen) {
      return { ok: true, configured: true, connected: false, state: "NOT_CONNECTED" };
    }

    const state = String(chosen.status || "UNKNOWN").toUpperCase();
    const connected = state === "ACTIVE" && !chosen.is_disabled;
    return {
      ok: true,
      configured: true,
      connected,
      state: chosen.is_disabled ? "DISABLED" : state,
      accountId: chosen.id || null,
      userId: chosen.user_id || creds.userId || DEFAULT_USER_ID,
    };
  }

  async function ensureAuthConfig(credentials) {
    const listRes = await apiRequest(`/auth_configs?toolkit_slug=${encodeURIComponent(TOOLKIT_SLUG)}`, {
      credentials,
    });
    if (!listRes.ok) return listRes;

    const existing = selectAuthConfig(listRes.data?.items);
    if (existing?.id) return { ok: true, authConfigId: existing.id };

    const createRes = await apiRequest("/auth_configs", {
      method: "POST",
      credentials,
      body: {
        toolkit: { slug: TOOLKIT_SLUG },
        auth_config: { type: "use_composio_managed_auth" },
      },
    });
    if (!createRes.ok) return createRes;

    const createdId = createRes.data?.auth_config?.id || createRes.data?.id;
    if (!createdId) {
      return { ok: false, code: "AUTH_CONFIG_ERROR", message: "Could not find a Google Calendar auth config." };
    }
    return { ok: true, authConfigId: createdId };
  }

  async function connect() {
    const loaded = getCredentials();
    if (!loaded.ok) return loaded;
    if (!loaded.credentials) {
      return {
        ok: false,
        code: "NOT_CONFIGURED",
        message: "Add ~/.config/dreamlight/composio.json with your Composio credentials first.",
      };
    }

    const creds = loaded.credentials;
    const authConfig = await ensureAuthConfig(creds);
    if (!authConfig.ok) return authConfig;

    const userId = creds.userId || DEFAULT_USER_ID;
    const linkRes = await apiRequest("/connected_accounts/link", {
      method: "POST",
      credentials: creds,
      body: {
        auth_config_id: authConfig.authConfigId,
        user_id: userId,
      },
    });
    if (!linkRes.ok) return linkRes;

    const redirectUrl = validateRedirectUrl(linkRes.data?.redirect_url || linkRes.data?.redirectUrl);
    if (!redirectUrl) {
      return { ok: false, code: "INVALID_REDIRECT", message: "Composio did not return a valid https redirect URL." };
    }

    return {
      ok: true,
      redirectUrl,
      connectedAccountId: linkRes.data?.connected_account_id || null,
      expiresAt: linkRes.data?.expires_at || null,
    };
  }

  async function createFocusBlock({ summary, start, end, description, timeZone } = {}) {
    const loaded = getCredentials();
    if (!loaded.ok) return loaded;
    if (!loaded.credentials) {
      return {
        ok: false,
        code: "NOT_CONFIGURED",
        message: "Add ~/.config/dreamlight/composio.json with your Composio credentials first.",
      };
    }

    const built = buildCreateEventArguments({ summary, start, end, description, timeZone });
    if (!built.ok) return built;

    const current = await status();
    if (!current.ok) return current;
    if (!current.connected || !current.accountId) {
      return {
        ok: false,
        code: "NOT_CONNECTED",
        state: current.state,
        message: "Google Calendar is not connected.",
      };
    }

    const creds = loaded.credentials;
    const execRes = await apiRequest(`/tools/execute/${encodeURIComponent(CREATE_EVENT_TOOL)}`, {
      method: "POST",
      credentials: creds,
      body: {
        connected_account_id: current.accountId,
        user_id: current.userId || creds.userId || DEFAULT_USER_ID,
        arguments: built.arguments,
      },
    });
    if (!execRes.ok) return execRes;

    const payload = execRes.data || {};
    if (payload.successful === false || payload.error) {
      return {
        ok: false,
        code: "TOOL_ERROR",
        message: sanitizeMessage(payload.error || "Could not create Google Calendar event.", creds),
      };
    }

    const eventData = payload.data?.response_data || payload.data || {};
    return {
      ok: true,
      eventId: eventData.id || null,
      htmlLink: eventData.htmlLink || null,
      start: built.startDate.toISOString(),
      end: built.endDate.toISOString(),
      timeZone: built.timeZone,
    };
  }

  // Read-only: the day's events, used by meeting auto-play.
  async function listEvents({ timeMin, timeMax } = {}) {
    const loaded = getCredentials();
    if (!loaded.ok) return loaded;
    if (!loaded.credentials) {
      return { ok: false, code: "NOT_CONFIGURED", message: "Composio is not configured." };
    }
    const minDate = parseDate(timeMin);
    const maxDate = parseDate(timeMax);
    if (!minDate || !maxDate || maxDate <= minDate) {
      return { ok: false, code: "INVALID_INPUT", message: "A valid time range is required." };
    }

    const current = await status();
    if (!current.ok) return current;
    if (!current.connected || !current.accountId) {
      return { ok: false, code: "NOT_CONNECTED", state: current.state, message: "Google Calendar is not connected." };
    }

    const creds = loaded.credentials;
    const execRes = await apiRequest(`/tools/execute/${encodeURIComponent(LIST_EVENTS_TOOL)}`, {
      method: "POST",
      credentials: creds,
      body: {
        connected_account_id: current.accountId,
        user_id: current.userId || creds.userId || DEFAULT_USER_ID,
        arguments: {
          calendarId: "primary",
          timeMin: minDate.toISOString(),
          timeMax: maxDate.toISOString(),
          singleEvents: true,
          orderBy: "startTime",
          maxResults: 100,
        },
      },
    });
    if (!execRes.ok) return execRes;

    const payload = execRes.data || {};
    if (payload.successful === false || payload.error) {
      return {
        ok: false,
        code: "TOOL_ERROR",
        message: sanitizeMessage(payload.error || "Could not read Google Calendar.", creds),
      };
    }
    const data = payload.data?.response_data || payload.data || {};
    return { ok: true, items: Array.isArray(data.items) ? data.items : [] };
  }

  return {
    getCredentials,
    status,
    connect,
    createFocusBlock,
    listEvents,
  };
}

const defaultClient = createComposioClient();

module.exports = {
  BASE_URL,
  TOOLKIT_SLUG,
  CREATE_EVENT_TOOL,
  LIST_EVENTS_TOOL,
  DEFAULT_USER_ID,
  DEFAULT_TIMEOUT_MS,
  defaultConfigPath,
  readCredentials,
  sanitizeMessage,
  formatNaiveDateTime,
  buildCreateEventArguments,
  selectCalendarAccount,
  selectAuthConfig,
  validateRedirectUrl,
  createComposioClient,
  status: () => defaultClient.status(),
  connect: () => defaultClient.connect(),
  createFocusBlock: (input) => defaultClient.createFocusBlock(input),
  listEvents: (input) => defaultClient.listEvents(input),
};
