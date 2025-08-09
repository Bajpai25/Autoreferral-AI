import express, { Router } from 'express';
import userRoutes from './routes/user.routes';
import cors from 'cors';

export const app=express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/api",userRoutes);






