import { analyzeEligibility } from "./eligibility.js";
import { calculateCareerReadiness } from "./readiness.js";

export function rankCandidates(candidates = [], opportunity = {}) {
  return candidates
    .map((candidate) => {
      const eligibility = analyzeEligibility(candidate.profile, opportunity);
      const readiness = calculateCareerReadiness(candidate.profile);
      const rankingScore = Math.round(
        eligibility.eligibilityScore * 0.62 +
          readiness.overallCareerScore * 0.28 +
          (candidate.profile.verifiedPortfolio ? 10 : 0)
      );

      return {
        ...candidate,
        rankingScore: Math.min(100, rankingScore),
        eligibility,
        readiness
      };
    })
    .sort((a, b) => b.rankingScore - a.rankingScore);
}
