"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendMessagesToCompanyEmployees = sendMessagesToCompanyEmployees;
const outreach_service_1 = require("../services/outreach.service");
const user_controller_1 = require("../controllers/user.controller");
const session_manager_1 = require("../services/session-manager");
const constant_1 = require("../utils/constant");
async function sendMessagesToCompanyEmployees(req, res) {
    let responseSent = false;
    try {
        const { email, password, 
        // companyName,
        // messageTemplate,
        messageId, maxMessages = 10, delayBetweenMessages = 1500 } = req.body;
        if (!messageId) {
            res.status(400).json({
                success: false,
                message: "Missing required fields: messageId",
                error: "Validation Error"
            });
            return;
        }
        const outreachData = await constant_1.prisma.outreach.findUnique({
            where: {
                id: messageId,
            },
            include: {
                job: true,
            },
        });
        const messageData = await constant_1.prisma.outreach.findUnique({
            where: { id: messageId }
        });
        console.log(outreachData, "this is the outreachdata");
        // Get userId from authenticated user context (populated by authenticateUser middleware)
        const userId = req.user?.id;
        if (!userId && (!email || !password)) {
            res.status(401).json({
                success: false,
                message: "Unauthorized: User ID not found and no email/password provided.",
                error: "Authentication Error"
            });
            return;
        }
        console.log(`Starting LinkedIn automation for company: ${outreachData?.job?.companyName}`);
        let page;
        // Try to use session manager for browser reuse (OAuth flow)
        let oauthSession = userId ? user_controller_1.linkedinSessions.get(userId) : null;
        // If no in-memory session, try loading persisted cookies from DB
        if (!oauthSession && userId) {
            const { prisma } = await Promise.resolve().then(() => __importStar(require('../utils/constant')));
            const dbUser = await prisma.user.findUnique({
                where: { id: userId },
                select: { linkedinLiAt: true, linkedinJsessionId: true, linkedinAccessToken: true, linkedinCookieUpdatedAt: true }
            });
            if (dbUser?.linkedinLiAt && dbUser?.linkedinJsessionId) {
                console.log(`🔑 Loaded LinkedIn cookies from database for user: ${userId}`);
                user_controller_1.linkedinSessions.set(userId, {
                    li_at: dbUser.linkedinLiAt,
                    jsessionId: dbUser.linkedinJsessionId,
                    accessToken: dbUser.linkedinAccessToken || '',
                    createdAt: dbUser.linkedinCookieUpdatedAt || new Date(),
                });
                oauthSession = user_controller_1.linkedinSessions.get(userId);
            }
        }
        if (oauthSession) {
            console.log(`🔑 Using session manager for user: ${userId}`);
            const managedSession = await (0, session_manager_1.getOrCreateSession)(userId, oauthSession.li_at, oauthSession.jsessionId);
            page = managedSession.page;
        }
        else if (email && password) {
            // Fallback to legacy email/password login (no session reuse)
            console.log(`🔑 Using legacy email/password login`);
            const session = await (0, outreach_service_1.loginLinkedIn)(email, password);
            page = session.page;
        }
        else {
            res.status(401).json({
                success: false,
                message: "No LinkedIn session found for this user. Please authenticate via LinkedIn OAuth.",
                error: "Session Not Found"
            });
            return;
        }
        try {
            // Search and message directly from search page
            const { totalFound, results } = await (0, outreach_service_1.searchAndMessageEmployees)(page, outreachData?.job.companyName || "", outreachData?.message || "", messageId, maxMessages, delayBetweenMessages);
            const sentCount = results.filter(r => r.status === 'sent').length;
            const failedCount = results.filter(r => r.status === 'failed').length;
            if (!responseSent) {
                responseSent = true;
                res.status(200).json({
                    success: true,
                    message: `Processed ${results.length} profiles`,
                    data: {
                        totalProfiles: totalFound,
                        sentCount,
                        failedCount,
                        processedProfiles: results
                    }
                });
            }
        }
        catch (error) {
            console.error("Fatal error during automation:", error);
            if (!responseSent) {
                responseSent = true;
                res.status(500).json({
                    success: false,
                    message: "Automation failed",
                    error: error instanceof Error ? error.message : "Unknown error"
                });
            }
        }
        // NOTE: Browser is NOT closed here — session manager handles lifecycle
        // Session will be reused for subsequent calls and auto-cleaned after 30min idle
    }
    catch (error) {
        console.error("Error in request handler:", error);
        if (!responseSent) {
            responseSent = true;
            res.status(500).json({
                success: false,
                message: "Request processing failed",
                error: error instanceof Error ? error.message : "Unknown error"
            });
        }
    }
}
