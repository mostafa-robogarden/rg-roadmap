export type SkillLevel = "BEGINNER" | "TINKERER" | "COMPETENT";

export function computeSkillLevel(totalScore: number, maximumScore: number): SkillLevel {
  if (maximumScore <= 0) return "BEGINNER";
  const ratio = totalScore / maximumScore;
  if (ratio < 0.34) return "BEGINNER";
  if (ratio < 0.67) return "TINKERER";
  return "COMPETENT";
}
