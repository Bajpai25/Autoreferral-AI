import { Router, Request, Response } from "express";
import { authenticateUser } from "../controllers/user.controller";
import {
  createWorkflow,
  getWorkflows,
  getWorkflow,
  updateWorkflow,
  patchWorkflow,
  deleteWorkflow,
  triggerWorkflow,
} from "../controllers/workflow.controller";
import type { ConnectionResult } from "../services/workflow.service"

const router = Router();

// In-memory store for workflow connection events (used for polling/testing)
const workflowResults = new Map<string, ConnectionResult[]>();
// SSE subscribers per workflowId
const workflowSubscribers = new Map<string, Set<Response>>();

// POST /workflow-results
// Accepts a single ConnectionResult or an array; payload should include `workflowId`.
router.post("/workflow-results", (req, res) => {
  try {
    const payload = req.body;
    console.log('/workflow-results POST received:', payload);
    const items = Array.isArray(payload) ? payload : [payload];

    items.forEach((p: any) => {
      const wid = String(p.workflowId || "unknown");
      const arr = workflowResults.get(wid) || [];
      const entry: ConnectionResult = {
        name: p.name,
        profileUrl: p.profileUrl,
        status: p.status === "sent" ? "sent" : "failed",
        error: p.error || undefined,
      };
      arr.push(entry);
      workflowResults.set(wid, arr);

      // Broadcast to connected SSE clients for this workflowId
      const subs = workflowSubscribers.get(wid);
      if (subs) {
        const payloadStr = JSON.stringify(entry);
        subs.forEach((resp) => {
          try {
            resp.write(`data: ${payloadStr}\n\n`);
          } catch (err) {
            // ignore
          }
        });
      }
    });

    // return the saved entries for the workflowId (for easier verification)
    const firstWid = String((items[0] && items[0].workflowId) || 'unknown');
    const saved = workflowResults.get(firstWid) || [];
    console.log(`/workflow-results stored for ${firstWid}:`, saved.length);
    return res.status(201).json({ ok: true, workflowId: firstWid, savedCount: saved.length, saved });
  } catch (err) {
    console.error("/workflow-results POST error:", err);
    return res.status(500).json({ error: "internal" });
  }
});

// GET /workflow-results?workflowId=...  (for frontend polling)
router.get("/workflow-results", (req, res) => {
  const workflowId = req.query.workflowId;
  const items = workflowId
    ? workflowResults.get(String(workflowId)) || []
    : Array.from(workflowResults.values()).flat();
  return res.json(items);
});

// SSE stream endpoint: client connects and receives events for a workflowId
// router.get("/workflow-results/stream", (req, res) => {
//   const wid = String(req.query.workflowId || "unknown");

//   res.setHeader("Content-Type", "text/event-stream");
//   res.setHeader("Cache-Control", "no-cache");
//   res.setHeader("Connection", "keep-alive");
//   res.flushHeaders?.();

//   // initial comment
//   res.write(`: connected\n\n`);

//   const subs = workflowSubscribers.get(wid) || new Set<Response>();
//   subs.add(res);
//   workflowSubscribers.set(wid, subs);

//   req.on("close", () => {
//     const s = workflowSubscribers.get(wid);
//     if (s) {
//       s.delete(res);
//       if (s.size === 0) workflowSubscribers.delete(wid);
//     }
//   });
// });

// All other routes require authentication
router.post("/", authenticateUser, createWorkflow);
router.get("/", authenticateUser, getWorkflows);
router.get("/:id", authenticateUser, getWorkflow);
router.put("/:id", authenticateUser, updateWorkflow);
router.patch("/:id", authenticateUser, patchWorkflow);
router.delete("/:id", authenticateUser, deleteWorkflow);
router.post("/:id/trigger", authenticateUser, triggerWorkflow);

export default router;
