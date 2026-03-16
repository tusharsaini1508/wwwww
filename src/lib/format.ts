export const formatNumber = (value: number): string => {
  if (Number.isNaN(value)) {
    return "0";
  }
  try {
    return new Intl.NumberFormat("en-US", {
      maximumFractionDigits: 2
    }).format(value);
  } catch {
    return value.toFixed(2);
  }
};

export const formatDelta = (value: number, unit: string): string => {
  const sign = value > 0 ? "+" : "";
  return `${sign}${formatNumber(value)}${unit}`;
};
