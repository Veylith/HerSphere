import { dashboardByRole, navItems } from "./routes.js";

const app = document.querySelector("#app");
const topbar = document.querySelector("#topbar");
const toastRegion = document.querySelector("#toast-region");

const state = {
  user: null,
  profile: null,
  token: localStorage.getItem("hersphere.token"),
  csrfToken: null,
  theme: localStorage.getItem("hersphere.theme") || "light"
};

document.documentElement.dataset.theme = state.theme;

const demoAccounts = {
  candidate: ["candidate@hersphere.test", "Password123!"],
  recruiter: ["recruiter@hersphere.test", "Password123!"],
  admin: ["admin@hersphere.test", "Password123!"]
};

function e(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function path() {
  return location.hash.replace(/^#/, "") || "/";
}

function navigate(nextPath) {
  location.hash = nextPath;
}

function toast(message) {
  const node = document.createElement("div");
  node.className = "toast";
  node.textContent = message;
  toastRegion.append(node);
  setTimeout(() => node.remove(), 3600);
}

async function csrfToken() {
  if (state.csrfToken) return state.csrfToken;
  const response = await fetch("/api/security/csrf");
  const data = await response.json();
  state.csrfToken = data.csrfToken;
  return state.csrfToken;
}

async function api(endpoint, options = {}) {
  const method = options.method || "GET";
  const headers = { "Content-Type": "application/json" };
  if (state.token) headers.Authorization = `Bearer ${state.token}`;
  if (!["GET", "HEAD"].includes(method)) headers["X-CSRF-Token"] = await csrfToken();

  const response = await fetch(endpoint, {
    method,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await response.json() : {};

  if (!response.ok) {
    if (response.status === 401) logout(false);
    throw new Error(data.error?.message || "Request failed");
  }
  return data;
}

function setSession(payload) {
  state.user = payload.user;
  state.profile = payload.profile;
  state.token = payload.token || state.token;
  if (payload.token) localStorage.setItem("hersphere.token", payload.token);
  renderTopbar();
}

function logout(showToast = true) {
  state.user = null;
  state.profile = null;
  state.token = null;
  localStorage.removeItem("hersphere.token");
  renderTopbar();
  if (showToast) toast("Signed out");
  navigate("/");
}

async function hydrate() {
  if (!state.token) {
    renderTopbar();
    return;
  }
  try {
    const payload = await api("/api/auth/me");
    setSession(payload);
  } catch {
    logout(false);
  }
}

function renderTopbar() {
  const dashboardPath = state.user ? dashboardByRole[state.user.role] : "/login";
  topbar.innerHTML = `
    <nav class="nav" aria-label="Primary navigation">
      <a class="brand" href="#/">
        <span class="brand-mark" aria-hidden="true">H</span>
        <span>HerSphere</span>
      </a>
      <div class="nav-links">
        ${navItems
          .map(
            (item) =>
              `<a class="nav-link ${path() === item.path ? "active" : ""}" href="#${item.path}">${e(item.label)}</a>`
          )
          .join("")}
        <a class="nav-link ${path() === dashboardPath ? "active" : ""}" href="#${dashboardPath}">Dashboard</a>
      </div>
      <div class="nav-actions">
        <button class="icon-button" type="button" data-action="theme" aria-label="Toggle theme" title="Toggle theme">${
          state.theme === "dark" ? "L" : "D"
        }</button>
        ${
          state.user
            ? `<span class="status info">${e(state.user.role)}</span><button class="button ghost" data-action="logout" type="button">Sign out</button>`
            : `<a class="button ghost" href="#/login">Login</a><a class="button primary" href="#/register">Register</a>`
        }
      </div>
    </nav>
  `;
}

function page(content) {
  app.innerHTML = content;
  app.focus({ preventScroll: true });
  renderTopbar();
}

function loading(title = "Loading") {
  page(`<section class="page"><div class="empty">${e(title)}...</div></section>`);
}

function requireRole(role) {
  if (!state.user) {
    toast("Please log in to continue");
    navigate("/login");
    return false;
  }
  if (role && state.user.role !== role) {
    toast("This area is not available for your role");
    navigate(dashboardByRole[state.user.role] || "/");
    return false;
  }
  return true;
}

function listTags(values = []) {
  return `<div class="tag-row">${values.map((value) => `<span class="tag">${e(value)}</span>`).join("")}</div>`;
}

function progress(label, value) {
  const score = Math.max(0, Math.min(100, Number(value) || 0));
  return `
    <div class="kpi-row">
      <strong>${e(label)}</strong>
      <div class="progress" aria-label="${e(label)} ${score}%"><span style="width:${score}%"></span></div>
      <span>${score}</span>
    </div>
  `;
}

function opportunityCard(opportunity, options = {}) {
  const match = opportunity.match || {};
  return `
    <article class="card">
      <div class="section-header">
        <div>
          <span class="status ${opportunity.type === "internship" ? "warn" : "info"}">${e(opportunity.type)}</span>
          <h3 style="margin-top:10px">${e(opportunity.title)}</h3>
          <p>${e(opportunity.company?.name || "Company")}  -  ${e(opportunity.location)}  -  ${e(opportunity.remote)}</p>
        </div>
        ${match.eligibilityScore ? `<div class="metric-value">${match.eligibilityScore}</div>` : ""}
      </div>
      <p>${e(opportunity.description)}</p>
      ${listTags(opportunity.requiredSkills || [])}
      <div class="form-actions" style="margin-top:16px">
        <a class="button" href="#/job/${e(opportunity.id)}">Details</a>
        <a class="button ghost" href="#/company/${e(opportunity.companyId)}">Company</a>
        ${
          state.user?.role === "candidate"
            ? `<button class="button" type="button" data-action="bookmark" data-id="${e(opportunity.id)}">Bookmark</button>
               <button class="button primary" type="button" data-action="apply" data-id="${e(opportunity.id)}">Apply</button>`
            : ""
        }
        ${options.showApplicants ? `<a class="button" href="#/recruiter-dashboard?listing=${e(opportunity.id)}">Applicants</a>` : ""}
      </div>
    </article>
  `;
}

function serialize(form) {
  const data = Object.fromEntries(new FormData(form));
  const listFields = [
    "skills",
    "interests",
    "education",
    "projects",
    "certifications",
    "achievements",
    "portfolioLinks",
    "requiredSkills",
    "niceToHaveSkills",
    "projectSignals",
    "preferredCertifications"
  ];
  for (const field of listFields) {
    if (field in data) {
      data[field] = String(data[field])
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }
  return data;
}

async function renderLanding() {
  const jobs = await api("/api/jobs").catch(() => ({ opportunities: [] }));
  const companies = await api("/api/companies").catch(() => ({ companies: [] }));
  page(`
    <section class="hero">
      <div class="hero-content">
        <div class="hero-copy">
          <div class="eyebrow">AI career companion for women</div>
          <h1>HerSphere</h1>
          <p class="lead">Jobs, internships, resume intelligence, company trust signals, and learning roadmaps in one focused platform.</p>
          <div class="hero-actions">
            <a class="button primary" href="#/register">Create account</a>
            <a class="button" href="#/jobs">Explore jobs</a>
            <button class="button ghost" type="button" data-action="demo-login" data-role="candidate">Try candidate demo</button>
          </div>
        </div>
      </div>
    </section>
    <section class="page">
      <div class="hero-strip">
        <div class="metric"><div class="metric-value">${jobs.opportunities.length}</div><p>active roles</p></div>
        <div class="metric"><div class="metric-value">${companies.companies.length}</div><p>company profiles</p></div>
        <div class="metric"><div class="metric-value">6</div><p>practical AI modules</p></div>
        <div class="metric"><div class="metric-value">3</div><p>role dashboards</p></div>
      </div>
      ${featureBand()}
      ${footerLinks()}
    </section>
  `);
}

function featureBand() {
  const features = [
    ["Resume Intelligence", "Extract skills, education, experience, projects, certifications, and achievements."],
    ["Eligibility Scoring", "Compare candidate profiles with job descriptions and explain readiness."],
    ["Skill Gap Roadmaps", "Convert missing skills into courses, projects, certifications, hackathons, and internships."],
    ["Company Trust", "Summarize verified women-focused reviews across safety, mentorship, growth, and balance."],
    ["Recruiter Ranking", "Rank applicants with transparent skill and readiness signals."],
    ["Admin Governance", "Moderate reviews, approve recruiters, verify companies, and monitor platform health."]
  ];
  return `
    <section class="section">
      <div class="section-header">
        <div>
          <div class="eyebrow">Platform</div>
          <h2>Everything career success needs, connected</h2>
        </div>
        <a class="button" href="#/features">View features</a>
      </div>
      <div class="grid three">
        ${features.map(([title, body]) => `<article class="card"><h3>${e(title)}</h3><p>${e(body)}</p></article>`).join("")}
      </div>
    </section>
  `;
}

function footerLinks() {
  return `
    <footer class="footer-links">
      <a href="#/about">About</a>
      <a href="#/contact">Contact</a>
      <a href="#/privacy-policy">Privacy Policy</a>
      <a href="#/terms">Terms</a>
    </footer>
  `;
}

function renderStatic(kind) {
  const copy = {
    about: [
      "About HerSphere",
      "HerSphere brings fragmented career actions into one intelligent workspace for women candidates, recruiters, and administrators."
    ],
    features: [
      "Feature Suite",
      "The platform combines candidate growth tools, recruiter hiring operations, company review intelligence, and admin governance."
    ],
    contact: [
      "Contact",
      "Email founders@hersphere.example for partnerships, recruiter onboarding, platform support, and investor conversations."
    ],
    privacy: [
      "Privacy Policy",
      "HerSphere stores profile, resume, application, and review data only for career workflows. Sensitive actions are protected with role checks, signed tokens, CSRF validation, input validation, and audit logs."
    ],
    terms: [
      "Terms",
      "Users agree to provide accurate career and hiring information, submit respectful reviews, and follow verified recruitment practices."
    ]
  }[kind];

  page(`
    <section class="page">
      <div class="section-header">
        <div>
          <div class="eyebrow">HerSphere</div>
          <h1 style="font-size:clamp(2rem,4vw,3.5rem);max-width:none">${e(copy[0])}</h1>
        </div>
      </div>
      <p class="lead">${e(copy[1])}</p>
      ${kind === "features" ? featureBand() : ""}
      ${footerLinks()}
    </section>
  `);
}

function renderLogin() {
  page(`
    <section class="page auth-shell">
      <article class="card auth-card">
        <div class="section-header">
          <div>
            <div class="eyebrow">Welcome back</div>
            <h2>Login</h2>
          </div>
        </div>
        <form id="login-form" class="form-grid">
          <label>Email<input name="email" type="email" required value="candidate@hersphere.test" autocomplete="email" /></label>
          <label>Password<input name="password" type="password" required value="Password123!" autocomplete="current-password" /></label>
          <button class="button primary" type="submit">Login</button>
        </form>
        <div class="chip-row" style="margin-top:16px">
          <button class="demo-chip" type="button" data-action="demo-login" data-role="candidate">Candidate demo</button>
          <button class="demo-chip" type="button" data-action="demo-login" data-role="recruiter">Recruiter demo</button>
          <button class="demo-chip" type="button" data-action="demo-login" data-role="admin">Admin demo</button>
        </div>
        <p><a href="#/forgot-password">Forgot password?</a> <span aria-hidden="true">-</span> <a href="#/verify-email">Verify email</a></p>
        <p><a href="#/register">Create a new account</a></p>
      </article>
    </section>
  `);
  document.querySelector("#login-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      const payload = await api("/api/auth/login", { method: "POST", body: serialize(event.currentTarget) });
      setSession(payload);
      toast("Logged in");
      navigate(dashboardByRole[payload.user.role]);
    } catch (error) {
      toast(error.message);
    }
  });
}

function renderForgotPassword() {
  page(`
    <section class="page auth-shell">
      <article class="card auth-card">
        <div class="section-header">
          <div>
            <div class="eyebrow">Account recovery</div>
            <h2>Forgot Password</h2>
          </div>
        </div>
        <form id="forgot-form" class="form-grid">
          <label>Email<input name="email" type="email" required value="candidate@hersphere.test" autocomplete="email" /></label>
          <button class="button primary" type="submit">Send reset link</button>
        </form>
        <p><a href="#/login">Back to login</a></p>
      </article>
    </section>
  `);
  document.querySelector("#forgot-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      const payload = await api("/api/auth/forgot-password", { method: "POST", body: serialize(event.currentTarget) });
      toast(payload.message || "Reset instructions sent");
    } catch (error) {
      toast(error.message);
    }
  });
}

function renderVerifyEmail() {
  page(`
    <section class="page auth-shell">
      <article class="card auth-card">
        <div class="section-header">
          <div>
            <div class="eyebrow">Account security</div>
            <h2>Email Verification</h2>
          </div>
        </div>
        <form id="verify-email-form" class="form-grid">
          <label>Email<input name="email" type="email" required autocomplete="email" /></label>
          <label>Verification token<input name="token" required autocomplete="one-time-code" /></label>
          <button class="button primary" type="submit">Verify email</button>
        </form>
        <p><a href="#/login">Back to login</a></p>
      </article>
    </section>
  `);
  document.querySelector("#verify-email-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      await api("/api/auth/verify-email", { method: "POST", body: serialize(event.currentTarget) });
      toast("Email verified");
      navigate("/login");
    } catch (error) {
      toast(error.message);
    }
  });
}

