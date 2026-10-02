import { createSession } from './session';
export function loginHandler(email: string) {
  if (!email || !email.includes('@')) throw new Error('Enter a valid email');
  return createSession(email);
}
// Demo only: no password check or real authentication.
