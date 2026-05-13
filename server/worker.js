import { Queue } from "bullmq";

const queue = new Queue("email-queue", {
    connection: {
        host: "localhost",
        port: 6379,
    },
});

async function addJob() {
    await queue.add("send-email", {
        email: "test@gmail.com",
        subject: "Welcome",
    });

    console.log("Job added!");
}

addJob();