function renderRegister() {
  page(`
    <section class="page auth-shell">
      <article class="card auth-card">
        <div class="section-header">
          <div>
            <div class="eyebrow">Join HerSphere</div>
            <h2>Register</h2>
          </div>
        </div>
        <form id="register-form" class="form-grid">
          <div class="form-grid two">
            <label>Name<input name="name" required value="Nisha Verma" /></label>
            <label>Email<input name="email" type="email" required value="nisha@example.test" /></label>
          </div>
          <div class="form-grid two">
            <label>Password<input name="password" type="password" required value="Password123!" /></label>
            <label>Role<select name="role"><option value="candidate">Candidate</option><option value="recruiter">Recruiter</option></select></label>
          </div>
          <label>Company name<input name="companyName" value="Aster Labs" /></label>
          <label>Skills or interests<input name="skills" value="React, SQL, Product Management" /></label>
          <button class="button primary" type="submit">Create account</button>
        </form>
      </article>
    </section>
  `);
  document.querySelector("#register-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      const body = serialize(event.currentTarget);
      body.interests = body.skills || [];
      const payload = await api("/api/auth/register", { method: "POST", body });
      setSession(payload);
      toast("Account created");
      navigate(dashboardByRole[payload.user.role]);
    } catch (error) {
      toast(error.message);
    }
  });
}

