"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const outreach_controller_1 = require("../controllers/outreach.controller");
const router = (0, express_1.Router)();
router.post("/send-referral", outreach_controller_1.sendReferral);
exports.default = router;
