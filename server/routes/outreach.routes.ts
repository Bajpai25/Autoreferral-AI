import { Router } from "express";
import {sendMessagesToCompanyEmployees, updateOutreachMessage} from "../controllers/outreach.controller"
import { authenticateUser } from "../controllers/user.controller";
import { getOutreach } from "../services/outreach.service";

 const router = Router();

router.post("/send-referral", authenticateUser, sendMessagesToCompanyEmployees);
router.patch("/:id", authenticateUser, updateOutreachMessage);
router.post("/getOutreach" , getOutreach);

export default router;