async function renderCandidateDashboard() {
  if (!requireRole("candidate")) return;
  loading("Loading candidate dashboard");
  const data = await api("/api/career/dashboard");
  const readiness = data.readiness;
  page(`
    <section class="page">
        <div class="section-header">
          <div>
            <div class="eyebrow">Candidate Dashboard</div>
            <h2>${e(data.profile.headline)}</h2>
            <p>${e(data.profile.location)}  -  Goal: ${e(data.profile.careerGoal)}</p>
          </div>
        <div class="form-actions">
          <a class="button" href="#/resume-builder">Build resume</a>
          <a class="button primary" href="#/resume-upload">Analyze resume</a>
        </div>
        </div>
      <div class="grid four">
        <div class="metric"><div class="metric-value">${readiness.profileStrength}</div><p>profile strength</p></div>
        <div class="metric"><div class="metric-value">${readiness.overallCareerScore}</div><p>career score</p></div>
        <div class="metric"><div class="metric-value">${data.applications.length}</div><p>applications</p></div>
        <div class="metric"><div class="metric-value">${data.bookmarks.length}</div><p>bookmarks</p></div>
      </div>
      <div class="split section">
        <article class="card">
          <h3>Career Readiness</h3>
          <div class="kpi-list" style="margin-top:16px">
            ${progress("Resume", readiness.resumeScore)}
            ${progress("Technical", readiness.technicalScore)}
            ${progress("Interview", readiness.interviewReadiness)}
            ${progress("Overall", readiness.overallCareerScore)}
          </div>
        </article>
        <article class="card">
          <h3>Recommended Roles</h3>
          <div class="grid" style="margin-top:14px">
            ${data.recommendations.map((opportunity) => opportunityCard(opportunity)).join("") || `<div class="empty">No recommendations yet.</div>`}
          </div>
        </article>
      </div>
      <section class="section">
        <div class="section-header"><h2>Application Tracker</h2><a class="button" href="#/jobs">Find more roles</a></div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Role</th><th>Company</th><th>Status</th><th>Applied</th></tr></thead>
            <tbody>
              ${
                data.applications
                  .map(
                    (application) => `<tr><td>${e(application.opportunity?.title)}</td><td>${e(
                      application.opportunity?.company?.name
                    )}</td><td><span class="status info">${e(application.status)}</span></td><td>${e(
                      new Date(application.createdAt).toLocaleDateString()
                    )}</td></tr>`
                  )
                  .join("") || `<tr><td colspan="4">No applications yet.</td></tr>`
              }
            </tbody>
          </table>
        </div>
      </section>
    </section>
  `);
}

