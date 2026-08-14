import { Router } from "express";
import { combineData, getJobs, linkedInMessage, scrapeJobs } from "../services/jobs.service";

const router=Router();

router.post("/scrape" , scrapeJobs);
router.post("/combine" , combineData);
router.post("/generate" , linkedInMessage);
router.post("/getJobs",getJobs);

export default router;