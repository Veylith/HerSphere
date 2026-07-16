import { ROADMAP_LIBRARY } from "./taxonomy.js";
import { analyzeEligibility } from "./eligibility.js";

function normalize(skill) {
  return String(skill).trim().toLowerCase();
}

export function detectSkillGap(candidateProfile = {}, opportunity = {}) {
  const eligibility = analyzeEligibility(candidateProfile, opportunity);
  const candidateProjects = (candidateProfile.projects || []).join(" ").toLowerCase();
  const projectSignals = (opportunity.projectSignals || opportunity.requiredSkills || [])
    .map(normalize)
    .filter(Boolean);
  const missingProjects = projectSignals
    .filter((signal) => !candidateProjects.includes(signal))
    .slice(0, 4);

  const candidateCertifications = (candidateProfile.certifications || []).join(" ").toLowerCase();
  const missingCertifications = (opportunity.preferredCertifications || [])
    .map(normalize)
    .filter((cert) => !candidateCertifications.includes(cert))
    .slice(0, 4);

  const missingExperience =
    Number(candidateProfile.experienceYears ?? candidateProfile.experience?.years ?? 0) <
    Number(opportunity.minExperience ?? 0)
      ? [`Gain ${Number(opportunity.minExperience ?? 0)}+ years or equivalent project experience`]
      : [];

  return {
    missingSkills: eligibility.missingRequired,
    missingProjects,
    missingCertifications,
    missingExperience,
    priority: eligibility.missingRequired.slice(0, 3)
  };
}

export function buildLearningRoadmap(gap = {}, careerGoal = "target role") {
  const focusSkills = [...new Set([...(gap.priority || []), ...(gap.missingSkills || [])])].slice(0, 5);
  const modules = focusSkills.map((skill, index) => {
    const libraryItem = ROADMAP_LIBRARY[skill] || {
      course: `Focused ${skill} practice path`,
      project: `Ship a portfolio project that demonstrates ${skill}`,
      certification: `${skill} verified assessment`
    };

    return {
      phase: index + 1,
      focus: skill,
      durationWeeks: index < 2 ? 2 : 3,
      course: libraryItem.course,
      project: libraryItem.project,
      certification: libraryItem.certification,
      successMetric: `Publish evidence of ${skill} applied to a ${careerGoal} workflow`
    };
  });

  return {
    careerGoal,
    modules,
    hackathons: [
      "Women-focused product innovation challenge",
      "Open-source accessibility contribution sprint",
      "AI for social impact weekend build"
    ],
    internships: focusSkills.length
      ? [`Apply for internships requiring ${focusSkills.slice(0, 2).join(" and ")}`]
      : ["Apply for cross-functional internships aligned with your interests"]
  };
}
