import { app } from "./app";
import dotenv from "dotenv";
dotenv.config();

// Boot the workflow worker (starts listening for BullMQ jobs)
import "./services/workflow.worker";

const PORT = process.env.PORT || 8000;

app.listen(PORT, () => {
    console.log(`Server is running at port ${PORT}`);
});