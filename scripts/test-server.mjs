/**
 * test-server.mjs — node:test for server.mjs (run: npm test). Uses a temporary fixture root, no build needed.
 * Covers: root redirect, basePath redirect, 404 page under the basePath (HTML body, status 404),
 * immutable caching for hashed fonts / versioned vendor files, short caching for everything else.
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { request } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { BASE_PATH, cacheControlFor, createStaticServer, resolveRequest } from "../server.mjs";

const IMMUTABLE = "public, max-age=31536000, immutable";
const SHORT = "public, max-age=300";
let root;
let server;
let port;

before(async () => {
  root = mkdtempSync(join(tmpdir(), "vpd-server-"));
  const put = (p, body) => {
    mkdirSync(join(root, ...p.split("/").slice(0, -1)), { recursive: true });
    writeFileSync(join(root, ...p.split("/")), body);
  };
  put("index.html", "<!doctype html><title>home</title>");
  put("404.html", "<!doctype html><title>404 fixture</title><p>FIXTURE-404</p>");
  put("fonts/rs-latin-0123456789.woff2", "wOF2");
  put("fonts/OFL.txt", "licence");
  put("vendor/three-lite-0.186.1.min.js", "var THREE_LITE={};");
  put("vendor/geo/countries-110m-2.0.2.json", "{}");
  put("vendor/LICENSES.md", "# licences");
  put("_next/static/chunks/app-abc.js", "1");
  server = createStaticServer({ root });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  port = server.address().port;
});
after(() => {
  server?.close();
  if (root) rmSync(root, { recursive: true, force: true });
});

const get = (path, method = "GET") =>
  new Promise((resolve, reject) => {
    const req = request({ host: "127.0.0.1", port, path, method }, (res) => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (c) => (body += c));
      res.on("end", () => resolve({ status: res.statusCode, headers: res.headers, body }));
    });
    req.on("error", reject);
    req.end();
  });

test("resolveRequest: root redirects to the Korean home, bare basePath gets a trailing slash", () => {
  assert.deepEqual(resolveRequest("/"), { status: 302, location: `${BASE_PATH}/ko/` });
  assert.deepEqual(resolveRequest(BASE_PATH), { status: 308, location: `${BASE_PATH}/` });
  assert.equal(resolveRequest("/elsewhere/").status, 404);
  assert.equal(resolveRequest(`${BASE_PATH}/.env`).status, 403);
  assert.equal(resolveRequest(`${BASE_PATH}/%2e%2e/x`).status, 403); // decoded to a dot segment
  assert.equal(resolveRequest(`${BASE_PATH}/%252e/x`).status, 400); // double-encoded traversal
});

test("cacheControlFor: hashed fonts and versioned vendor files are immutable, the rest is short", () => {
  assert.equal(cacheControlFor("_next/static/chunks/app-abc.js"), IMMUTABLE);
  assert.equal(cacheControlFor("fonts/rs-kr-site-f8a1d13c48.woff2"), IMMUTABLE);
  assert.equal(cacheControlFor("vendor/three-lite-0.186.1.min.js"), IMMUTABLE);
  assert.equal(cacheControlFor("vendor/echarts-lite-6.1.0.min.js"), IMMUTABLE);
  assert.equal(cacheControlFor("vendor/geo/countries-110m-2.0.2.json"), IMMUTABLE);
  assert.equal(cacheControlFor("fonts/OFL.txt"), SHORT);
  assert.equal(cacheControlFor("vendor/LICENSES.md"), SHORT);
  assert.equal(cacheControlFor("index.html"), SHORT);
  assert.equal(cacheControlFor("mk/motion-kit.js"), SHORT);
});

test("GET pages and assets: status, content type and cache header", async () => {
  const home = await get(`${BASE_PATH}/`);
  assert.equal(home.status, 200);
  assert.match(home.headers["content-type"], /text\/html/);
  assert.equal(home.headers["cache-control"], SHORT);

  const font = await get(`${BASE_PATH}/fonts/rs-latin-0123456789.woff2`);
  assert.equal(font.status, 200);
  assert.equal(font.headers["content-type"], "font/woff2");
  assert.equal(font.headers["cache-control"], IMMUTABLE);

  const vendor = await get(`${BASE_PATH}/vendor/three-lite-0.186.1.min.js`);
  assert.equal(vendor.status, 200);
  assert.match(vendor.headers["content-type"], /javascript/);
  assert.equal(vendor.headers["cache-control"], IMMUTABLE);

  const geo = await get(`${BASE_PATH}/vendor/geo/countries-110m-2.0.2.json`);
  assert.equal(geo.headers["cache-control"], IMMUTABLE);

  const lic = await get(`${BASE_PATH}/vendor/LICENSES.md`);
  assert.equal(lic.status, 200);
  assert.equal(lic.headers["cache-control"], SHORT);
  assert.equal(lic.headers["content-type"], "text/markdown; charset=utf-8");
});

test("missing path under the basePath serves the 404 page with status 404", async () => {
  for (const p of [`${BASE_PATH}/no-such-page/`, `${BASE_PATH}/companies/not-a-company/`, `${BASE_PATH}/fonts/missing.woff2`]) {
    const res = await get(p);
    assert.equal(res.status, 404, p);
    assert.match(res.headers["content-type"], /text\/html/, p);
    assert.match(res.body, /FIXTURE-404/, p);
  }
  const head = await get(`${BASE_PATH}/no-such-page/`, "HEAD");
  assert.equal(head.status, 404);
  assert.equal(head.body, "");
});

test("outside the basePath: plain 404; root: redirect", async () => {
  const out = await get("/elsewhere/");
  assert.equal(out.status, 404);
  assert.match(out.headers["content-type"], /text\/plain/);
  const root302 = await get("/");
  assert.equal(root302.status, 302);
  assert.equal(root302.headers.location, `${BASE_PATH}/ko/`);
});
