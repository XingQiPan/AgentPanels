export type OccDoctorHealth = {
  ok: boolean;
  output?: string;
  error?: string;
};

export type OccHealth = {
  path: string | null;
  version: string | null;
  versionError?: string;
  doctor: OccDoctorHealth;
};

export type HealthResponse = {
  ok: boolean;
  service: "agentpanels-backend";
  timestamp: string;
  occ: OccHealth;
};
