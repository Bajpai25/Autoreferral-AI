import { Worker, Job, type ConnectionOptions } from "bullmq";

const connection: ConnectionOptions = {
    host: "localhost",
    port: 6379,
};

const worker = new Worker(
    "email-queue",
    async (job: Job) => {
        console.log("Processing Job:");

        console.log(job.data);

        await new Promise<void>((resolve) => setTimeout(resolve, 3000));

        console.log("Email Sent!");
    },
    { connection }
);

worker.on("completed", (job: Job) => {
    console.log(`Job ${job.id} completed`);
});

worker.on("failed", (job: Job | undefined, err: Error) => {
    console.log(err);
});