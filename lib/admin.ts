export function isMainAdminUsername(username: string) {
  const mainAdminUsername = process.env.ADMIN_USERNAME?.trim();
  return Boolean(mainAdminUsername) && username === mainAdminUsername;
}