async function renderJobs(type = "") {
  const title = type === "internship" ? "Internships" : "Jobs";
  loading(`Loading ${title.toLowerCase()}`);
  const data = await api(`/api/jobs${type ? `?type=${type}` : ""}`);
  page(`
    <section class="page">
      <div class="section-header">
        <div>
          <div class="eyebrow">Search</div>
          <h2>${title}</h2>
        </div>
        <form id="job-filter" class="toolbar">
          <input name="search" placeholder="Search title, company, skill" aria-label="Search" />
          <input name="location" placeholder="Location" aria-label="Location" />
          <button class="button" type="submit">Filter</button>
        </form>
      </div>
      <div id="opportunity-list" class="grid two">
        ${data.opportunities.map((opportunity) => opportunityCard(opportunity)).join("") || `<div class="empty">No listings found.</div>`}
      </div>
    </section>
  `);
  document.querySelector("#job-filter").addEventListener("submit", async (event) => {
    event.preventDefault();
    const filters = serialize(event.currentTarget);
    const query = new URLSearchParams({ ...filters, ...(type ? { type } : {}) }).toString();
    const next = await api(`/api/jobs?${query}`);
    document.querySelector("#opportunity-list").innerHTML =
      next.opportunities.map((opportunity) => opportunityCard(opportunity)).join("") || `<div class="empty">No listings found.</div>`;
  });
}

async function renderJobDetails(id) {
  loading("Loading opportunity");
  const data = await api(`/api/jobs/${id}`);
  const opportunity = data.opportunity;
  page(`
    <section class="page">
      <div class="split">
        <article class="card">
          <span class="status info">${e(opportunity.type)}</span>
          <h2 style="margin-top:12px">${e(opportunity.title)}</h2>
          <p>${e(opportunity.company?.name)}  -  ${e(opportunity.location)}  -  ${e(opportunity.employmentType)}  -  ${e(opportunity.salaryRange)}</p>
          <p>${e(opportunity.description)}</p>
          ${listTags(opportunity.requiredSkills)}
          <div class="form-actions" style="margin-top:18px">
            ${
              state.user?.role === "candidate"
                ? `<button class="button" data-action="bookmark" data-id="${e(opportunity.id)}">Bookmark</button>
                   <button class="button primary" data-action="apply" data-id="${e(opportunity.id)}">Apply</button>`
                : `<a class="button primary" href="#/login">Login to apply</a>`
            }
            <a class="button" href="#/company/${e(opportunity.companyId)}">Company profile</a>
          </div>
        </article>
        <aside class="card">
          <h3>Eligibility Analysis</h3>
          ${
            data.eligibility
              ? `<div class="metric-value">${data.eligibility.eligibilityScore}</div>
                 <p>Confidence ${data.eligibility.confidenceScore}</p>
                 <div class="kpi-list">${data.eligibility.reasoning.map((reason) => `<p>${e(reason)}</p>`).join("")}</div>
                 <h3>Skill Gap</h3>${listTags(data.skillGap?.missingSkills || [])}`
              : `<p>Candidate eligibility appears after login.</p>`
          }
        </aside>
      </div>
    </section>
  `);
}

async function renderProfile() {
  if (!requireRole("candidate")) return;
  const { profile } = await api("/api/candidate/profile");
  page(`
    <section class="page">
      <div class="section-header">
        <div>
          <div class="eyebrow">Candidate Profile</div>
          <h2>${e(state.user.name)}</h2>
        </div>
      </div>
      <form id="profile-form" class="card form-grid">
        <div class="form-grid two">
          <label>Headline<input name="headline" value="${e(profile.headline)}" /></label>
          <label>Location<input name="location" value="${e(profile.location)}" /></label>
        </div>
        <label>Career goal<input name="careerGoal" value="${e(profile.careerGoal)}" /></label>
        <label>Skills<input name="skills" value="${e(profile.skills.join(", "))}" /></label>
        <label>Education<input name="education" value="${e(profile.education.join(", "))}" /></label>
        <label>Projects<textarea name="projects">${e(profile.projects.join(", "))}</textarea></label>
        <label>Certifications<input name="certifications" value="${e(profile.certifications.join(", "))}" /></label>
        <label>Portfolio links<input name="portfolioLinks" value="${e(profile.portfolioLinks.join(", "))}" /></label>
        <button class="button primary" type="submit">Save profile</button>
      </form>
    </section>
  `);
  document.querySelector("#profile-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      const payload = await api("/api/candidate/profile", { method: "PUT", body: serialize(event.currentTarget) });
      state.profile = payload.profile;
      toast("Profile saved");
    } catch (error) {
      toast(error.message);
    }
  });
}

function resumeDocument(profile) {
  const user = state.user || {};
  return [
    user.name || "Candidate",
    `${profile.headline || "Career professional"} | ${profile.location || "Location"}`,
    profile.portfolioLinks?.length ? `Portfolio: ${profile.portfolioLinks.join(" | ")}` : "",
    "",
    "CAREER GOAL",
    profile.careerGoal || "Add a focused career goal in your profile.",
    "",
    "SKILLS",
    profile.skills?.join(", ") || "Add skills in your profile.",
    "",
    "EXPERIENCE",
    profile.experience?.length
      ? profile.experience.map((item) => `${item.title || "Role"} - ${item.company || "Company"} (${item.years || 0} years)\n${item.summary || ""}`).join("\n\n")
      : "Add experience in your profile.",
    "",
    "PROJECTS",
    profile.projects?.length ? profile.projects.map((item) => `- ${item}`).join("\n") : "Add projects in your profile.",
    "",
    "EDUCATION",
    profile.education?.length ? profile.education.map((item) => `- ${item}`).join("\n") : "Add education in your profile.",
    "",
    "CERTIFICATIONS",
    profile.certifications?.length ? profile.certifications.map((item) => `- ${item}`).join("\n") : "Add certifications in your profile.",
    "",
    "ACHIEVEMENTS",
    profile.achievements?.length ? profile.achievements.map((item) => `- ${item}`).join("\n") : "Add achievements in your profile."
  ]
    .filter((line, index, lines) => line !== "" || lines[index - 1] !== "")
    .join("\n");
}

