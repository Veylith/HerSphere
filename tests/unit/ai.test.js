import assert from "node:assert/strict";
import { test } from "node:test";
import {
  analyzeEligibility,
  analyzeResume,
  calculateCareerReadiness,
  detectReviewSpam,
  detectSkillGap,
  recommendLearning
} from "../../packages/ai/src/index.js";

test("resume analyzer extracts career evidence from resume text", () => {
  const resume = analyzeResume(`
    Asha Rao
    B.Tech Computer Science
    Frontend Engineer with 3 years experience in React, JavaScript, Node.js, SQL, Docker and Accessibility.
    Projects: Built an AI career dashboard with authenticated APIs and analytics.
    Certification: Meta Front-End Developer Professional Certificate.
    Winner at Women in AI hackathon.
  `);

  assert.ok(resume.skills.includes("React"));
  assert.ok(resume.skills.includes("Node.js"));
  assert.ok(resume.education.some((item) => item.includes("B.Tech")));
  assert.ok(resume.projects.length >= 1);
  assert.ok(resume.certifications.length >= 1);
  assert.ok(resume.resumeScore >= 80);
});

test("eligibility and skill-gap modules compare a candidate against a role", () => {
  const candidate = {
    skills: ["React", "Node.js", "SQL"],
    projects: ["Built an API dashboard"],
    certifications: ["Meta Front-End Developer Professional Certificate"],
    education: ["B.Tech Computer Science"],
    experienceYears: 2
  };
  const role = {
    title: "AI Product Engineer",
    requiredSkills: ["React", "Node.js", "SQL", "Machine Learning"],
    niceToHaveSkills: ["Docker"],
    projectSignals: ["dashboard", "machine learning"],
    preferredCertifications: ["AWS Cloud Practitioner"],
    minExperience: 2
  };

  const eligibility = analyzeEligibility(candidate, role);
  const gap = detectSkillGap(candidate, role);
  const roadmap = recommendLearning(candidate, role);

  assert.equal(eligibility.missingRequired.includes("machine learning"), true);
  assert.ok(eligibility.eligibilityScore >= 60);
  assert.ok(gap.missingSkills.includes("machine learning"));
  assert.ok(roadmap.modules.length >= 1);
});

test("career readiness and review spam checks produce practical scores", () => {
  const readiness = calculateCareerReadiness(
    {
      skills: ["React", "Node.js", "SQL", "CSS", "Communication"],
      education: ["B.Tech Computer Science"],
      projects: ["Built a dashboard"],
      certifications: ["Meta Front-End Developer Professional Certificate"],
      experienceYears: 2
    },
    { resumeScore: 83 }
  );

  const spam = detectReviewSpam({
    title: "bad",
    comment: "!!!!!!!!!!!!!!!!!!!!!!!!!!!!",
    ratings: { workCulture: 5, safety: 5, mentorship: 5, careerGrowth: 5, workLifeBalance: 5 }
  });

  assert.ok(readiness.overallCareerScore >= 70);
  assert.equal(spam.isSpam, true);
});
