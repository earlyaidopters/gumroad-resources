import { loginHandler } from '../auth/login';
export function submitLoginForm(email: string) { return loginHandler(email.trim()); }
// UI adapter for the learning fixture, not a running React app.
