import { Request, Response } from "express";
import { prisma } from "../utils/constant";
import {
  addWorkflowJob,
  removeWorkflowJob,
  triggerWorkflowNow,
} from "../services/workflow.producer";

// ─── CREATE ───

export const createWorkflow = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const {
      name,
      targetCompany,
      cronExpression,
      maxConnections,
      connectionNote,
      nodesJson,
      edgesJson,
      outReachFlag = false,
      messageId,
    } = req.body;

    if (!name || !targetCompany) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: name, targetCompany",
      });
    }

    if (outReachFlag && !messageId) {
      return res.status(400).json({
        success: false,
        message: "Outreach workflows require a messageId",
      });
    }

    if (messageId) {
      const outreach = await prisma.outreach.findFirst({
        where: { id: messageId, userId },
      });
      if (!outreach) {
        return res.status(400).json({
          success: false,
          message: "Outreach message not found for this user",
        });
      }
    }

    const workflow = await prisma.workflow.create({
      data: {
        name,
        targetCompany,
        cronExpression: cronExpression || "0 9 * * *",
        maxConnections: maxConnections || 10,
        connectionNote: connectionNote || null,
        nodesJson: nodesJson || null,
        edgesJson: edgesJson || null,
        outReachFlag: Boolean(outReachFlag),
        messageId: messageId || null,
        userId,
        status: "active",
      },
    });

    // Register BullMQ repeatable cron job
    await addWorkflowJob(workflow.id, workflow.cronExpression);

    return res.status(201).json({
      success: true,
      message: "Workflow created and scheduled",
      data: workflow,
    });
  } catch (error) {
    console.error("Create workflow error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ─── GET ALL (by userId) ───

export const getWorkflows = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const workflows = await prisma.workflow.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
    });

    return res.status(200).json({ success: true, data: workflows });
  } catch (error) {
    console.error("Get workflows error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ─── GET ONE ───

export const getWorkflow = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    const workflow = await prisma.workflow.findUnique({ where: { id } });

    if (!workflow || workflow.userId !== userId) {
      return res.status(404).json({ success: false, message: "Workflow not found" });
    }

    return res.status(200).json({ success: true, data: workflow });
  } catch (error) {
    console.error("Get workflow error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ─── PUT (full update) ───

export const updateWorkflow = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    const existing = await prisma.workflow.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) {
      return res.status(404).json({ success: false, message: "Workflow not found" });
    }

    const {
      name,
      targetCompany,
      cronExpression,
      maxConnections,
      connectionNote,
      status,
      nodesJson,
      edgesJson,
      outReachFlag,
      messageId,
    } = req.body;

    const workflow = await prisma.workflow.update({
      where: { id },
      data: {
        name: name || existing.name,
        targetCompany: targetCompany || existing.targetCompany,
        cronExpression: cronExpression || existing.cronExpression,
        maxConnections: maxConnections ?? existing.maxConnections,
        connectionNote: connectionNote !== undefined ? connectionNote : existing.connectionNote,
        status: status || existing.status,
        nodesJson: nodesJson !== undefined ? nodesJson : existing.nodesJson,
        edgesJson: edgesJson !== undefined ? edgesJson : existing.edgesJson,
        outReachFlag: outReachFlag !== undefined ? Boolean(outReachFlag) : existing.outReachFlag,
        messageId: messageId !== undefined ? messageId : existing.messageId,
      },
    });

    // Re-register cron job if cron or status changed
    if (workflow.status === "active") {
      await addWorkflowJob(workflow.id, workflow.cronExpression);
    } else {
      await removeWorkflowJob(workflow.id);
    }

    return res.status(200).json({
      success: true,
      message: "Workflow updated",
      data: workflow,
    });
  } catch (error) {
    console.error("Update workflow error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ─── PATCH (partial update — toggle status, etc.) ───

export const patchWorkflow = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    const existing = await prisma.workflow.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) {
      return res.status(404).json({ success: false, message: "Workflow not found" });
    }

    // Only update fields that were actually sent in the request body
    const updateData: Record<string, any> = {};
    const allowedFields = [
      "name", "targetCompany", "cronExpression", "maxConnections",
      "connectionNote", "status", "nodesJson", "edgesJson",
      "outReachFlag", "messageId",
    ];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    }

    const workflow = await prisma.workflow.update({
      where: { id },
      data: updateData,
    });

    // Handle cron job based on status
    if (workflow.status === "active") {
      await addWorkflowJob(workflow.id, workflow.cronExpression);
    } else if (workflow.status === "inactive" || workflow.status === "paused") {
      await removeWorkflowJob(workflow.id);
    }

    return res.status(200).json({
      success: true,
      message: "Workflow patched",
      data: workflow,
    });
  } catch (error) {
    console.error("Patch workflow error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ─── DELETE ───

export const deleteWorkflow = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    const existing = await prisma.workflow.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) {
      return res.status(404).json({ success: false, message: "Workflow not found" });
    }

    // Remove BullMQ cron job first
    await removeWorkflowJob(id);

    await prisma.workflow.delete({ where: { id } });

    return res.status(200).json({
      success: true,
      message: "Workflow deleted",
    });
  } catch (error) {
    console.error("Delete workflow error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ─── TRIGGER NOW (manual run) ───

export const triggerWorkflow = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    const existing = await prisma.workflow.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) {
      return res.status(404).json({ success: false, message: "Workflow not found" });
    }

    await triggerWorkflowNow(id);

    return res.status(200).json({
      success: true,
      message: "Workflow triggered for immediate execution",
    });
  } catch (error) {
    console.error("Trigger workflow error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};
