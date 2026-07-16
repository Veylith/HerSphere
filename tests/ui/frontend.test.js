import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { requiredRoutes } from "../../apps/frontend/src/routes.js";

test("frontend declares every page required by the product brief", () => {
  const expected = [
    "/",
    "/about",
    "/features",
    "/login",
    "/forgot-password",
    "/verify-email",
    "/register",
    "/candidate-dashboard",
    "/recruiter-dashboard",
    "/admin-dashboard",
    "/jobs",
    "/internships",
    "/job/:id",
    "/company/:id",
    "/candidate-profile",
    "/resume-upload",
    "/resume-builder",
    "/career-dashboard",
    "/ai-analysis",
    "/learning-roadmap",
    "/company-reviews",
    "/notifications",
    "/settings",
    "/contact",
    "/privacy-policy",
    "/terms"
  ];

  assert.deepEqual(requiredRoutes, expected);
});

test("frontend shell includes accessibility and startup-product essentials", () => {
  const html = readFileSync("apps/frontend/index.html", "utf8");
  const app = readFileSync("apps/frontend/src/app.js", "utf8");
  const styles = readFileSync("apps/frontend/src/styles.css", "utf8");

  assert.match(html, /Skip to content/);
  assert.match(app, /Toggle theme/);
  assert.match(app, /Candidate Dashboard/);
  assert.match(app, /Forgot Password/);
  assert.match(app, /Email Verification/);
  assert.match(app, /Resume Builder/);
  assert.match(app, /AI Candidate Ranking/);
  assert.match(styles, /data-theme="dark"/);
  assert.match(styles, /@media \(max-width: 860px\)/);
});
