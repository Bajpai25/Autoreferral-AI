import express, { Router } from 'express';
import userRoutes from './routes/user.routes';
import outreachRoutes from "./routes/outreach.routes"
import extractResume from "./routes/resume.routes"
import jobsRoutes from "./routes/job.routes"
import workflowRoutes from "./routes/workflow.routes"
import cors from 'cors';

export const app=express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/api",userRoutes);
app.use("/api/resume" ,extractResume);
app.use("/api/outreach",outreachRoutes);
app.use("/api/jobs" ,jobsRoutes );
app.use("/api/workflows", workflowRoutes);






