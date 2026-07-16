import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, test } from "node:test";
import { createApp } from "../../apps/backend/src/server.js";

let app;
let baseUrl;
let csrfToken;
let candidateToken;
let recruiterToken;
let adminToken;
let tempDir;

async function request(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (!["GET", "HEAD"].includes(options.method || "GET")) headers["X-CSRF-Token"] = csrfToken;
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method || "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;
  return { response, body };
}

async function login(email) {
  const { response, body } = await request("/api/auth/login", {
    method: "POST",
    body: { email, password: "Password123!" }
  });
  assert.equal(response.status, 200);
  return body.token;
}

before(async () => {
  tempDir = mkdtempSync(join(tmpdir(), "hersphere-test-"));
  app = await createApp({
    env: {
      nodeEnv: "test",
      dataFile: join(tempDir, "store.json"),
      jwtSecret: "test-secret-for-api-suite",
      csrfSecret: "test-csrf-secret-for-api-suite",
      rateLimitMax: 1000
    },
    logger: { error() {}, info() {} }
  });
  await new Promise((resolve) => app.server.listen(0, resolve));
  baseUrl = `http://127.0.0.1:${app.server.address().port}`;
  csrfToken = (await request("/api/security/csrf")).body.csrfToken;
  candidateToken = await login("candidate@hersphere.test");
  recruiterToken = await login("recruiter@hersphere.test");
  adminToken = await login("admin@hersphere.test");
});

after(async () => {
  await new Promise((resolve) => app.server.close(resolve));
  rmSync(tempDir, { recursive: true, force: true });
});

test("candidate can view dashboard, analyze resume, and fetch AI analysis", async () => {
  const auth = { Authorization: `Bearer ${candidateToken}` };
  const dashboard = await request("/api/career/dashboard", { headers: auth });
  assert.equal(dashboard.response.status, 200);
  assert.ok(dashboard.body.readiness.overallCareerScore > 0);

  const resume = await request("/api/resume/analyze", {
    method: "POST",
    headers: auth,
    body: {
      resumeText:
        "Frontend Engineer with 3 years in React, JavaScript, Node.js, SQL, Accessibility. Project: Built a hiring dashboard. Certification: Meta Front-End Developer Professional Certificate."
    }
  });
  assert.equal(resume.response.status, 200);
  assert.ok(resume.body.analysis.skills.includes("React"));

  const ai = await request("/api/ai/analysis", { headers: auth });
  assert.equal(ai.response.status, 200);
  assert.ok(Array.isArray(ai.body.recommendations));
});

test("jobs, applications, company reviews, recruiter ranking, and admin actions work", async () => {
  const candidateAuth = { Authorization: `Bearer ${candidateToken}` };
  const recruiterAuth = { Authorization: `Bearer ${recruiterToken}` };
  const adminAuth = { Authorization: `Bearer ${adminToken}` };

  const jobs = await request("/api/jobs?type=internship");
  assert.equal(jobs.response.status, 200);
  assert.ok(jobs.body.opportunities.length >= 1);

  const target = jobs.body.opportunities[0];
  const apply = await request(`/api/jobs/${target.id}/apply`, {
    method: "POST",
    headers: candidateAuth,
    body: { coverNote: "I meet the requirements and would like to apply." }
  });
  assert.equal(apply.response.status, 201);

  const review = await request(`/api/companies/${target.companyId}/reviews`, {
    method: "POST",
    headers: candidateAuth,
    body: {
      title: "Thoughtful mentorship",
      comment: "Managers document safety practices, mentorship is visible, and work life balance is respected.",
      ratings: { workCulture: 4.5, safety: 4.8, mentorship: 4.4, careerGrowth: 4.2, workLifeBalance: 4.6 }
    }
  });
  assert.equal(review.response.status, 201);

  const applicants = await request(`/api/recruiter/listings/${target.id}/applicants`, { headers: recruiterAuth });
  assert.equal(applicants.response.status, 200);
  assert.ok(applicants.body.applicants.length >= 1);

  const admin = await request("/api/admin/dashboard", { headers: adminAuth });
  assert.equal(admin.response.status, 200);
  assert.ok(admin.body.metrics.users >= 3);
});

test("role-based authorization blocks candidate from admin routes", async () => {
  const denied = await request("/api/admin/dashboard", { headers: { Authorization: `Bearer ${candidateToken}` } });
  assert.equal(denied.response.status, 403);
});
