import { Request, Response } from 'express';
import { loginLinkedIn, loginLinkedInWithCookies, searchAndMessageEmployees } from '../services/outreach.service';
import { linkedinSessions } from '../controllers/user.controller';
import { getOrCreateSession } from '../services/session-manager';
import { prisma } from '../utils/constant';

// Request/Response Types
export interface SendMessagesRequest {
  email?:string;
  password?:string;
  sessionId?: string;
  // companyName: string;
  messageId:string;
  // messageTemplate: string;
  maxMessages?: number;
  delayBetweenMessages?: number;
}

export interface SendMessagesResponse {
  success: boolean;
  message: string;
  data?: {
    totalProfiles: number;
    sentCount: number;
    failedCount: number;
    processedProfiles: Array<{
      name: string;
      profileUrl: string;
      status: 'sent' | 'failed';
      error?: string;
    }>;
  };
  error?: string;
}

export async function  sendMessagesToCompanyEmployees(
  req: Request,
  res: Response
): Promise<void> {
  let responseSent = false;

  try {
    const {
      email,
      password,
      // companyName,
      // messageTemplate,
      messageId,
      maxMessages = 10,
      delayBetweenMessages = 1500
    } = req.body as SendMessagesRequest;

    
    if (!messageId) {
      res.status(400).json({
        success: false,
        message: "Missing required fields: messageId",
        error: "Validation Error"
      } as SendMessagesResponse);
      return;
    }
    
    const outreachData = await prisma.outreach.findUnique({
  where: {
    id: messageId,
  },
  include: {
    job: true,
  },
});
const messageData=await prisma.outreach.findUnique({
  where:{id:messageId}
})
console.log(outreachData , "this is the outreachdata");

    // Get userId from authenticated user context (populated by authenticateUser middleware)
    const userId = req.user?.id;

    if (!userId && (!email || !password)) {
       res.status(401).json({
         success: false,
         message: "Unauthorized: User ID not found and no email/password provided.",
         error: "Authentication Error"
       } as SendMessagesResponse);
       return;
    }

    console.log(`Starting LinkedIn automation for company: ${outreachData?.job?.companyName}`);

    let page;

    // Try to use session manager for browser reuse (OAuth flow)
    let oauthSession = userId ? linkedinSessions.get(userId) : null;

    // If no in-memory session, try loading persisted cookies from DB
    if (!oauthSession && userId) {
      const { prisma } = await import('../utils/constant');
      const dbUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { linkedinLiAt: true, linkedinJsessionId: true, linkedinAccessToken: true, linkedinCookieUpdatedAt: true }
      });

      if (dbUser?.linkedinLiAt && dbUser?.linkedinJsessionId) {
        console.log(`🔑 Loaded LinkedIn cookies from database for user: ${userId}`);
        linkedinSessions.set(userId, {
          li_at: dbUser.linkedinLiAt,
          jsessionId: dbUser.linkedinJsessionId,
          accessToken: dbUser.linkedinAccessToken || '',
          createdAt: dbUser.linkedinCookieUpdatedAt || new Date(),
        });
        oauthSession = linkedinSessions.get(userId)!;
      }
    }

    if (oauthSession) {
      console.log(`🔑 Using session manager for user: ${userId}`);
      const managedSession = await getOrCreateSession(
        userId!,
        oauthSession.li_at,
        oauthSession.jsessionId
      );
      page = managedSession.page;
    } else if (email && password) {
      // Fallback to legacy email/password login (no session reuse)
      console.log(`🔑 Using legacy email/password login`);
      const session = await loginLinkedIn(email, password);
      page = session.page;
    } else {
      res.status(401).json({
        success: false,
        message: "No LinkedIn session found for this user. Please authenticate via LinkedIn OAuth.",
        error: "Session Not Found"
      } as SendMessagesResponse);
      return;
    }

    try {
      // Search and message directly from search page
      const { totalFound, results } = await searchAndMessageEmployees(
        page,
  outreachData?.job.companyName || "",
  outreachData?.message || "",
  messageId,
  maxMessages,
  delayBetweenMessages
      );

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
        } as SendMessagesResponse);
      }

    } catch (error) {
      console.error("Fatal error during automation:", error);
      if (!responseSent) {
        responseSent = true;
        res.status(500).json({
          success: false,
          message: "Automation failed",
          error: error instanceof Error ? error.message : "Unknown error"
        } as SendMessagesResponse);
      }
    }
    // NOTE: Browser is NOT closed here — session manager handles lifecycle
    // Session will be reused for subsequent calls and auto-cleaned after 30min idle

  } catch (error) {
    console.error("Error in request handler:", error);
    if (!responseSent) {
      responseSent = true;
      res.status(500).json({
        success: false,
        message: "Request processing failed",
        error: error instanceof Error ? error.message : "Unknown error"
      } as SendMessagesResponse);
    }
  }
}

export async function updateOutreachMessage(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const { message } = req.body as { message?: string };

    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    if (!message?.trim()) {
      res.status(400).json({ success: false, message: "Message cannot be empty" });
      return;
    }

    const outreach = await prisma.outreach.findFirst({ where: { id, userId } });
    if (!outreach) {
      res.status(404).json({ success: false, message: "Outreach message not found" });
      return;
    }

    const updated = await prisma.outreach.update({
      where: { id },
      data: { message: message.trim() },
    });

    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    console.error("Update outreach message error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
}
