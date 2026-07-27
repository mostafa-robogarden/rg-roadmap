export function computeSkillLevel(totalScore, maximumScore) {
    if (maximumScore <= 0)
        return "BEGINNER";
    const ratio = totalScore / maximumScore;
    if (ratio < 0.34)
        return "BEGINNER";
    if (ratio < 0.67)
        return "TINKERER";
    return "COMPETENT";
}
