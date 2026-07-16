import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

function base64url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function fromBase64url(input) {
  const value = input.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(value, "base64").toString("utf8");
}

function sign(value, secret) {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

export function signToken(payload, secret, ttlSeconds) {
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64url(
    JSON.stringify({
      ...payload,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + ttlSeconds
    })
  );
  const signature = sign(`${header}.${body}`, secret);
  return `${header}.${body}.${signature}`;
}

export function verifyToken(token, secret) {
  const parts = String(token || "").split(".");
  if (parts.length !== 3) return null;
  const [header, body, signature] = parts;
  const expected = sign(`${header}.${body}`, secret);
  const sameLength = Buffer.byteLength(signature) === Buffer.byteLength(expected);
  if (!sameLength || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;

  const payload = JSON.parse(fromBase64url(body));
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
}

export function createCsrfToken(secret) {
  const nonce = randomBytes(20).toString("hex");
  const signature = sign(nonce, secret);
  return `${nonce}.${signature}`;
}

export function verifyCsrfToken(token, secret) {
  const [nonce, signature] = String(token || "").split(".");
  if (!nonce || !signature) return false;
  const expected = sign(nonce, secret);
  return (
    Buffer.byteLength(signature) === Buffer.byteLength(expected) &&
    timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  );
}
