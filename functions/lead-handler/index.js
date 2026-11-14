/*
 * Ровно — HTTP handler для заявок (Yandex Cloud Functions, Node.js).
 *
 * Fail-closed: без LEAD_DELIVERY_URL и LEAD_DELIVERY_TOKEN заявки не принимаются.
 * Не логировать event.body, телефон, имя или заголовки авторизации.
 */
"use strict";

const MAX_BODY_BYTES = 16 * 1024;
const DEFAULT_ORIGIN = "https://marcostavar24633-cyber.github.io";

function response(statusCode, body, origin) {
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Vary": "Origin"
  };
  if (origin) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Methods"] = "POST, OPTIONS";
    headers["Access-Control-Allow-Headers"] = "Content-Type";
    headers["Access-Control-Max-Age"] = "600";
  }
  return { statusCode, headers, body: JSON.stringify(body) };
}

function normalizePhone(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length !== 11) return "";
  if (digits[0] === "8") return "7" + digits.slice(1);
  return digits[0] === "7" ? digits : "";
}

function text(value, max = 500) {
  if (value == null) return "";
  return String(value).trim().slice(0, max);
}

function parseBody(event) {
  if (!event || typeof event.body !== "string") throw new Error("INVALID_BODY");
  const raw = event.isBase64Encoded
    ? Buffer.from(event.body, "base64")
    : Buffer.from(event.body, "utf8");
  if (raw.length > MAX_BODY_BYTES) throw new Error("BODY_TOO_LARGE");
  return JSON.parse(raw.toString("utf8"));
}

async function deliverLead(lead, requestId) {
  const endpoint = process.env.LEAD_DELIVERY_URL;
  const token = process.env.LEAD_DELIVERY_TOKEN;
  if (!endpoint || !token) throw new Error("DELIVERY_NOT_CONFIGURED");

  let url;
  try { url = new URL(endpoint); } catch (_) { throw new Error("DELIVERY_NOT_CONFIGURED"); }
  if (url.protocol !== "https:") throw new Error("DELIVERY_NOT_CONFIGURED");

  const upstream = await fetch(url.toString(), {
    method: "POST",
    redirect: "error",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + token,
      "Idempotency-Key": requestId || ""
    },
    body: JSON.stringify(lead),
    signal: AbortSignal.timeout(8000)
  });

  if (!upstream.ok) throw new Error("DELIVERY_FAILED");
  return true;
}

module.exports.handler = async function (event) {
  const headers = event && event.headers ? event.headers : {};
  const origin = headers.origin || headers.Origin || "";
  const allowedOrigin = process.env.CORS_ORIGIN || DEFAULT_ORIGIN;

  if (origin && origin !== allowedOrigin) {
    return response(403, { ok: false, error: "ORIGIN_NOT_ALLOWED" });
  }

  const method = event && (event.httpMethod || event.method);
  if (method === "OPTIONS") return response(204, {}, origin || allowedOrigin);
  if (method !== "POST") return response(405, { ok: false, error: "METHOD_NOT_ALLOWED" }, origin || allowedOrigin);

  const contentType = headers["content-type"] || headers["Content-Type"] || "";
  if (!/^application\/json(?:\s*;|$)/i.test(contentType)) {
    return response(415, { ok: false, error: "JSON_REQUIRED" }, origin || allowedOrigin);
  }

  let input;
  try {
    input = parseBody(event);
  } catch (error) {
    const status = error.message === "BODY_TOO_LARGE" ? 413 : 400;
    return response(status, { ok: false, error: status === 413 ? "BODY_TOO_LARGE" : "INVALID_REQUEST" }, origin || allowedOrigin);
  }

  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return response(400, { ok: false, error: "INVALID_REQUEST" }, origin || allowedOrigin);
  }

  // Honeypot: скрытое поле website должно оставаться пустым.
  if (text(input.website, 200)) {
    return response(200, { ok: true }, origin || allowedOrigin);
  }

  const name = text(input.name, 100);
  const phone = normalizePhone(input.phone);
  const consent = input.consent === true || input.consent === "on" || input.consent === "true";

  if (name.length < 2 || !phone || !consent) {
    return response(400, { ok: false, error: "VALIDATION_FAILED" }, origin || allowedOrigin);
  }

  const lead = {
    source: "rovno-otdelka",
    form: text(input.form, 80),
    name,
    phone: "+" + phone,
    type: text(input.type, 120),
    object: text(input.object || input.obj || input.q_obj, 120),
    area: text(input.area, 30),
    calc: text(input.calc, 1000),
    estimate: text(input.estimate, 300),
    quiz: {
      object: text(input.q_obj, 120),
      condition: text(input.q_state, 120),
      areaRange: text(input.q_area, 60),
      startWhen: text(input.q_when, 80)
    },
    page: text(input.page, 200),
    consent: true,
    receivedAt: new Date().toISOString()
  };

  try {
    const requestId = text(
      input.clientRequestId || (event.requestContext && (event.requestContext.requestId || event.requestContext.request_id)),
      120
    );
    await deliverLead(lead, requestId);
    return response(202, { ok: true, status: "accepted" }, origin || allowedOrigin);
  } catch (error) {
    // Намеренно не выводим данные заявки и детали ответа внешнего сервиса в логи.
    const notConfigured = error.message === "DELIVERY_NOT_CONFIGURED";
    return response(notConfigured ? 503 : 502, {
      ok: false,
      error: notConfigured ? "DELIVERY_NOT_CONFIGURED" : "DELIVERY_FAILED"
    }, origin || allowedOrigin);
  }
};
