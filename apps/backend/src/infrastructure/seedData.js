import { hashPassword } from "../security/password.js";

const now = new Date("2026-07-15T12:00:00.000Z").toISOString();
const nextMonth = new Date("2026-08-15T12:00:00.000Z").toISOString();

export function createSeedData() {
  const passwordHash = hashPassword("Password123!");

  return {
    users: [
      {
        id: "user-candidate-priya",
        role: "candidate",
        name: "Priya Menon",
        email: "candidate@hersphere.test",
        passwordHash,
        emailVerified: true,
        status: "active",
        profileId: "profile-priya",
        createdAt: now,
        updatedAt: now
      },
      {
        id: "user-recruiter-anjali",
        role: "recruiter",
        name: "Anjali Rao",
        email: "recruiter@hersphere.test",
        passwordHash,
        emailVerified: true,
        status: "active",
        companyId: "company-novalytics",
        recruiterApproved: true,
        createdAt: now,
        updatedAt: now
      },
      {
        id: "user-admin-maya",
        role: "admin",
        name: "Maya Sharma",
        email: "admin@hersphere.test",
        passwordHash,
        emailVerified: true,
        status: "active",
        createdAt: now,
        updatedAt: now
      }
    ],
    candidateProfiles: [
      {
        id: "profile-priya",
        userId: "user-candidate-priya",
        headline: "Frontend engineer moving into full-stack AI products",
        location: "Bengaluru, India",
        careerGoal: "AI Product Engineer",
        interests: ["AI", "React", "Accessibility", "Women in Tech"],
        education: ["B.Tech Computer Science, PES University"],
        skills: ["JavaScript", "React", "CSS", "Node.js", "SQL", "Accessibility", "Communication"],
        projects: [
          "Built a responsive career dashboard in React with authenticated API integration",
          "Designed an accessible mentor matching prototype for women returning to work"
        ],
        experience: [
          {
            title: "Frontend Engineer",
            company: "BrightApps",
            years: 2.5,
            summary: "Built production web interfaces, dashboards, and design system components."
          }
        ],
        experienceYears: 2.5,
        certifications: ["Meta Front-End Developer Professional Certificate"],
        achievements: ["Finalist at Women in AI hackathon 2025"],
        portfolioLinks: ["https://portfolio.example/priya", "https://github.com/priya-example"],
        resumeText:
          "Priya Menon\nB.Tech Computer Science, PES University\nFrontend Engineer with 2.5 years experience in JavaScript, React, CSS, Node.js, SQL and Accessibility.\nProjects: Built a responsive career dashboard in React with authenticated API integration.\nCertifications: Meta Front-End Developer Professional Certificate.\nAchievement: Finalist at Women in AI hackathon 2025.",
        verifiedPortfolio: true,
        updatedAt: now
      }
    ],
    companies: [
      {
        id: "company-novalytics",
        name: "Novalytics AI",
        slug: "novalytics-ai",
        industry: "AI SaaS",
        location: "Bengaluru, India",
        website: "https://novalytics.example",
        size: "201-500",
        verificationStatus: "verified",
        safetyPolicyUrl: "https://novalytics.example/safety",
        description:
          "Novalytics AI builds analytics copilots for operations teams and runs a documented inclusive hiring program.",
        createdAt: now,
        updatedAt: now
      },
      {
        id: "company-lumora",
        name: "Lumora Health",
        slug: "lumora-health",
        industry: "HealthTech",
        location: "Hyderabad, India",
        website: "https://lumora.example",
        size: "51-200",
        verificationStatus: "pending",
        safetyPolicyUrl: "",
        description: "A health data startup hiring for privacy-first product and engineering teams.",
        createdAt: now,
        updatedAt: now
      }
    ],
    opportunities: [
      {
        id: "job-ai-product-engineer",
        type: "job",
        title: "AI Product Engineer",
        companyId: "company-novalytics",
        createdBy: "user-recruiter-anjali",
        location: "Bengaluru",
        remote: "hybrid",
        employmentType: "Full-time",
        salaryRange: "INR 18L-28L",
        description:
          "Build user-facing AI workflows, connect product analytics to model outputs, and collaborate with design and data teams.",
        requiredSkills: ["React", "Node.js", "SQL", "Machine Learning", "Accessibility"],
        niceToHaveSkills: ["Product Management", "LLM", "Docker"],
        projectSignals: ["react", "api", "machine learning", "dashboard"],
        preferredCertifications: ["Meta Front-End Developer Professional Certificate"],
        minExperience: 2,
        status: "active",
        postedAt: now,
        closesAt: nextMonth
      },
      {
        id: "job-data-product-analyst",
        type: "job",
        title: "Data Product Analyst",
        companyId: "company-lumora",
        createdBy: "user-recruiter-anjali",
        location: "Hyderabad",
        remote: "remote",
        employmentType: "Full-time",
        salaryRange: "INR 12L-18L",
        description:
          "Own metric definitions, build dashboards, and translate user research into product insights.",
        requiredSkills: ["SQL", "Power BI", "Analytics", "Product Management"],
        niceToHaveSkills: ["Python", "A/B Testing", "Stakeholder Management"],
        projectSignals: ["dashboard", "metrics", "research"],
        preferredCertifications: ["Google Data Analytics Professional Certificate"],
        minExperience: 1,
        status: "active",
        postedAt: now,
        closesAt: nextMonth
      },
      {
        id: "intern-accessibility-engineering",
        type: "internship",
        title: "Accessibility Engineering Intern",
        companyId: "company-novalytics",
        createdBy: "user-recruiter-anjali",
        location: "Remote",
        remote: "remote",
        employmentType: "Internship",
        salaryRange: "INR 35K/month",
        description:
          "Audit UI flows, improve keyboard navigation, and build accessible React components with mentors.",
        requiredSkills: ["HTML", "CSS", "JavaScript", "Accessibility"],
        niceToHaveSkills: ["React", "User Research"],
        projectSignals: ["accessibility", "component", "audit"],
        preferredCertifications: [],
        minExperience: 0,
        status: "active",
        postedAt: now,
        closesAt: nextMonth
      }
    ],
    applications: [
      {
        id: "application-priya-ai-engineer",
        opportunityId: "job-ai-product-engineer",
        candidateId: "user-candidate-priya",
        status: "in_review",
        coverNote: "Excited to combine accessible frontend engineering with practical AI workflows.",
        eligibilitySnapshot: null,
        createdAt: now,
        updatedAt: now
      }
    ],
    bookmarks: [
      {
        id: "bookmark-priya-intern-accessibility",
        opportunityId: "intern-accessibility-engineering",
        candidateId: "user-candidate-priya",
        createdAt: now
      }
    ],
    reviews: [
      {
        id: "review-novalytics-1",
        companyId: "company-novalytics",
        userId: "user-candidate-priya",
        verifiedEmployment: true,
        status: "published",
        title: "Supportive managers and visible mentorship",
        comment:
          "The culture is inclusive, managers encourage mentorship, and flexible hybrid hours help with work life balance. Safety policy and late-night transport support are documented.",
        ratings: {
          workCulture: 4.6,
          safety: 4.8,
          mentorship: 4.5,
          careerGrowth: 4.2,
          workLifeBalance: 4.4
        },
        spam: { isSpam: false, reasons: [] },
        createdAt: now
      }
    ],
    notifications: [
      {
        id: "notification-priya-1",
        userId: "user-candidate-priya",
        title: "Application moved to review",
        body: "Novalytics AI is reviewing your AI Product Engineer application.",
        readAt: null,
        createdAt: now
      },
      {
        id: "notification-recruiter-1",
        userId: "user-recruiter-anjali",
        title: "New candidate application",
        body: "Priya Menon applied for AI Product Engineer.",
        readAt: null,
        createdAt: now
      }
    ],
    interviews: [],
    auditLogs: []
  };
}
