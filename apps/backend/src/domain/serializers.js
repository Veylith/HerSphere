export function publicUser(user) {
  if (!user) return null;
  const { passwordHash, resetToken, emailVerificationToken, ...safe } = user;
  return safe;
}

export function enrichOpportunity(opportunity, store) {
  const company = store.findById("companies", opportunity.companyId);
  return {
    ...opportunity,
    company
  };
}

export function profileForUser(user, store) {
  if (!user) return null;
  if (user.role === "candidate") {
    return store.findOne("candidateProfiles", (profile) => profile.userId === user.id);
  }
  if (user.role === "recruiter") {
    return store.findById("companies", user.companyId);
  }
  return null;
}
