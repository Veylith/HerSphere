import { badRequest } from "../domain/errors.js";

export function requireFields(body, fields) {
  const missing = fields.filter((field) => body[field] === undefined || body[field] === null || body[field] === "");
  if (missing.length) {
    throw badRequest(`Missing required field${missing.length === 1 ? "" : "s"}: ${missing.join(", ")}`);
  }
}

export function assertEmail(email) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || ""))) {
    throw badRequest("A valid email address is required");
  }
}

export function assertPassword(password) {
  const value = String(password || "");
  if (value.length < 10 || !/[A-Z]/.test(value) || !/[a-z]/.test(value) || !/\d/.test(value)) {
    throw badRequest("Password must be at least 10 characters and include uppercase, lowercase, and a number");
  }
}

export function assertRole(role) {
  if (!["candidate", "recruiter", "admin"].includes(role)) {
    throw badRequest("Role must be candidate, recruiter, or admin");
  }
}

export function cleanString(value, max = 2000) {
  return String(value ?? "")
    .replace(/[<>]/g, "")
    .trim()
    .slice(0, max);
}

export function cleanList(values, maxItems = 20, maxLength = 80) {
  if (!Array.isArray(values)) return [];
  return values.map((value) => cleanString(value, maxLength)).filter(Boolean).slice(0, maxItems);
}
