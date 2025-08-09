import { app } from "./app";
import dotenv from "dotenv";
dotenv.config();

const PORT=process.env.port;

app.listen((PORT || 8000),()=>{
    console.log(`Server is running at port ${PORT}`);
})