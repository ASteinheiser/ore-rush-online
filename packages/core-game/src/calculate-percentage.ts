/** Calculates a percentage, rounded to the nearest hundredth */
export const calculatePercentage = (current: number, total: number) => {
  if (total <= 0) return 0;
  const percentage = (current / total) * 100;
  return Math.round(percentage * 100) / 100;
};
