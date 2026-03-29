import { Router } from "express";
import { assertCompanyAccess } from "./authz.js";

const CLICKRISE_MCP_URL = "https://clickrise.vercel.app/api/mcp";

interface McpResponse {
  jsonrpc: string;
  result?: { content: Array<{ type: string; text: string }> };
  error?: { code: number; message: string };
  id: number;
}

async function mcpCall(apiKey: string, toolName: string, args: Record<string, unknown>) {
  const res = await fetch(CLICKRISE_MCP_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "tools/call",
      params: { name: toolName, arguments: args },
      id: Date.now(),
    }),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`MCP ${res.status}`);
  const data: McpResponse = await res.json();
  if (data.error) throw new Error(data.error.message);
  const text = data.result?.content?.[0]?.text;
  return text ? JSON.parse(text) : null;
}

// Simple in-memory cache per company
const cache = new Map<string, { data: unknown; ts: number }>();
const CACHE_TTL = 60_000;

export function clickriseRoutes() {
  const router = Router();

  router.get("/companies/:companyId/clickrise/tasks", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);

    const apiKey = (req.query.apiKey as string) || process.env.CLICKRISE_API_KEY || "";
    if (!apiKey) {
      res.status(400).json({ error: "CLICKRISE_API_KEY not configured" });
      return;
    }

    const projectId = req.query.projectId as string | undefined;
    const status = req.query.status as string | undefined;
    const cacheKey = `${companyId}:${projectId || "all"}:${status || "all"}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      res.json(cached.data);
      return;
    }

    try {
      const args: Record<string, unknown> = {};
      if (status) args.status = status;
      if (projectId) args.projectId = projectId;

      const [result, projects] = await Promise.all([
        mcpCall(apiKey, "list_tasks", args),
        mcpCall(apiKey, "list_projects", {}),
      ]);

      const projectMap = new Map<string, string>();
      if (projects?.projects) {
        for (const p of projects.projects) {
          projectMap.set(p.id, p.name);
        }
      }

      const tasks = (result?.tasks || []).map((t: Record<string, unknown>) => ({
        ...t,
        projectName: projectMap.get(t.projectId as string) || "Unknown",
      }));

      const grouped = {
        in_progress: tasks.filter((t: { status: string }) => t.status === "in_progress"),
        todo: tasks.filter((t: { status: string }) => t.status === "todo"),
        review: tasks.filter((t: { status: string }) => t.status === "review"),
        done: tasks.filter((t: { status: string }) => t.status === "done"),
      };

      const response = {
        tasks,
        grouped,
        projects: projects?.projects || [],
        summary: {
          total: tasks.length,
          inProgress: grouped.in_progress.length,
          todo: grouped.todo.length,
          review: grouped.review.length,
          done: grouped.done.length,
        },
      };

      cache.set(cacheKey, { data: response, ts: Date.now() });
      res.json(response);
    } catch (err) {
      res.status(502).json({ error: String(err) });
    }
  });

  return router;
}
