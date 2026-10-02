export type FlightRecorderSeg = {
  id: string;
  kind: "req" | "tool";
  name: string;
  t0: number;
  t1: number | null;
  out: number;
  tok: number;
  cost: number;
  err: boolean;
};

export type FlightRecorderLane = {
  id: string;
  label: string;
  type: string;
  model: string;
  parent: string;
  toolUseId: string;
  t0: number;
  done: number | null;
  segs: FlightRecorderSeg[];
};

export type FlightRecorderTurn = {
  n: number;
  id: string;
  prompt: string;
  t0: number;
  t1: number | null;
  lanes: FlightRecorderLane[];
};

export type FlightRecorderRec = { count: number; turns: FlightRecorderTurn[] };
export type FlightRecorderView = { turns: number };

declare module "claude-code" {
  interface PluginState {
    "flight-recorder": {
      rec: FlightRecorderRec;
      view: FlightRecorderView;
    };
  }
}