async function renderResumeBuilder() {
  if (!requireRole("candidate")) return;
  const { profile } = await api("/api/candidate/profile");
  const resume = resumeDocument(profile);
  page(`
    <section class="page">
      <div class="section-header">
        <div>
          <div class="eyebrow">Resume Builder</div>
          <h2>Role-ready resume draft</h2>
        </div>
        <a class="button" href="#/candidate-profile">Edit profile</a>
      </div>
      <div class="split">
        <article class="card">
          <h3>Profile signals</h3>
          <div class="kpi-list" style="margin-top:16px">
            ${progress("Skills", Math.min(100, (profile.skills?.length || 0) * 12))}
            ${progress("Projects", Math.min(100, (profile.projects?.length || 0) * 24))}
            ${progress("Certifications", Math.min(100, (profile.certifications?.length || 0) * 30))}
            ${progress("Portfolio", profile.portfolioLinks?.length ? 100 : 20)}
          </div>
        </article>
        <form id="resume-builder-form" class="card form-grid">
          <label>Generated resume<textarea name="resumeText" rows="18">${e(resume)}</textarea></label>
          <div class="form-actions">
            <button class="button" type="button" data-action="copy-resume">Copy resume</button>
            <button class="button primary" type="submit">Analyze this resume</button>
          </div>
        </form>
      </div>
    </section>
  `);
  document.querySelector("#resume-builder-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      await api("/api/resume/analyze", { method: "POST", body: serialize(event.currentTarget) });
      toast("Resume analyzed and saved to profile");
      navigate("/ai-analysis");
    } catch (error) {
      toast(error.message);
    }
  });
}

async function renderResumeUpload() {
  if (!requireRole("candidate")) return;
  const sample = state.profile?.resumeText || "";
  page(`
    <section class="page">
      <div class="section-header">
        <div>
          <div class="eyebrow">Resume Upload</div>
          <h2>Resume Analysis</h2>
        </div>
      </div>
      <div class="split">
        <form id="resume-form" class="card form-grid">
          <label>Resume text<textarea name="resumeText" required>${e(sample)}</textarea></label>
          <button class="button primary" type="submit">Analyze resume</button>
        </form>
        <article class="card" id="resume-result">
          <h3>Extracted profile</h3>
          <p>Analysis results will appear here.</p>
        </article>
      </div>
    </section>
  `);
  document.querySelector("#resume-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      const payload = await api("/api/resume/analyze", { method: "POST", body: serialize(event.currentTarget) });
      const analysis = payload.analysis;
      document.querySelector("#resume-result").innerHTML = `
        <h3>Resume score ${analysis.resumeScore}</h3>
        <p>Confidence ${Math.round(analysis.confidence * 100)}%</p>
        <h3>Skills</h3>${listTags(analysis.skills)}
        <h3>Education</h3><p>${e(analysis.education.join("; ") || "No education detected.")}</p>
        <h3>Projects</h3><p>${e(analysis.projects.join("; ") || "No projects detected.")}</p>
        <h3>Certifications</h3><p>${e(analysis.certifications.join("; ") || "No certifications detected.")}</p>
      `;
      toast("Resume analyzed and profile updated");
    } catch (error) {
      toast(error.message);
    }
  });
}

async function renderAiAnalysis() {
  if (!requireRole("candidate")) return;
  loading("Loading AI analysis");
  const data = await api("/api/ai/analysis");
  page(`
    <section class="page">
      <div class="section-header">
        <div>
          <div class="eyebrow">AI Analysis</div>
          <h2>Career readiness and recommendations</h2>
        </div>
      </div>
      <div class="grid four">
        <div class="metric"><div class="metric-value">${data.readiness.resumeScore}</div><p>resume score</p></div>
        <div class="metric"><div class="metric-value">${data.readiness.technicalScore}</div><p>technical score</p></div>
        <div class="metric"><div class="metric-value">${data.readiness.interviewReadiness}</div><p>interview readiness</p></div>
        <div class="metric"><div class="metric-value">${data.readiness.overallCareerScore}</div><p>overall score</p></div>
      </div>
      <div class="split section">
        <article class="card">
          <h3>Resume extraction</h3>
          ${listTags(data.resume.skills)}
          <p>${e(data.resume.projects.join("; ") || "Add more project evidence to improve recommendations.")}</p>
        </article>
        <article class="card">
          <h3>Current skill gap</h3>
          ${listTags(data.skillGap?.missingSkills || [])}
          <p>${e((data.eligibility?.reasoning || []).join(" "))}</p>
        </article>
      </div>
      <section class="section">
        <h2>Smart recommendations</h2>
        <div class="grid two" style="margin-top:16px">${data.recommendations.map((opportunity) => opportunityCard(opportunity)).join("")}</div>
      </section>
    </section>
  `);
}

