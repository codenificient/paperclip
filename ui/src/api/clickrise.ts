import { api } from "./client";

export interface ClickRiseTask {
  id: string;
  title: string;
  status: string;
  priority: string;
  projectId: string;
  projectName: string;
  assigneeId: string | null;
  dueDate: string | null;
  tags: string[];
}

export interface ClickRiseProject {
  id: string;
  name: string;
}

export interface ClickRiseTasksResponse {
  tasks: ClickRiseTask[];
  grouped: {
    in_progress: ClickRiseTask[];
    todo: ClickRiseTask[];
    review: ClickRiseTask[];
    done: ClickRiseTask[];
  };
  projects: ClickRiseProject[];
  summary: {
    total: number;
    inProgress: number;
    todo: number;
    review: number;
    done: number;
  };
}

export const clickriseApi = {
  tasks: (companyId: string, projectId?: string) =>
    api.get<ClickRiseTasksResponse>(
      `/companies/${companyId}/clickrise/tasks${projectId ? `?projectId=${projectId}` : ""}`,
    ),
};
