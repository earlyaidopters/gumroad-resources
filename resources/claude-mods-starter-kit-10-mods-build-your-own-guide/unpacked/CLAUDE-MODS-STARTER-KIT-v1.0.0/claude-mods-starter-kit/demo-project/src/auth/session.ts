import { makeDemoToken } from './tokens';
export function createSession(email: string) {
  return { email, token: makeDemoToken(), expiresInMinutes: 30 };
}