async function renderRoadmap() {
  if (!requireRole("candidate")) return;
  loading("Loading roadmap");
  const data = await api("/api/learning-roadmap");
  page(`
    <section class="page">
      <div class="section-header">
        <div>
          <div class="eyebrow">Learning Roadmap</div>
          <h2>${e(data.roadmap.careerGoal)}</h2>
          <p>${data.target ? `Target role: ${e(data.target.title)}` : ""}</p>
        </div>
      </div>
      <div class="timeline">
        ${
          data.roadmap.modules
            .map(
              (module) => `<article class="card timeline-item">
                <h3>${e(module.focus)}</h3>
                <p>${e(module.durationWeeks)} weeks  -  ${e(module.course)}</p>
                <p><strong>Project:</strong> ${e(module.project)}</p>
                <p><strong>Certification:</strong> ${e(module.certification)}</p>
              </article>`
            )
            .join("") || `<div class="empty">Your current profile already covers the target basics.</div>`
        }
      </div>
      <section class="section grid two">
        <article class="card"><h3>Hackathons</h3>${listTags(data.roadmap.hackathons)}</article>
        <article class="card"><h3>Internships</h3>${listTags(data.roadmap.internships)}</article>
      </section>
    </section>
  `);
}

async function renderCompanyReviews() {
  loading("Loading company reviews");
  const data = await api("/api/companies");
  page(`
    <section class="page">
      <div class="section-header">
        <div>
          <div class="eyebrow">Company Reviews</div>
          <h2>Trust signals for women at work</h2>
        </div>
      </div>
      <div class="grid two">
        ${data.companies
          .map(
            (company) => `<article class="card">
              <div class="section-header">
                <div><h3>${e(company.name)}</h3><p>${e(company.industry)}  -  ${e(company.location)}</p></div>
                <div class="metric-value">${company.reviewIntelligence.trustScore}</div>
              </div>
              <p>${e(company.description)}</p>
              <div class="kpi-list">
                ${progress("Culture", Math.round((company.reviewIntelligence.dimensions.workCulture / 5) * 100))}
                ${progress("Safety", Math.round((company.reviewIntelligence.dimensions.safety / 5) * 100))}
                ${progress("Growth", Math.round((company.reviewIntelligence.dimensions.careerGrowth / 5) * 100))}
              </div>
              <div class="form-actions" style="margin-top:14px"><a class="button" href="#/company/${e(company.id)}">View profile</a></div>
            </article>`
          )
          .join("")}
      </div>
    </section>
  `);
}

async function renderCompany(id) {
  loading("Loading company profile");
  const data = await api(`/api/companies/${id}`);
  const reviewData = await api(`/api/companies/${id}/reviews`);
  page(`
    <section class="page">
      <div class="section-header">
        <div>
          <div class="eyebrow">${e(data.company.verificationStatus)}</div>
          <h2>${e(data.company.name)}</h2>
          <p>${e(data.company.industry)}  -  ${e(data.company.location)}  -  ${e(data.company.size)}</p>
        </div>
        <div class="metric-value">${data.reviewIntelligence.trustScore}</div>
      </div>
      <div class="split">
        <article class="card">
          <p>${e(data.company.description)}</p>
          <h3>Review Intelligence</h3>
          <p><strong>Culture:</strong> ${e(data.reviewIntelligence.summary.workCulture)}</p>
          <p><strong>Safety:</strong> ${e(data.reviewIntelligence.summary.safety)}</p>
          <p><strong>Mentorship:</strong> ${e(data.reviewIntelligence.summary.mentorship)}</p>
          <p><strong>Growth:</strong> ${e(data.reviewIntelligence.summary.careerGrowth)}</p>
        </article>
        <article class="card">
          <h3>Open roles</h3>
          <div class="grid">${data.opportunities.map((opportunity) => opportunityCard(opportunity)).join("") || `<div class="empty">No active roles.</div>`}</div>
        </article>
      </div>
      <section class="section split">
        <article class="card">
          <h3>Reviews</h3>
          ${
            reviewData.reviews
              .map((review) => `<article class="panel" style="margin-top:12px"><h3>${e(review.title)}</h3><p>${e(review.comment)}</p></article>`)
              .join("") || `<div class="empty">No reviews yet.</div>`
          }
        </article>
        ${
          state.user?.role === "candidate"
            ? `<form id="review-form" class="card form-grid">
                <h3>Submit review</h3>
                <label>Title<input name="title" required /></label>
                <label>Comment<textarea name="comment" required></textarea></label>
                <div class="form-grid two">
                  <label>Culture<input name="workCulture" type="number" min="1" max="5" step="0.1" value="4" /></label>
                  <label>Safety<input name="safety" type="number" min="1" max="5" step="0.1" value="4" /></label>
                  <label>Mentorship<input name="mentorship" type="number" min="1" max="5" step="0.1" value="4" /></label>
                  <label>Growth<input name="careerGrowth" type="number" min="1" max="5" step="0.1" value="4" /></label>
                  <label>Balance<input name="workLifeBalance" type="number" min="1" max="5" step="0.1" value="4" /></label>
                </div>
                <button class="button primary" type="submit">Submit review</button>
              </form>`
            : `<article class="card"><p>Login as a candidate to submit a verified review.</p></article>`
        }
      </section>
    </section>
  `);
  const form = document.querySelector("#review-form");
  if (form) {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const body = serialize(event.currentTarget);
      body.ratings = {
        workCulture: Number(body.workCulture),
        safety: Number(body.safety),
        mentorship: Number(body.mentorship),
        careerGrowth: Number(body.careerGrowth),
        workLifeBalance: Number(body.workLifeBalance)
      };
      try {
        await api(`/api/companies/${id}/reviews`, { method: "POST", body });
        toast("Review submitted");
        renderCompany(id);
      } catch (error) {
        toast(error.message);
      }
    });
  }
}

