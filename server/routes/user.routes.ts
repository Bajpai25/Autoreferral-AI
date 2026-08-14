import { Router } from "express";
import { authenticateUserToken, linkedinAuthCallback, login, logoutUser, register } from "../controllers/user.controller";

const router=Router();

router.post("/register",register);
router.post("/login",login);
router.get("/authenticate",authenticateUserToken);
router.get("/auth/linkedin/callback",linkedinAuthCallback);
router.post("/logout",logoutUser);

export default router;