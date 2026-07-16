import { randomUUID } from "node:crypto";
import {
  analyzeEligibility,
  analyzeResume,
  calculateCareerReadiness,
  detectReviewSpam,
  detectSkillGap,
  rankCandidates,
  recommendJobs,
  recommendLearning,
  summarizeCompanyReviews
} from "../../../../packages/ai/src/index.js";
import { badRequest, forbidden, notFound } from "../domain/errors.js";
import { enrichOpportunity, profileForUser, publicUser } from "../domain/serializers.js";
import { sendJson, sendNoContent } from "./response.js";
import { cleanList, cleanString, assertEmail, assertPassword, assertRole, requireFields } from "../security/validation.js";
import { createCsrfToken, signToken } from "../security/token.js";
import { hashPassword, verifyPassword } from "../security/password.js";

function tokenFor(user, env) {
  return signToken({ sub: user.id, role: user.role, email: user.email, name: user.name }, env.jwtSecret, env.tokenTtlSeconds);
}

function now() {
  return new Date().toISOString();
}

function candidateProfile(ctx, user = ctx.user) {
  const profile = ctx.store.findOne("candidateProfiles", (item) => item.userId === user.id);
  if (!profile) throw notFound("Candidate profile not found");
  return profile;
}

function opportunityWithCompany(ctx, opportunity) {
  return enrichOpportunity(opportunity, ctx.store);
}

function activeOpportunities(ctx, type = undefined) {
  return ctx.store
    .all("opportunities")
    .filter((opportunity) => opportunity.status === "active")
    .filter((opportunity) => !type || opportunity.type === type)
    .map((opportunity) => opportunityWithCompany(ctx, opportunity));
}

function applicationView(ctx, application) {
  const opportunity = ctx.store.findById("opportunities", application.opportunityId);
  return {
    ...application,
    opportunity: opportunity ? opportunityWithCompany(ctx, opportunity) : null
  };
}

function rankedApplicants(ctx, opportunity) {
  const applications = ctx.store.query("applications", (application) => application.opportunityId === opportunity.id);
  const candidates = applications
    .map((application) => {
      const user = ctx.store.findById("users", application.candidateId);
      const profile = ctx.store.findOne("candidateProfiles", (item) => item.userId === application.candidateId);
      if (!user || !profile) return null;
      return {
        application,
        user: publicUser(user),
        profile
      };
    })
    .filter(Boolean);
  return rankCandidates(candidates, opportunity);
}

function cleanOpportunityInput(body, recruiter) {
  requireFields(body, ["title", "type", "location", "description"]);
  if (!["job", "internship"].includes(body.type)) throw badRequest("Opportunity type must be job or internship");

  return {
    type: body.type,
    title: cleanString(body.title, 120),
    companyId: recruiter.companyId,
    createdBy: recruiter.id,
    location: cleanString(body.location, 120),
    remote: cleanString(body.remote || "hybrid", 40),
    employmentType: cleanString(body.employmentType || (body.type === "job" ? "Full-time" : "Internship"), 60),
    salaryRange: cleanString(body.salaryRange || "Disclosed during process", 80),
    description: cleanString(body.description, 3000),
    requiredSkills: cleanList(body.requiredSkills, 16, 60),
    niceToHaveSkills: cleanList(body.niceToHaveSkills, 12, 60),
    projectSignals: cleanList(body.projectSignals, 12, 60),
    preferredCertifications: cleanList(body.preferredCertifications, 8, 100),
    minExperience: Number(body.minExperience || 0),
    status: cleanString(body.status || "active", 40),
    postedAt: body.postedAt || now(),
    closesAt: body.closesAt || new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString()
  };
}

