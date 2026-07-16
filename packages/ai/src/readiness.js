export function calculateCareerReadiness(profile = {}, resumeAnalysis = {}) {
  const skills = profile.skills || resumeAnalysis.skills || [];
  const education = profile.education || resumeAnalysis.education || [];
  const projects = profile.projects || resumeAnalysis.projects || [];
  const certifications = profile.certifications || resumeAnalysis.certifications || [];
  const achievements = profile.achievements || resumeAnalysis.achievements || [];
  const experienceYears = Number(profile.experienceYears ?? profile.experience?.years ?? resumeAnalysis.experience?.years ?? 0);

  const resumeScore = Math.min(
    100,
    Math.round(
      (skills.length >= 6 ? 28 : skills.length * 4) +
        (education.length ? 16 : 0) +
        (projects.length >= 2 ? 22 : projects.length * 11) +
        (experienceYears ? 18 : 0) +
        (certifications.length ? 10 : 0) +
        (achievements.length ? 6 : 0)
    )
  );

  const technicalScore = Math.min(
    100,
    Math.round(skills.length * 8 + projects.length * 12 + certifications.length * 8 + Math.min(20, experienceYears * 6))
  );

  const interviewReadiness = Math.min(
    100,
    Math.round(35 + projects.length * 12 + achievements.length * 8 + Math.min(25, experienceYears * 7))
  );

  const overallCareerScore = Math.round(
    resumeScore * 0.34 + technicalScore * 0.36 + interviewReadiness * 0.3
  );

  return {
    resumeScore,
    technicalScore,
    interviewReadiness,
    overallCareerScore,
    profileStrength: Math.min(
      100,
      Math.round(
        20 +
          skills.length * 4 +
          education.length * 10 +
          projects.length * 8 +
          certifications.length * 5 +
          achievements.length * 4
      )
    )
  };
}
