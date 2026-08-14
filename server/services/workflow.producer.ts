import { Queue, type ConnectionOptions } from "bullmq";

const connection: ConnectionOptions = {
  host: "localhost",
  port: 6379,
};

// Dedicated queue for workflow automation jobs
const workflowQueue = new Queue("workflow-queue", { connection  , defaultJobOptions: {
    // Keep 0 completed jobs (delete instantly)
    removeOnComplete: true,
} 
  });



/**
 * Register a repeatable cron job for a workflow.
 * BullMQ handles cron scheduling natively.
 */
export async function addWorkflowJob(
  workflowId: string,
  cronExpression: string
): Promise<void> {
  // Remove any existing repeatable job for this workflow first
  await removeWorkflowJob(workflowId);

  await workflowQueue.add(
    "execute-workflow",
    { workflowId },
    {
      repeat: {
      pattern: cronExpression,
      limit: 1, // 👈 Tells BullMQ to automatically delete the parent cron configuration after 1 execution!
    },
      jobId: workflowId, // use workflowId as jobId so we can reference it later
    }
  );

  console.log(
    `📅 Registered cron job for workflow ${workflowId}: ${cronExpression}`
  );
}

/**
 * Remove a repeatable cron job for a workflow.
 */
export async function removeWorkflowJob(
  workflowId: string
): Promise<void> {
  const repeatableJobs = await workflowQueue.getRepeatableJobs();
  for (const job of repeatableJobs) {
    if (job.id === workflowId) {
      await workflowQueue.removeRepeatableByKey(job.key);
      console.log(`🗑️  Removed cron job for workflow ${workflowId}`);
    }
  }
}

/**
 * Trigger a workflow immediately (one-shot, no cron).
 */
export async function triggerWorkflowNow(
  workflowId: string
): Promise<void> {
  await workflowQueue.add(
    "execute-workflow",
    { workflowId },
    { jobId: `${workflowId}-manual-${Date.now()}` }
  );
  console.log(`⚡ Triggered immediate execution for workflow ${workflowId}`);
}

// export async function isEmptyQueue(queue: Queue): Promise<boolean> {
//   // Get counts only for jobs that are actively waiting to be processed, 
//   // currently processing, or failed and stuck. 
//   // We explicitly omit 'delayed' because that's where future cron ticks live.
//   const jobCounts = await queue.getJobCounts('wait', 'active', 'paused', 'failed');
  
//   const activeProcessingCount = jobCounts.wait + jobCounts.active + jobCounts.paused + jobCounts.failed;
//   console.log(jobCounts.wait, jobCounts.active, jobCounts.paused, jobCounts.failed );
  
//   console.log(`👷 Active/Waiting Jobs: ${activeProcessingCount} (Omitted future cron ticks)`);
  
//   return activeProcessingCount === 0;
// }



export { workflowQueue };
