"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const fileUpload_1 = require("../config/fileUpload");
const resume_service_1 = require("../services/resume.service");
const router = (0, express_1.Router)();
router.post("/upload", fileUpload_1.upload.single("file"), resume_service_1.processResume);
exports.default = router;
