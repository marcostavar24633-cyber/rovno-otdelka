const test = require("node:test");
const assert = require("node:assert/strict");
const { handler } = require("./index");

const origin = "https://marcostavar24633-cyber.github.io";
const base = {
  httpMethod: "POST",
  headers: { origin, "content-type": "application/json" },
  body: JSON.stringify({ name: "Тест", phone: "+7 963 123-45-67", consent: true })
};

test("OPTIONS returns CORS preflight", async () => {
  const r = await handler({ httpMethod: "OPTIONS", headers: { origin } });
  assert.equal(r.statusCode, 204);
  assert.equal(r.headers["Access-Control-Allow-Origin"], origin);
});

test("rejects a foreign origin", async () => {
  const r = await handler({ ...base, headers: { ...base.headers, origin: "https://evil.example" } });
  assert.equal(r.statusCode, 403);
});

test("rejects methods other than POST and OPTIONS", async () => {
  const r = await handler({ httpMethod: "GET", headers: { origin } });
  assert.equal(r.statusCode, 405);
});

test("requires JSON content type", async () => {
  const r = await handler({ ...base, headers: { origin, "content-type": "text/plain" } });
  assert.equal(r.statusCode, 415);
});

test("rejects malformed JSON", async () => {
  const r = await handler({ ...base, body: "{" });
  assert.equal(r.statusCode, 400);
});

test("rejects non-object JSON", async () => {
  const r = await handler({ ...base, body: "null" });
  assert.equal(r.statusCode, 400);
});

test("rejects oversized bodies", async () => {
  const r = await handler({ ...base, body: JSON.stringify({ padding: "x".repeat(17 * 1024) }) });
  assert.equal(r.statusCode, 413);
});

test("requires valid name, phone and consent", async () => {
  const r = await handler({ ...base, body: JSON.stringify({ name: "A", phone: "123", consent: false }) });
  assert.equal(r.statusCode, 400);
});

test("honeypot submissions are silently discarded", async () => {
  const r = await handler({ ...base, body: JSON.stringify({ name: "Тест", phone: "+7 963 123-45-67", consent: true, website: "bot" }) });
  assert.equal(r.statusCode, 200);
  assert.deepEqual(JSON.parse(r.body), { ok: true });
});

test("valid lead fails closed until delivery is configured", async () => {
  delete process.env.LEAD_DELIVERY_URL;
  delete process.env.LEAD_DELIVERY_TOKEN;
  const r = await handler(base);
  assert.equal(r.statusCode, 503);
  assert.deepEqual(JSON.parse(r.body), { ok: false, error: "DELIVERY_NOT_CONFIGURED" });
});
