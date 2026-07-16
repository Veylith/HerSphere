export const SKILL_TAXONOMY = {
  frontend: [
    "html",
    "css",
    "javascript",
    "typescript",
    "react",
    "next.js",
    "vue",
    "accessibility",
    "responsive design"
  ],
  backend: [
    "node.js",
    "express",
    "fastify",
    "java",
    "spring boot",
    "python",
    "django",
    "rest api",
    "graphql",
    "microservices"
  ],
  data: [
    "sql",
    "postgresql",
    "mysql",
    "mongodb",
    "redis",
    "etl",
    "data modeling",
    "power bi",
    "tableau",
    "excel"
  ],
  ai: [
    "machine learning",
    "deep learning",
    "nlp",
    "python",
    "pandas",
    "numpy",
    "scikit-learn",
    "tensorflow",
    "pytorch",
    "llm",
    "prompt engineering"
  ],
  product: [
    "product management",
    "user research",
    "roadmapping",
    "analytics",
    "a/b testing",
    "figma",
    "wireframing",
    "stakeholder management"
  ],
  cloud: [
    "aws",
    "azure",
    "gcp",
    "docker",
    "kubernetes",
    "ci/cd",
    "terraform",
    "devops",
    "observability"
  ],
  security: [
    "oauth",
    "jwt",
    "owasp",
    "rate limiting",
    "xss prevention",
    "csrf prevention",
    "secure coding"
  ],
  soft: [
    "communication",
    "leadership",
    "mentoring",
    "collaboration",
    "problem solving",
    "presentation"
  ]
};

export const CERTIFICATION_KEYWORDS = [
  "aws certified",
  "azure fundamentals",
  "google cloud",
  "scrum master",
  "pmp",
  "oracle certified",
  "meta frontend",
  "ibm data science",
  "nptel",
  "coursera",
  "udemy",
  "professional certificate"
];

export const DEGREE_KEYWORDS = [
  "b.tech",
  "bachelor",
  "b.e",
  "m.tech",
  "master",
  "mca",
  "mba",
  "bca",
  "phd",
  "diploma"
];

export const ROADMAP_LIBRARY = {
  react: {
    course: "Advanced React and frontend architecture",
    project: "Build an accessible analytics dashboard with API integration",
    certification: "Meta Front-End Developer Professional Certificate"
  },
  "node.js": {
    course: "Production Node.js APIs with authentication and observability",
    project: "Create a role-based REST API with audit logging",
    certification: "OpenJS Node.js Application Developer"
  },
  postgresql: {
    course: "PostgreSQL indexing, query planning, and schema design",
    project: "Design a normalized hiring marketplace database",
    certification: "EDB PostgreSQL Associate"
  },
  "machine learning": {
    course: "Applied machine learning for recommendation systems",
    project: "Train a skill-match ranking model using candidate/job profiles",
    certification: "IBM Machine Learning Professional Certificate"
  },
  docker: {
    course: "Containerized deployment and CI/CD foundations",
    project: "Deploy a multi-service app with Docker Compose",
    certification: "Docker Certified Associate preparation"
  },
  "product management": {
    course: "Product strategy, metrics, and discovery interviews",
    project: "Create a PRD and metric tree for a career platform feature",
    certification: "Certified Scrum Product Owner"
  }
};

export function allKnownSkills() {
  return [...new Set(Object.values(SKILL_TAXONOMY).flat())];
}
