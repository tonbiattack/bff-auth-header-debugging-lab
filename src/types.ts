export type Profile = {
  id: string;
  displayName: string;
};

export type Task = {
  id: string;
  status: "OPEN" | "DONE";
};

export type DashboardResponse = {
  displayName: string;
  openTaskCount: number;
};