async function renderRecruiterDashboard() {
  if (!requireRole("recruiter")) return;
  loading("Loading recruiter dashboard");
  const data = await api("/api/recruiter/dashboard");
  const selected = new URLSearchParams(path().split("?")[1] || "").get("listing") || data.listings[0]?.id;
  const applicants = selected ? await api(`/api/recruiter/listings/${selected}/applicants`).catch(() => ({ applicants: [] })) : { applicants: [] };
  page(`
    <section class="page">
      <div class="section-header">
        <div>
          <div class="eyebrow">Recruiter Dashboard</div>
          <h2>${e(data.company?.name || "Company")}</h2>
        </div>
      </div>
      <div class="grid four">
        <div class="metric"><div class="metric-value">${data.analytics.activeListings}</div><p>active listings</p></div>
        <div class="metric"><div class="metric-value">${data.analytics.applications}</div><p>applications</p></div>
        <div class="metric"><div class="metric-value">${data.analytics.shortlisted}</div><p>shortlisted</p></div>
        <div class="metric"><div class="metric-value">${data.analytics.interviews}</div><p>interviews</p></div>
      </div>
      <div class="split section">
        <form id="listing-form" class="card form-grid">
          <h3>Post job or internship</h3>
          <div class="form-grid two">
            <label>Title<input name="title" required value="Backend Platform Engineer" /></label>
            <label>Type<select name="type"><option value="job">Job</option><option value="internship">Internship</option></select></label>
          </div>
          <div class="form-grid two">
            <label>Location<input name="location" value="Bengaluru" /></label>
            <label>Remote<select name="remote"><option>hybrid</option><option>remote</option><option>onsite</option></select></label>
          </div>
          <label>Description<textarea name="description">Build secure APIs, dashboards, and hiring intelligence workflows.</textarea></label>
          <label>Required skills<input name="requiredSkills" value="Node.js, SQL, Docker, JWT" /></label>
          <label>Nice-to-have skills<input name="niceToHaveSkills" value="React, Product Management" /></label>
          <button class="button primary" type="submit">Publish listing</button>
        </form>
        <article class="card">
          <h3>AI Candidate Ranking</h3>
          <div class="grid">
            ${
              applicants.applicants
                .map(
                  (candidate) => `<article class="panel">
                    <div class="section-header">
                      <div><h3>${e(candidate.user.name)}</h3><p>${e(candidate.profile.headline)}</p></div>
                      <div class="metric-value">${candidate.rankingScore}</div>
                    </div>
                    ${listTags(candidate.eligibility.matchedRequired)}
                    <div class="form-actions" style="margin-top:12px">
                      <button class="button" data-action="application-status" data-id="${e(candidate.application.id)}" data-status="shortlisted">Shortlist</button>
                      <button class="button primary" data-action="application-status" data-id="${e(candidate.application.id)}" data-status="interview">Interview</button>
                    </div>
                  </article>`
                )
                .join("") || `<div class="empty">No applicants yet.</div>`
            }
          </div>
        </article>
      </div>
      <section class="section">
        <div class="section-header"><h2>Listings</h2></div>
        <div class="grid two">${data.listings.map((opportunity) => opportunityCard(opportunity, { showApplicants: true })).join("")}</div>
      </section>
    </section>
  `);
  document.querySelector("#listing-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      await api("/api/recruiter/listings", { method: "POST", body: serialize(event.currentTarget) });
      toast("Listing published");
      renderRecruiterDashboard();
    } catch (error) {
      toast(error.message);
    }
  });
}

async function renderAdminDashboard() {
  if (!requireRole("admin")) return;
  loading("Loading admin dashboard");
  const data = await api("/api/admin/dashboard");
  const users = await api("/api/admin/users");
  page(`
    <section class="page">
      <div class="section-header">
        <div>
          <div class="eyebrow">Admin Dashboard</div>
          <h2>Platform governance</h2>
        </div>
      </div>
      <div class="grid four">
        ${Object.entries(data.metrics)
          .map(([key, value]) => `<div class="metric"><div class="metric-value">${e(value)}</div><p>${e(key)}</p></div>`)
          .join("")}
      </div>
      <div class="split section">
        <article class="card">
          <h3>Company verification</h3>
          ${
            data.pendingCompanies
              .map(
                (company) => `<article class="panel" style="margin-top:12px">
                  <h3>${e(company.name)}</h3><p>${e(company.description)}</p>
                  <button class="button primary" data-action="verify-company" data-id="${e(company.id)}">Verify company</button>
                </article>`
              )
              .join("") || `<div class="empty">No pending companies.</div>`
          }
        </article>
        <article class="card">
          <h3>Review moderation</h3>
          ${
            data.flaggedReviews
              .map(
                (review) => `<article class="panel" style="margin-top:12px">
                  <h3>${e(review.title)}</h3><p>${e(review.comment)}</p>
                  <button class="button" data-action="moderate-review" data-id="${e(review.id)}" data-status="published">Publish</button>
                  <button class="button danger" data-action="moderate-review" data-id="${e(review.id)}" data-status="removed">Remove</button>
                </article>`
              )
              .join("") || `<div class="empty">No flagged reviews.</div>`
          }
        </article>
      </div>
      <section class="section">
        <h2>Users</h2>
        <div class="table-wrap" style="margin-top:14px">
          <table><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th></tr></thead>
          <tbody>${users.users
            .map(
              (user) =>
                `<tr><td>${e(user.name)}</td><td>${e(user.email)}</td><td>${e(user.role)}</td><td>${e(user.status)}</td></tr>`
            )
            .join("")}</tbody></table>
        </div>
      </section>
    </section>
  `);
}

