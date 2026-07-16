import { CERTIFICATION_KEYWORDS, DEGREE_KEYWORDS, allKnownSkills } from "./taxonomy.js";

function normalizeText(text = "") {
  return String(text).replace(/\r/g, "\n").replace(/[ \t]+/g, " ").trim();
}

function titleCase(value) {
  return value
    .split(" ")
    .map((word) => (word.length <= 2 ? word.toUpperCase() : word[0].toUpperCase() + word.slice(1)))
    .join(" ");
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

export function extractSkills(text = "") {
  const normalized = normalizeText(text).toLowerCase();
  return allKnownSkills()
    .filter((skill) => normalized.includes(skill.toLowerCase()))
    .map(titleCase)
    .sort();
}

export function extractEducation(text = "") {
  const lines = normalizeText(text).split("\n").map((line) => line.trim()).filter(Boolean);
  return lines
    .filter((line) => DEGREE_KEYWORDS.some((degree) => line.toLowerCase().includes(degree)))
    .map((line) => line.replace(/^education[:\-\s]*/i, "").trim())
    .slice(0, 6);
}

export function extractExperience(text = "") {
  const normalized = normalizeText(text);
  const years = [...normalized.matchAll(/(\d+(?:\.\d+)?)\+?\s*(?:years|yrs)/gi)]
    .map((match) => Number(match[1]))
    .filter((value) => Number.isFinite(value));

  const lines = normalized.split("\n").map((line) => line.trim()).filter(Boolean);
  const roles = lines
    .filter((line) => /(engineer|developer|analyst|manager|designer|intern|consultant|lead|specialist)/i.test(line))
    .slice(0, 6);

  return {
    years: years.length ? Math.max(...years) : 0,
    roles
  };
}

export function extractProjects(text = "") {
  return normalizeText(text)
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /(project|built|created|developed|implemented|designed|deployed)/i.test(line))
    .map((line) => line.replace(/^projects?[:\-\s]*/i, "").trim())
    .slice(0, 8);
}

export function extractCertifications(text = "") {
  const normalized = normalizeText(text).toLowerCase();
  const matched = CERTIFICATION_KEYWORDS
    .filter((keyword) => normalized.includes(keyword))
    .map(titleCase);

  const lines = normalizeText(text)
    .split("\n")
    .filter((line) => /(certification|certified|certificate|coursera|udemy|nptel)/i.test(line))
    .map((line) => line.replace(/^certifications?[:\-\s]*/i, "").trim());

  return unique([...matched, ...lines]).slice(0, 8);
}

export function extractAchievements(text = "") {
  return normalizeText(text)
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /(award|winner|rank|published|speaker|scholarship|hackathon|recognized|achieved)/i.test(line))
    .slice(0, 8);
}

export function analyzeResume(text = "") {
  const normalized = normalizeText(text);
  const skills = extractSkills(normalized);
  const education = extractEducation(normalized);
  const experience = extractExperience(normalized);
  const projects = extractProjects(normalized);
  const certifications = extractCertifications(normalized);
  const achievements = extractAchievements(normalized);

  const completenessFactors = [
    skills.length >= 5,
    education.length > 0,
    experience.roles.length > 0 || experience.years > 0,
    projects.length > 0,
    certifications.length > 0,
    achievements.length > 0
  ];

  const resumeScore = Math.round(
    (completenessFactors.filter(Boolean).length / completenessFactors.length) * 100
  );

  return {
    skills,
    education,
    experience,
    projects,
    certifications,
    achievements,
    resumeScore,
    confidence: normalized.length < 120 ? 0.42 : Math.min(0.94, 0.56 + normalized.length / 2600),
    extractedAt: new Date().toISOString()
  };
}
