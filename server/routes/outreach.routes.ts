import { Router } from "express";
import {sendReferral} from "../controllers/outreach.controller";

 const router = Router();

router.post("/send-referral", sendReferral);

export default router;