/**
 * People sign in with a username, like on Radarr or Sonarr. The auth library
 * still wants an email address per account, so each username gets a made-up
 * one on a reserved domain that nothing is ever sent to.
 */
export const USERNAME_PATTERN = /^[a-z0-9][a-z0-9._-]{1,31}$/i;

export const loginEmail = (username: string) => `${username.trim().toLowerCase()}@learnarr.local`;

/** What the sign-in form sends: a username, or the email an older account was made with. */
export const signInEmail = (identifier: string) =>
  identifier.includes("@") ? identifier.trim() : loginEmail(identifier);
