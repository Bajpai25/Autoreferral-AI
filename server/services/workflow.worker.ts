import { Worker, Job, type ConnectionOptions } from "bullmq";
import { executeWorkflow } from "./workflow.service";
import { prisma } from "../utils/constant";
import {sendMessagesToCompanyEmployees} from "../controllers/outreach.controller";

const connection: ConnectionOptions = {
  host: "localhost",
  port: 6379,
};

// BullMQ Worker — processes workflow jobs in the background
const workflowWorker = new Worker(
  "workflow-queue",
  async (job: Job) => {
    const { workflowId } = job.data as { workflowId: string };
    console.log(`\n⚙️  Worker picked up job for workflow: ${workflowId}`);

    try {
      // Update status to running
      await prisma.workflow.update({
        where: { id: workflowId },
        data: { status: "running" },
      });

      // Execute the workflow
      const result = await executeWorkflow(workflowId);
      console.log(
        `✅ Workflow ${workflowId} completed: ${result.results.filter((r) => r.status === "sent").length} connections sent`
      );
      await prisma.workflow.update({
        where:{id:workflowId},
        data:{status:"completed"},
      })

      return result;
    } catch (error) {
      console.error(`❌ Workflow ${workflowId} failed:`, error);

      // Update status to failed
      try {
        await prisma.workflow.update({
          where: { id: workflowId },
          data: { status: "failed" },
        });
      } catch {}

      throw error;
    }
  },
  {
    connection,
    concurrency: 100, // max 100 workflows running simultaneously
  }
);

// ─── Event Listeners ───

workflowWorker.on("completed", (job: Job) => {
  console.log(`✅ Job ${job.id} completed successfully`);
});

workflowWorker.on("failed", (job: Job | undefined, err: Error) => {
  console.error(`❌ Job ${job?.id} failed:`, err.message);
});

workflowWorker.on("error", (err: Error) => {
  console.error("Worker error:", err);
});

// ─── Graceful Shutdown ───

async function gracefulShutdown() {
  console.log("🔒 Shutting down workflow worker...");
  await workflowWorker.close();
  console.log("🔒 Worker stopped");
}

process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);

console.log("🏭 Workflow worker started — listening for jobs on 'workflow-queue'");

export { workflowWorker };
