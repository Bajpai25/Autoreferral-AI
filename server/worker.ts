import { Queue, type ConnectionOptions } from "bullmq";

const connection: ConnectionOptions = {
    host: "localhost",
    port: 6379,
};

const queue = new Queue("email-queue", { connection });

async function addJob(): Promise<void> {
    await queue.add("send-email", {
        email: "test@gmail.com",
        subject: "Welcome",
    });

    console.log("Job added!");
}

addJob();