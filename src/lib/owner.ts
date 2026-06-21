/*
 * Tracks which bracket THIS browser owns. Once a participant saves their picks,
 * their bracket name is stored here so they can only edit their own bracket and
 * can't create a second one.
 */
const KEY = "802-my-bracket";

export const getMyBracket = (): string | null => {
  if (typeof localStorage === "undefined") return null;
  return localStorage.getItem(KEY) || null;
};

export const setMyBracket = (name: string) => {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(KEY, name);
};

export const clearMyBracket = () => {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(KEY);
};

// Case-insensitive ownership check.
export const ownsBracket = (name: string): boolean => {
  const mine = getMyBracket();
  return !!mine && mine.toLowerCase() === name.trim().toLowerCase();
};
