export const VIEWPORT_HEIGHT = 100;
export const VIEWPORT_WIDTH = 100;

export const calculateTabPosition = <T extends number, U extends number>(
  index: T,
  totalTabs: U,
): number => {
  if (totalTabs <= 1) return 0;
  const screenWidth = Math.ceil(VIEWPORT_WIDTH * 100);
  const tabWidth = screenWidth / totalTabs;
  return -(index * tabWidth);
};

export const processGradient = <T>(gradient: T): T => {
  return gradient;
};