export function registerRoutes(router) {
  router.add("GET", "/api/health", async (ctx) => {
    sendJson(ctx.res, 200, {
      status: "ok",
      service: "hersphere-api",
      time: now()
    });
  });

  router.add("GET", "/api/security/csrf", async (ctx) => {
    sendJson(ctx.res, 200, { csrfToken: createCsrfToken(ctx.env.csrfSecret) });
  });

  router.add("POST", "/api/auth/register", async (ctx) => {
    requireFields(ctx.body, ["name", "email", "password", "role"]);
    assertEmail(ctx.body.email);
    assertPassword(ctx.body.password);
    assertRole(ctx.body.role);

    const email = cleanString(ctx.body.email, 160).toLowerCase();
    if (ctx.store.findOne("users", (user) => user.email.toLowerCase() === email)) {
      throw badRequest("An account already exists for this email");
    }

    const userId = randomUUID();
    let companyId = null;
    let profileId = null;

    if (ctx.body.role === "candidate") {
      profileId = randomUUID();
      ctx.store.create("candidateProfiles", {
        id: profileId,
        userId,
        headline: cleanString(ctx.body.headline || "Career explorer", 160),
        location: cleanString(ctx.body.location || "", 120),
        careerGoal: cleanString(ctx.body.careerGoal || "", 120),
        interests: cleanList(ctx.body.interests, 10, 60),
        education: [],
        skills: cleanList(ctx.body.skills, 20, 60),
        projects: [],
        experience: [],
        experienceYears: 0,
        certifications: [],
        achievements: [],
        portfolioLinks: [],
        resumeText: "",
        verifiedPortfolio: false
      });
    }

    if (ctx.body.role === "recruiter") {
      requireFields(ctx.body, ["companyName"]);
      companyId = randomUUID();
      ctx.store.create("companies", {
        id: companyId,
        name: cleanString(ctx.body.companyName, 140),
        slug: cleanString(ctx.body.companyName, 140).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
        industry: cleanString(ctx.body.industry || "Technology", 80),
        location: cleanString(ctx.body.location || "", 120),
        website: cleanString(ctx.body.website || "", 200),
        size: cleanString(ctx.body.size || "1-50", 40),
        verificationStatus: "pending",
        safetyPolicyUrl: cleanString(ctx.body.safetyPolicyUrl || "", 200),
        description: cleanString(ctx.body.description || "", 1200)
      });
    }

    const user = ctx.store.create("users", {
      id: userId,
      role: ctx.body.role,
      name: cleanString(ctx.body.name, 120),
      email,
      passwordHash: hashPassword(ctx.body.password),
      emailVerified: false,
      emailVerificationToken: randomUUID(),
      status: "active",
      profileId,
      companyId,
      recruiterApproved: ctx.body.role !== "recruiter"
    });

    ctx.store.audit(user.id, "auth.register", "user", user.id);
    sendJson(ctx.res, 201, {
      user: publicUser(user),
      token: tokenFor(user, ctx.env),
      profile: profileForUser(user, ctx.store)
    });
  });

  router.add("POST", "/api/auth/login", async (ctx) => {
    requireFields(ctx.body, ["email", "password"]);
    const email = cleanString(ctx.body.email, 160).toLowerCase();
    const user = ctx.store.findOne("users", (item) => item.email.toLowerCase() === email);
    if (!user || !verifyPassword(ctx.body.password, user.passwordHash)) {
      throw badRequest("Invalid email or password");
    }
    if (user.status !== "active") throw forbidden("This account is not active");
    ctx.store.audit(user.id, "auth.login", "user", user.id);
    sendJson(ctx.res, 200, {
      user: publicUser(user),
      token: tokenFor(user, ctx.env),
      profile: profileForUser(user, ctx.store)
    });
  });

  router.add("POST", "/api/auth/forgot-password", async (ctx) => {
    requireFields(ctx.body, ["email"]);
    const email = cleanString(ctx.body.email, 160).toLowerCase();
    const user = ctx.store.findOne("users", (item) => item.email.toLowerCase() === email);
    if (user) {
      const resetToken = randomUUID();
      ctx.store.update("users", user.id, { resetToken });
      ctx.store.create("notifications", {
        userId: user.id,
        title: "Password reset requested",
        body: "A password reset was requested for your HerSphere account.",
        readAt: null
      });
    }
    sendJson(ctx.res, 200, { message: "If the email exists, reset instructions have been sent." });
  });

  router.add("POST", "/api/auth/verify-email", async (ctx) => {
    requireFields(ctx.body, ["email", "token"]);
    const email = cleanString(ctx.body.email, 160).toLowerCase();
    const user = ctx.store.findOne("users", (item) => item.email.toLowerCase() === email);
    if (!user || user.emailVerificationToken !== ctx.body.token) throw badRequest("Invalid verification token");
    const updated = ctx.store.update("users", user.id, { emailVerified: true, emailVerificationToken: null });
    sendJson(ctx.res, 200, { user: publicUser(updated) });
  });

  router.add(
    "GET",
    "/api/auth/me",
    async (ctx) => {
      sendJson(ctx.res, 200, {
        user: publicUser(ctx.user),
        profile: profileForUser(ctx.user, ctx.store)
      });
    },
    { auth: true }
  );

  router.add(
    "GET",
    "/api/candidate/profile",
    async (ctx) => {
      sendJson(ctx.res, 200, { profile: candidateProfile(ctx) });
    },
    { auth: true, roles: ["candidate"] }
  );

  router.add(
    "PUT",
    "/api/candidate/profile",
    async (ctx) => {
      const profile = candidateProfile(ctx);
      const patch = {
        headline: cleanString(ctx.body.headline ?? profile.headline, 160),
        location: cleanString(ctx.body.location ?? profile.location, 120),
        careerGoal: cleanString(ctx.body.careerGoal ?? profile.careerGoal, 120),
        interests: Array.isArray(ctx.body.interests) ? cleanList(ctx.body.interests, 10, 60) : profile.interests,
        education: Array.isArray(ctx.body.education) ? cleanList(ctx.body.education, 10, 140) : profile.education,
        skills: Array.isArray(ctx.body.skills) ? cleanList(ctx.body.skills, 30, 60) : profile.skills,
        projects: Array.isArray(ctx.body.projects) ? cleanList(ctx.body.projects, 20, 240) : profile.projects,
        experience: Array.isArray(ctx.body.experience) ? ctx.body.experience.slice(0, 12) : profile.experience,
        experienceYears: Number(ctx.body.experienceYears ?? profile.experienceYears ?? 0),
        certifications: Array.isArray(ctx.body.certifications)
          ? cleanList(ctx.body.certifications, 12, 140)
          : profile.certifications,
        achievements: Array.isArray(ctx.body.achievements) ? cleanList(ctx.body.achievements, 12, 160) : profile.achievements,
        portfolioLinks: Array.isArray(ctx.body.portfolioLinks) ? cleanList(ctx.body.portfolioLinks, 8, 200) : profile.portfolioLinks
      };
      const updated = ctx.store.update("candidateProfiles", profile.id, patch);
      sendJson(ctx.res, 200, { profile: updated });
    },
    { auth: true, roles: ["candidate"] }
  );

  router.add(
    "POST",
    "/api/resume/analyze",
    async (ctx) => {
      requireFields(ctx.body, ["resumeText"]);
      const profile = candidateProfile(ctx);
      const resumeText = cleanString(ctx.body.resumeText, 20_000);
      const analysis = analyzeResume(resumeText);

      if (ctx.body.merge !== false) {
        ctx.store.update("candidateProfiles", profile.id, {
          resumeText,
          skills: [...new Set([...profile.skills, ...analysis.skills])],
          education: [...new Set([...profile.education, ...analysis.education])],
          projects: [...new Set([...profile.projects, ...analysis.projects])],
          certifications: [...new Set([...profile.certifications, ...analysis.certifications])],
          achievements: [...new Set([...profile.achievements, ...analysis.achievements])],
          experienceYears: Math.max(profile.experienceYears || 0, analysis.experience.years || 0)
        });
      }

      sendJson(ctx.res, 200, { analysis });
    },
    { auth: true, roles: ["candidate"] }
  );

  router.add(
    "GET",
    "/api/career/dashboard",
    async (ctx) => {
      const profile = candidateProfile(ctx);
      const readiness = calculateCareerReadiness(profile, analyzeResume(profile.resumeText || ""));
      const applications = ctx.store
        .query("applications", (application) => application.candidateId === ctx.user.id)
        .map((application) => applicationView(ctx, application));
      const bookmarks = ctx.store.query("bookmarks", (bookmark) => bookmark.candidateId === ctx.user.id);
      const recommendations = recommendJobs(profile, activeOpportunities(ctx)).slice(0, 4);

      sendJson(ctx.res, 200, {
        profile,
        readiness,
        applications,
        bookmarks,
        recommendations
      });
    },
    { auth: true, roles: ["candidate"] }
  );

  router.add(
    "GET",
    "/api/ai/analysis",
    async (ctx) => {
      const profile = candidateProfile(ctx);
      const opportunities = activeOpportunities(ctx);
      const target = opportunities[0];
      const resume = analyzeResume(profile.resumeText || "");
      const readiness = calculateCareerReadiness(profile, resume);
      const eligibility = target ? analyzeEligibility(profile, target) : null;
      const skillGap = target ? detectSkillGap(profile, target) : null;
      const recommendations = recommendJobs(profile, opportunities);

      sendJson(ctx.res, 200, {
        resume,
        readiness,
        eligibility,
        skillGap,
        recommendations
      });
    },
    { auth: true, roles: ["candidate"] }
  );

  router.add(
    "GET",
    "/api/learning-roadmap",
    async (ctx) => {
      const profile = candidateProfile(ctx);
      const targetId = ctx.url.searchParams.get("opportunityId");
      const target =
        ctx.store.findById("opportunities", targetId) ||
        recommendJobs(profile, activeOpportunities(ctx))[0] ||
        activeOpportunities(ctx)[0];
      const roadmap = target ? recommendLearning(profile, target) : recommendLearning(profile, {});
      sendJson(ctx.res, 200, { target: target ? opportunityWithCompany(ctx, target) : null, roadmap });
    },
    { auth: true, roles: ["candidate"] }
  );

  router.add("GET", "/api/jobs", async (ctx) => {
    const type = ctx.url.searchParams.get("type");
    const search = String(ctx.url.searchParams.get("search") || "").toLowerCase();
    const location = String(ctx.url.searchParams.get("location") || "").toLowerCase();
    const skill = String(ctx.url.searchParams.get("skill") || "").toLowerCase();
    const remote = String(ctx.url.searchParams.get("remote") || "").toLowerCase();

    const opportunities = activeOpportunities(ctx, type || undefined).filter((opportunity) => {
      const searchable = [
        opportunity.title,
        opportunity.description,
        opportunity.company?.name,
        opportunity.location,
        ...(opportunity.requiredSkills || []),
        ...(opportunity.niceToHaveSkills || [])
      ]
        .join(" ")
        .toLowerCase();
      return (
        (!search || searchable.includes(search)) &&
        (!location || String(opportunity.location).toLowerCase().includes(location)) &&
        (!skill || searchable.includes(skill)) &&
        (!remote || String(opportunity.remote).toLowerCase() === remote)
      );
    });

    sendJson(ctx.res, 200, { opportunities });
  });

  router.add("GET", "/api/jobs/:id", async (ctx) => {
    const opportunity = ctx.store.findById("opportunities", ctx.params.id);
    if (!opportunity || opportunity.status !== "active") throw notFound("Opportunity not found");
    const payload = { opportunity: opportunityWithCompany(ctx, opportunity) };

    if (ctx.user?.role === "candidate") {
      const profile = candidateProfile(ctx);
      payload.eligibility = analyzeEligibility(profile, opportunity);
      payload.skillGap = detectSkillGap(profile, opportunity);
    }

    sendJson(ctx.res, 200, payload);
  });

  router.add(
    "POST",
    "/api/jobs/:id/bookmark",
    async (ctx) => {
      const opportunity = ctx.store.findById("opportunities", ctx.params.id);
      if (!opportunity || opportunity.status !== "active") throw notFound("Opportunity not found");
      const existing = ctx.store.findOne(
        "bookmarks",
        (bookmark) => bookmark.candidateId === ctx.user.id && bookmark.opportunityId === opportunity.id
      );
      const bookmark =
        existing ||
        ctx.store.create("bookmarks", {
          candidateId: ctx.user.id,
          opportunityId: opportunity.id
        });
      sendJson(ctx.res, existing ? 200 : 201, { bookmark });
    },
    { auth: true, roles: ["candidate"] }
  );

  router.add(
    "POST",
    "/api/jobs/:id/apply",
    async (ctx) => {
      const opportunity = ctx.store.findById("opportunities", ctx.params.id);
      if (!opportunity || opportunity.status !== "active") throw notFound("Opportunity not found");
      const existing = ctx.store.findOne(
        "applications",
        (application) => application.candidateId === ctx.user.id && application.opportunityId === opportunity.id
      );
      if (existing) throw badRequest("You have already applied to this opportunity");

      const profile = candidateProfile(ctx);
      const application = ctx.store.create("applications", {
        opportunityId: opportunity.id,
        candidateId: ctx.user.id,
        status: "submitted",
        coverNote: cleanString(ctx.body.coverNote || "", 1000),
        eligibilitySnapshot: analyzeEligibility(profile, opportunity)
      });

      ctx.store.create("notifications", {
        userId: opportunity.createdBy,
        title: "New application received",
        body: `${ctx.user.name} applied for ${opportunity.title}.`,
        readAt: null
      });

      sendJson(ctx.res, 201, { application: applicationView(ctx, application) });
    },
    { auth: true, roles: ["candidate"] }
  );

  router.add(
    "GET",
    "/api/applications/me",
    async (ctx) => {
      const applications = ctx.store
        .query("applications", (application) => application.candidateId === ctx.user.id)
        .map((application) => applicationView(ctx, application));
      sendJson(ctx.res, 200, { applications });
    },
    { auth: true, roles: ["candidate"] }
  );

  router.add("GET", "/api/companies", async (ctx) => {
    const companies = ctx.store.all("companies").map((company) => {
      const reviews = ctx.store.query("reviews", (review) => review.companyId === company.id);
      return {
        ...company,
        reviewIntelligence: summarizeCompanyReviews(reviews)
      };
    });
    sendJson(ctx.res, 200, { companies });
  });

  router.add("GET", "/api/companies/:id", async (ctx) => {
    const company = ctx.store.findById("companies", ctx.params.id);
    if (!company) throw notFound("Company not found");
    const reviews = ctx.store.query("reviews", (review) => review.companyId === company.id);
    sendJson(ctx.res, 200, {
      company,
      reviewIntelligence: summarizeCompanyReviews(reviews),
      opportunities: activeOpportunities(ctx).filter((opportunity) => opportunity.companyId === company.id)
    });
  });

  router.add("GET", "/api/companies/:id/reviews", async (ctx) => {
    const company = ctx.store.findById("companies", ctx.params.id);
    if (!company) throw notFound("Company not found");
    const reviews = ctx.store
      .query("reviews", (review) => review.companyId === company.id && review.status === "published")
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    sendJson(ctx.res, 200, {
      reviews,
      reviewIntelligence: summarizeCompanyReviews(reviews)
    });
  });

  router.add(
    "POST",
    "/api/companies/:id/reviews",
    async (ctx) => {
      const company = ctx.store.findById("companies", ctx.params.id);
      if (!company) throw notFound("Company not found");
      requireFields(ctx.body, ["title", "comment", "ratings"]);
      const spam = detectReviewSpam(ctx.body);
      const review = ctx.store.create("reviews", {
        companyId: company.id,
        userId: ctx.user.id,
        verifiedEmployment: Boolean(ctx.body.verifiedEmployment),
        status: spam.isSpam ? "flagged" : "published",
        title: cleanString(ctx.body.title, 140),
        comment: cleanString(ctx.body.comment, 1800),
        ratings: {
          workCulture: Number(ctx.body.ratings.workCulture || 0),
          safety: Number(ctx.body.ratings.safety || 0),
          mentorship: Number(ctx.body.ratings.mentorship || 0),
          careerGrowth: Number(ctx.body.ratings.careerGrowth || 0),
          workLifeBalance: Number(ctx.body.ratings.workLifeBalance || 0)
        },
        spam
      });
      sendJson(ctx.res, 201, { review });
    },
    { auth: true, roles: ["candidate"] }
  );

  router.add(
    "GET",
    "/api/notifications",
    async (ctx) => {
      const notifications = ctx.store
        .query("notifications", (notification) => notification.userId === ctx.user.id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      sendJson(ctx.res, 200, { notifications });
    },
    { auth: true }
  );

  router.add(
    "PATCH",
    "/api/notifications/:id/read",
    async (ctx) => {
      const notification = ctx.store.findById("notifications", ctx.params.id);
      if (!notification || notification.userId !== ctx.user.id) throw notFound("Notification not found");
      const updated = ctx.store.update("notifications", notification.id, { readAt: now() });
      sendJson(ctx.res, 200, { notification: updated });
    },
    { auth: true }
  );

  router.add(
    "GET",
    "/api/recruiter/dashboard",
    async (ctx) => {
      const listings = ctx.store
        .query("opportunities", (opportunity) => opportunity.createdBy === ctx.user.id || opportunity.companyId === ctx.user.companyId)
        .map((opportunity) => opportunityWithCompany(ctx, opportunity));
      const listingIds = new Set(listings.map((listing) => listing.id));
      const applications = ctx.store.query("applications", (application) => listingIds.has(application.opportunityId));
      const company = ctx.store.findById("companies", ctx.user.companyId);
      const interviews = ctx.store.query("interviews", (interview) => listingIds.has(interview.opportunityId));

      sendJson(ctx.res, 200, {
        company,
        listings,
        analytics: {
          activeListings: listings.filter((listing) => listing.status === "active").length,
          applications: applications.length,
          shortlisted: applications.filter((application) => application.status === "shortlisted").length,
          interviews: interviews.length
        },
        recentApplicants: applications.slice(-6).map((application) => applicationView(ctx, application))
      });
    },
    { auth: true, roles: ["recruiter"] }
  );

  router.add(
    "POST",
    "/api/recruiter/listings",
    async (ctx) => {
      if (!ctx.user.recruiterApproved) throw forbidden("Recruiter approval is required before posting");
      const company = ctx.store.findById("companies", ctx.user.companyId);
      if (!company || company.verificationStatus !== "verified") throw forbidden("Company verification is required before posting");
      const opportunity = ctx.store.create("opportunities", cleanOpportunityInput(ctx.body, ctx.user));
      ctx.store.audit(ctx.user.id, "recruiter.create_listing", "opportunity", opportunity.id);
      sendJson(ctx.res, 201, { opportunity: opportunityWithCompany(ctx, opportunity) });
    },
    { auth: true, roles: ["recruiter"] }
  );

  router.add(
    "PUT",
    "/api/recruiter/listings/:id",
    async (ctx) => {
      const existing = ctx.store.findById("opportunities", ctx.params.id);
      if (!existing || existing.companyId !== ctx.user.companyId) throw notFound("Listing not found");
      const opportunity = ctx.store.update("opportunities", existing.id, cleanOpportunityInput({ ...existing, ...ctx.body }, ctx.user));
      ctx.store.audit(ctx.user.id, "recruiter.update_listing", "opportunity", opportunity.id);
      sendJson(ctx.res, 200, { opportunity: opportunityWithCompany(ctx, opportunity) });
    },
    { auth: true, roles: ["recruiter"] }
  );

  router.add(
    "DELETE",
    "/api/recruiter/listings/:id",
    async (ctx) => {
      const existing = ctx.store.findById("opportunities", ctx.params.id);
      if (!existing || existing.companyId !== ctx.user.companyId) throw notFound("Listing not found");
      ctx.store.update("opportunities", existing.id, { status: "deleted" });
      ctx.store.audit(ctx.user.id, "recruiter.delete_listing", "opportunity", existing.id);
      sendNoContent(ctx.res);
    },
    { auth: true, roles: ["recruiter"] }
  );

  router.add(
    "GET",
    "/api/recruiter/listings/:id/applicants",
    async (ctx) => {
      const opportunity = ctx.store.findById("opportunities", ctx.params.id);
      if (!opportunity || opportunity.companyId !== ctx.user.companyId) throw notFound("Listing not found");
      sendJson(ctx.res, 200, {
        opportunity: opportunityWithCompany(ctx, opportunity),
        applicants: rankedApplicants(ctx, opportunity)
      });
    },
    { auth: true, roles: ["recruiter"] }
  );

  router.add(
    "PATCH",
    "/api/recruiter/applications/:id/status",
    async (ctx) => {
      const application = ctx.store.findById("applications", ctx.params.id);
      if (!application) throw notFound("Application not found");
      const opportunity = ctx.store.findById("opportunities", application.opportunityId);
      if (!opportunity || opportunity.companyId !== ctx.user.companyId) throw notFound("Application not found");
      const status = cleanString(ctx.body.status || "", 40);
      if (!["submitted", "in_review", "shortlisted", "interview", "offered", "rejected"].includes(status)) {
        throw badRequest("Invalid application status");
      }
      const updated = ctx.store.update("applications", application.id, { status });
      ctx.store.create("notifications", {
        userId: application.candidateId,
        title: "Application status updated",
        body: `${opportunity.title} moved to ${status.replace("_", " ")}.`,
        readAt: null
      });
      sendJson(ctx.res, 200, { application: applicationView(ctx, updated) });
    },
    { auth: true, roles: ["recruiter"] }
  );

  router.add(
    "POST",
    "/api/recruiter/interviews",
    async (ctx) => {
      requireFields(ctx.body, ["applicationId", "scheduledAt", "mode"]);
      const application = ctx.store.findById("applications", ctx.body.applicationId);
      if (!application) throw notFound("Application not found");
      const opportunity = ctx.store.findById("opportunities", application.opportunityId);
      if (!opportunity || opportunity.companyId !== ctx.user.companyId) throw notFound("Application not found");
      const interview = ctx.store.create("interviews", {
        applicationId: application.id,
        opportunityId: opportunity.id,
        recruiterId: ctx.user.id,
        candidateId: application.candidateId,
        scheduledAt: cleanString(ctx.body.scheduledAt, 80),
        mode: cleanString(ctx.body.mode, 80),
        meetingUrl: cleanString(ctx.body.meetingUrl || "", 240),
        status: "scheduled"
      });
      ctx.store.update("applications", application.id, { status: "interview" });
      ctx.store.create("notifications", {
        userId: application.candidateId,
        title: "Interview scheduled",
        body: `Interview scheduled for ${opportunity.title}.`,
        readAt: null
      });
      sendJson(ctx.res, 201, { interview });
    },
    { auth: true, roles: ["recruiter"] }
  );

  router.add(
    "GET",
    "/api/admin/dashboard",
    async (ctx) => {
      const users = ctx.store.all("users");
      const companies = ctx.store.all("companies");
      const reviews = ctx.store.all("reviews");
      const opportunities = ctx.store.all("opportunities");
      sendJson(ctx.res, 200, {
        metrics: {
          users: users.length,
          candidates: users.filter((user) => user.role === "candidate").length,
          recruiters: users.filter((user) => user.role === "recruiter").length,
          companiesPending: companies.filter((company) => company.verificationStatus === "pending").length,
          activeListings: opportunities.filter((opportunity) => opportunity.status === "active").length,
          flaggedReviews: reviews.filter((review) => review.status === "flagged").length
        },
        pendingCompanies: companies.filter((company) => company.verificationStatus === "pending"),
        flaggedReviews: reviews.filter((review) => review.status === "flagged"),
        auditLogs: ctx.store.all("auditLogs").slice(-20).reverse()
      });
    },
    { auth: true, roles: ["admin"] }
  );

  router.add(
    "GET",
    "/api/admin/users",
    async (ctx) => {
      sendJson(ctx.res, 200, { users: ctx.store.all("users").map(publicUser) });
    },
    { auth: true, roles: ["admin"] }
  );

  router.add(
    "PATCH",
    "/api/admin/users/:id/status",
    async (ctx) => {
      const status = cleanString(ctx.body.status || "", 40);
      if (!["active", "disabled"].includes(status)) throw badRequest("Status must be active or disabled");
      const user = ctx.store.update("users", ctx.params.id, { status });
      ctx.store.audit(ctx.user.id, "admin.update_user_status", "user", user.id, { status });
      sendJson(ctx.res, 200, { user: publicUser(user) });
    },
    { auth: true, roles: ["admin"] }
  );

  router.add(
    "PATCH",
    "/api/admin/companies/:id/verification",
    async (ctx) => {
      const verificationStatus = cleanString(ctx.body.verificationStatus || "", 40);
      if (!["pending", "verified", "rejected"].includes(verificationStatus)) {
        throw badRequest("Verification status must be pending, verified, or rejected");
      }
      const company = ctx.store.update("companies", ctx.params.id, { verificationStatus });
      ctx.store.audit(ctx.user.id, "admin.verify_company", "company", company.id, { verificationStatus });
      sendJson(ctx.res, 200, { company });
    },
    { auth: true, roles: ["admin"] }
  );

  router.add(
    "PATCH",
    "/api/admin/recruiters/:id/approval",
    async (ctx) => {
      const recruiterApproved = Boolean(ctx.body.recruiterApproved);
      const user = ctx.store.findById("users", ctx.params.id);
      if (!user || user.role !== "recruiter") throw notFound("Recruiter not found");
      const updated = ctx.store.update("users", user.id, { recruiterApproved });
      ctx.store.audit(ctx.user.id, "admin.approve_recruiter", "user", user.id, { recruiterApproved });
      sendJson(ctx.res, 200, { user: publicUser(updated) });
    },
    { auth: true, roles: ["admin"] }
  );

  router.add(
    "PATCH",
    "/api/admin/reviews/:id/moderation",
    async (ctx) => {
      const status = cleanString(ctx.body.status || "", 40);
      if (!["published", "flagged", "removed"].includes(status)) throw badRequest("Invalid review status");
      const review = ctx.store.update("reviews", ctx.params.id, { status });
      ctx.store.audit(ctx.user.id, "admin.moderate_review", "review", review.id, { status });
      sendJson(ctx.res, 200, { review });
    },
    { auth: true, roles: ["admin"] }
  );

  router.add(
    "GET",
    "/api/admin/reports",
    async (ctx) => {
      const applications = ctx.store.all("applications");
      const opportunities = ctx.store.all("opportunities");
      const users = ctx.store.all("users");
      sendJson(ctx.res, 200, {
        reports: {
          conversion: {
            applicationsPerListing: Number((applications.length / Math.max(1, opportunities.length)).toFixed(2)),
            shortlistRate: Number(
              (
                applications.filter((application) => ["shortlisted", "interview", "offered"].includes(application.status)).length /
                Math.max(1, applications.length)
              ).toFixed(2)
            )
          },
          roleMix: {
            candidates: users.filter((user) => user.role === "candidate").length,
            recruiters: users.filter((user) => user.role === "recruiter").length,
            admins: users.filter((user) => user.role === "admin").length
          }
        }
      });
    },
    { auth: true, roles: ["admin"] }
  );
}
