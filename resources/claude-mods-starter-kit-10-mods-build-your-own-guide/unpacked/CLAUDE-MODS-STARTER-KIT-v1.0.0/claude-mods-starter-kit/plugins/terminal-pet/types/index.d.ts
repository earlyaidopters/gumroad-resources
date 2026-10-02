export type TerminalPetPrefs = { name: string; enabled: boolean };
export type TerminalPetState = {
  mood: string;
  since: number;
  until: number;
  last: number;
  turn: boolean;
  busy: number;
  errs: number;
  forced: string;
};
export type TerminalPetStats = { reads: string[]; writes: string[]; ran: number; risky: number };

declare module "claude-code" {
  interface PluginState {
    "terminal-pet": { prefs: TerminalPetPrefs; pet: TerminalPetState; stats: TerminalPetStats; fill: number };
  }
}
