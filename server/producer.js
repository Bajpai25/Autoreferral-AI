import { Worker } from "bullmq";

const worker = new Worker(
    "email-queue",
    async (job) => {
        console.log("Processing Job:");

        console.log(job.data);

        await new Promise((resolve) => setTimeout(resolve, 3000));

        console.log("Email Sent!");
    },
    {
        connection: {
            host: "localhost",
            port: 6379,
        },
    }
);

worker.on("completed", (job) => {
    console.log(`Job ${job.id} completed`);
});

worker.on("failed", (job, err) => {
    console.log(err);
});