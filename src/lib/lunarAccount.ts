export function isRealLunarUser(user: {
  isAnonymous: boolean
} | null): boolean {
  return Boolean(user && !user.isAnonymous)
}