async function renderNotifications() {
  if (!requireRole()) return;
  const data = await api("/api/notifications");
  page(`
    <section class="page">
      <div class="section-header">
        <div><div class="eyebrow">Notifications</div><h2>Updates</h2></div>
      </div>
      <div class="grid">
        ${
          data.notifications
            .map(
              (notification) => `<article class="card">
                <div class="section-header">
                  <div><h3>${e(notification.title)}</h3><p>${e(notification.body)}</p></div>
                  ${
                    notification.readAt
                      ? `<span class="status good">read</span>`
                      : `<button class="button" data-action="mark-read" data-id="${e(notification.id)}">Mark read</button>`
                  }
                </div>
              </article>`
            )
            .join("") || `<div class="empty">No notifications.</div>`
        }
      </div>
    </section>
  `);
}

function renderSettings() {
  if (!requireRole()) return;
  page(`
    <section class="page">
      <div class="section-header">
        <div><div class="eyebrow">Settings</div><h2>Account and display</h2></div>
      </div>
      <div class="grid two">
        <article class="card">
          <h3>Account</h3>
          <p>${e(state.user.name)}  -  ${e(state.user.email)}</p>
          <p>Role: ${e(state.user.role)}</p>
        </article>
        <article class="card">
          <h3>Theme</h3>
          <div class="form-actions" style="margin-top:12px">
            <button class="button" data-action="set-theme" data-theme="light">Light mode</button>
            <button class="button" data-action="set-theme" data-theme="dark">Dark mode</button>
          </div>
        </article>
      </div>
    </section>
  `);
}

async function handleRoute() {
  const current = path().split("?")[0];
  try {
    if (current === "/") return renderLanding();
    if (current === "/about") return renderStatic("about");
    if (current === "/features") return renderStatic("features");
    if (current === "/contact") return renderStatic("contact");
    if (current === "/privacy-policy") return renderStatic("privacy");
    if (current === "/terms") return renderStatic("terms");
    if (current === "/login") return renderLogin();
    if (current === "/forgot-password") return renderForgotPassword();
    if (current === "/verify-email") return renderVerifyEmail();
    if (current === "/register") return renderRegister();
    if (current === "/candidate-dashboard" || current === "/career-dashboard") return renderCandidateDashboard();
    if (current === "/candidate-profile") return renderProfile();
    if (current === "/resume-upload") return renderResumeUpload();
    if (current === "/resume-builder") return renderResumeBuilder();
    if (current === "/ai-analysis") return renderAiAnalysis();
    if (current === "/learning-roadmap") return renderRoadmap();
    if (current === "/recruiter-dashboard") return renderRecruiterDashboard();
    if (current === "/admin-dashboard") return renderAdminDashboard();
    if (current === "/jobs") return renderJobs();
    if (current === "/internships") return renderJobs("internship");
    if (current === "/company-reviews") return renderCompanyReviews();
    if (current === "/notifications") return renderNotifications();
    if (current === "/settings") return renderSettings();
    if (current.startsWith("/job/")) return renderJobDetails(current.replace("/job/", ""));
    if (current.startsWith("/company/")) return renderCompany(current.replace("/company/", ""));
    page(`<section class="page"><div class="empty">Page not found.</div></section>`);
  } catch (error) {
    page(`<section class="page"><div class="empty">${e(error.message)}</div></section>`);
  }
}

document.addEventListener("click", async (event) => {
  const action = event.target.closest("[data-action]");
  if (!action) return;
  const name = action.dataset.action;

  try {
    if (name === "theme") {
      state.theme = state.theme === "dark" ? "light" : "dark";
      localStorage.setItem("hersphere.theme", state.theme);
      document.documentElement.dataset.theme = state.theme;
      renderTopbar();
    }

    if (name === "set-theme") {
      state.theme = action.dataset.theme;
      localStorage.setItem("hersphere.theme", state.theme);
      document.documentElement.dataset.theme = state.theme;
      renderSettings();
    }

    if (name === "logout") logout();

    if (name === "demo-login") {
      const [email, password] = demoAccounts[action.dataset.role];
      const payload = await api("/api/auth/login", { method: "POST", body: { email, password } });
      setSession(payload);
      toast(`Logged in as ${payload.user.role}`);
      navigate(dashboardByRole[payload.user.role]);
    }

    if (name === "bookmark") {
      if (!requireRole("candidate")) return;
      await api(`/api/jobs/${action.dataset.id}/bookmark`, { method: "POST", body: {} });
      toast("Bookmarked");
    }

    if (name === "apply") {
      if (!requireRole("candidate")) return;
      await api(`/api/jobs/${action.dataset.id}/apply`, {
        method: "POST",
        body: { coverNote: "I am interested in this role and meet several key requirements." }
      });
      toast("Application submitted");
      navigate("/career-dashboard");
    }

    if (name === "application-status") {
      await api(`/api/recruiter/applications/${action.dataset.id}/status`, {
        method: "PATCH",
        body: { status: action.dataset.status }
      });
      toast("Application updated");
      renderRecruiterDashboard();
    }

    if (name === "verify-company") {
      await api(`/api/admin/companies/${action.dataset.id}/verification`, {
        method: "PATCH",
        body: { verificationStatus: "verified" }
      });
      toast("Company verified");
      renderAdminDashboard();
    }

    if (name === "moderate-review") {
      await api(`/api/admin/reviews/${action.dataset.id}/moderation`, {
        method: "PATCH",
        body: { status: action.dataset.status }
      });
      toast("Review updated");
      renderAdminDashboard();
    }

    if (name === "mark-read") {
      await api(`/api/notifications/${action.dataset.id}/read`, { method: "PATCH", body: {} });
      renderNotifications();
    }

    if (name === "copy-resume") {
      const text = document.querySelector("#resume-builder-form textarea")?.value || "";
      await navigator.clipboard?.writeText(text);
      toast("Resume copied");
    }
  } catch (error) {
    toast(error.message);
  }
});

window.addEventListener("hashchange", handleRoute);
await hydrate();
await handleRoute();
