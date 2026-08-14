import { Router } from "express";
import { upload } from "../config/fileUpload";
import { processResume} from "../services/resume.service";


const router =Router();

router.post("/upload" , upload.single("file") , processResume);


export default router;