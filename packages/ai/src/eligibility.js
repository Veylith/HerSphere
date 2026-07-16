function normalizeSkill(skill) {
  return String(skill).trim().toLowerCase();
}

function toSet(values = []) {
  return new Set(values.map(normalizeSkill).filter(Boolean));
}

export function analyzeEligibility(candidateProfile = {}, opportunity = {}) {
  const candidateSkills = toSet(candidateProfile.skills || []);
  const requiredSkills = (opportunity.requiredSkills || []).map(normalizeSkill).filter(Boolean);
  const niceToHaveSkills = (opportunity.niceToHaveSkills || []).map(normalizeSkill).filter(Boolean);
  const matchedRequired = requiredSkills.filter((skill) => candidateSkills.has(skill));
  const matchedNice = niceToHaveSkills.filter((skill) => candidateSkills.has(skill));
  const missingRequired = requiredSkills.filter((skill) => !candidateSkills.has(skill));
  const experienceYears = Number(candidateProfile.experienceYears ?? candidateProfile.experience?.years ?? 0);
  const minExperience = Number(opportunity.minExperience ?? 0);
  const experienceFit = minExperience === 0 ? 1 : Math.min(1, experienceYears / minExperience);

  const requiredScore = requiredSkills.length ? matchedRequired.length / requiredSkills.length : 1;
  const niceScore = niceToHaveSkills.length ? matchedNice.length / niceToHaveSkills.length : 0.8;
  const profileDepth = Math.min(
    1,
    ((candidateProfile.projects?.length || 0) * 0.12) +
      ((candidateProfile.certifications?.length || 0) * 0.08) +
      ((candidateProfile.education?.length || 0) * 0.1) +
      0.55
  );

  const eligibilityScore = Math.round(
    (requiredScore * 0.56 + niceScore * 0.16 + experienceFit * 0.18 + profileDepth * 0.1) * 100
  );
  const confidenceScore = Math.round(
    (Math.min(1, candidateSkills.size / 8) * 0.45 +
      Math.min(1, requiredSkills.length / 5) * 0.25 +
      profileDepth * 0.3) *
      100
  );

  const reasoning = [
    matchedRequired.length
      ? `Matched ${matchedRequired.length} required skill${matchedRequired.length === 1 ? "" : "s"}.`
      : "No required skills matched yet.",
    missingRequired.length
      ? `Missing ${missingRequired.slice(0, 4).join(", ")}${missingRequired.length > 4 ? " and more" : ""}.`
      : "All required skills are present.",
    experienceFit >= 1
      ? "Experience requirement is satisfied."
      : `Experience is below the ${minExperience} year target.`
  ];

  return {
    eligibilityScore,
    confidenceScore,
    matchedRequired,
    matchedNice,
    missingRequired,
    experienceFit: Math.round(experienceFit * 100),
    reasoning
  };
}

export function rankOpportunities(candidateProfile = {}, opportunities = []) {
  return opportunities
    .map((opportunity) => ({
      ...opportunity,
      match: analyzeEligibility(candidateProfile, opportunity)
    }))
    .sort((a, b) => b.match.eligibilityScore - a.match.eligibilityScore);
}
