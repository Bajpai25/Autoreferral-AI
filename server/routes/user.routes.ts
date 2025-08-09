import { Router } from "express";
import { authenticateUser, login, register } from "../controllers/user.controller";

const router=Router();

router.post("/register",register);
router.post("/login",login);
router.post("/authenticate",authenticateUser);

export default router;