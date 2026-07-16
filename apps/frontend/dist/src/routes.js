export const requiredRoutes = [
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

export const navItems = [
  { label: "Jobs", path: "/jobs" },
  { label: "Internships", path: "/internships" },
  { label: "Reviews", path: "/company-reviews" },
  { label: "AI Analysis", path: "/ai-analysis" },
  { label: "Resume", path: "/resume-builder" },
  { label: "Roadmap", path: "/learning-roadmap" }
];

export const dashboardByRole = {
  candidate: "/candidate-dashboard",
  recruiter: "/recruiter-dashboard",
  admin: "/admin-dashboard"
};
