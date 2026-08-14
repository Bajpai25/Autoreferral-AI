import { Router } from "express";
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

const router = Router();

// All routes require authentication
router.post("/", authenticateUser, createWorkflow);
router.get("/", authenticateUser, getWorkflows);
router.get("/:id", authenticateUser, getWorkflow);
router.put("/:id", authenticateUser, updateWorkflow);
router.patch("/:id", authenticateUser, patchWorkflow);
router.delete("/:id", authenticateUser, deleteWorkflow);
router.post("/:id/trigger", authenticateUser, triggerWorkflow);

export default router;
