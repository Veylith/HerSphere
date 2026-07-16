import { rankOpportunities } from "./eligibility.js";
import { buildLearningRoadmap, detectSkillGap } from "./skillGap.js";

export function recommendJobs(candidateProfile = {}, opportunities = []) {
  const ranked = rankOpportunities(candidateProfile, opportunities);
  const interests = (candidateProfile.interests || []).map((item) => String(item).toLowerCase());
  const goals = String(candidateProfile.careerGoal || "").toLowerCase();

  return ranked
    .map((opportunity) => {
      const searchable = [
        opportunity.title,
        opportunity.description,
        ...(opportunity.requiredSkills || []),
        ...(opportunity.niceToHaveSkills || [])
      ]
        .join(" ")
        .toLowerCase();
      const interestBoost = interests.some((interest) => searchable.includes(interest)) ? 5 : 0;
      const goalBoost = goals && searchable.includes(goals) ? 4 : 0;

      return {
        ...opportunity,
        recommendationScore: Math.min(100, opportunity.match.eligibilityScore + interestBoost + goalBoost),
        recommendationReason:
          opportunity.match.eligibilityScore >= 80
            ? "Strong fit based on skills and experience."
            : "Good growth opportunity with a clear learning path."
      };
    })
    .sort((a, b) => b.recommendationScore - a.recommendationScore)
    .slice(0, 8);
}

export function recommendLearning(candidateProfile = {}, targetOpportunity = {}) {
  const gap = detectSkillGap(candidateProfile, targetOpportunity);
  return buildLearningRoadmap(gap, candidateProfile.careerGoal || targetOpportunity.title || "career goal");
}
