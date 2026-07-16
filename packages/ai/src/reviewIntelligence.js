const CULTURE_KEYWORDS = {
  workCulture: ["inclusive", "culture", "team", "respect", "collaborative", "bias"],
  safety: ["safe", "safety", "harassment", "transport", "late night", "policy"],
  mentorship: ["mentor", "manager", "support", "sponsor", "coaching"],
  careerGrowth: ["growth", "promotion", "learning", "leadership", "opportunity"],
  workLifeBalance: ["balance", "flexible", "remote", "hours", "leave", "hybrid"]
};

export function detectReviewSpam(review = {}) {
  const text = String(review.comment || "");
  const repeated = /(.)\1{9,}/.test(text);
  const linkHeavy = (text.match(/https?:\/\//gi) || []).length > 1;
  const tooShort = text.trim().split(/\s+/).length < 8;
  const allCaps = text.length > 20 && text === text.toUpperCase();

  return {
    isSpam: repeated || linkHeavy || tooShort || allCaps,
    reasons: [
      repeated ? "Repeated characters" : null,
      linkHeavy ? "Too many links" : null,
      tooShort ? "Too little detail" : null,
      allCaps ? "All caps text" : null
    ].filter(Boolean)
  };
}

function average(values) {
  const clean = values.filter((value) => Number.isFinite(value));
  return clean.length ? clean.reduce((sum, value) => sum + value, 0) / clean.length : 0;
}

function summarizeDimension(reviews, dimension) {
  const keywords = CULTURE_KEYWORDS[dimension];
  const snippets = reviews
    .filter((review) => keywords.some((keyword) => String(review.comment || "").toLowerCase().includes(keyword)))
    .map((review) => review.comment)
    .slice(0, 3);

  if (!snippets.length) {
    return "Insufficient review evidence yet.";
  }

  return snippets
    .map((snippet) => snippet.split(/[.!?]/)[0].trim())
    .filter(Boolean)
    .join("; ");
}

export function summarizeCompanyReviews(reviews = []) {
  const published = reviews.filter((review) => review.status === "published" && !review.spam?.isSpam);
  const dimensions = {
    workCulture: average(published.map((review) => Number(review.ratings?.workCulture))),
    safety: average(published.map((review) => Number(review.ratings?.safety))),
    mentorship: average(published.map((review) => Number(review.ratings?.mentorship))),
    careerGrowth: average(published.map((review) => Number(review.ratings?.careerGrowth))),
    workLifeBalance: average(published.map((review) => Number(review.ratings?.workLifeBalance)))
  };
  const verifiedRatio = published.length
    ? published.filter((review) => review.verifiedEmployment).length / published.length
    : 0;
  const overall = average(Object.values(dimensions));
  const trustScore = Math.round((overall / 5) * 78 + verifiedRatio * 22);

  return {
    reviewCount: published.length,
    dimensions,
    trustScore,
    summary: {
      workCulture: summarizeDimension(published, "workCulture"),
      safety: summarizeDimension(published, "safety"),
      mentorship: summarizeDimension(published, "mentorship"),
      careerGrowth: summarizeDimension(published, "careerGrowth"),
      workLifeBalance: summarizeDimension(published, "workLifeBalance")
    }
  };
}
