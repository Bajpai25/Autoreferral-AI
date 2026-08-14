import { chromium, Browser, BrowserContext, Page } from "playwright";

export interface ManagedSession {
  browser: Browser;
  context: BrowserContext;
  page: Page;
  lastUsed: number;
}

// Singleton session cache: userId → ManagedSession
const sessionCache = new Map<string, ManagedSession>();

// Auto-cleanup idle sessions after 30 minutes
const SESSION_TTL_MS = 30 * 60 * 1000;

let cleanupTimer: NodeJS.Timeout | null = null;

function startCleanupTimer() {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(async () => {
    const now = Date.now();
    for (const [userId, session] of sessionCache.entries()) {
      if (now - session.lastUsed > SESSION_TTL_MS) {
        console.log(`🧹 Auto-closing idle session for user: ${userId}`);
        await closeSession(userId);
      }
    }
    if (sessionCache.size === 0 && cleanupTimer) {
      clearInterval(cleanupTimer);
      cleanupTimer = null;
    }
  }, 60_000); // Check every minute
}

/**
 * Check if a browser/page is still alive and usable.
 */
async function isSessionAlive(session: ManagedSession): Promise<boolean> {
  try {
    if (!session.browser.isConnected()) return false;
    // Try a simple operation on the page
    await session.page.title();
    return true;
  } catch {
    return false;
  }
}

/**
 * Get an existing session or create a new one for the given user.
 * Reuses browser instances across calls — no new Chromium window each time.
 */
export async function getOrCreateSession(
  userId: string,
  liAt: string,
  jsessionId: string
): Promise<ManagedSession> {
  // Check for an existing cached session
  const existing = sessionCache.get(userId);
  if (existing && (await isSessionAlive(existing))) {
    console.log(`♻️  Reusing existing browser session for user: ${userId}`);
    existing.lastUsed = Date.now();
    return existing;
  }

  // If there was a dead session, clean it up
  if (existing) {
    console.log(`🔄 Previous session died, creating new one for user: ${userId}`);
    try { await existing.browser.close(); } catch {}
    sessionCache.delete(userId);
  }

  console.log(`🚀 Launching new browser session for user: ${userId}`);

  const browser = await chromium.launch({
    headless: false,
    args: [
      "--disable-blink-features=AutomationControlled",
      "--no-sandbox",
      "--disable-dev-shm-usage",
    ],
  });

  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    viewport: { width: 1280, height: 800 },
  });

  // Inject LinkedIn cookies
  await context.addCookies([
    {
      name: "li_at",
      value: liAt,
      domain: ".linkedin.com",
      path: "/",
      httpOnly: true,
      secure: true,
      sameSite: "None",
    },
    {
      name: "JSESSIONID",
      value: jsessionId,
      domain: ".linkedin.com",
      path: "/",
      httpOnly: false,
      secure: true,
      sameSite: "None",
    },
  ]);

  const page = await context.newPage();

  // Validate login by navigating to feed
  console.log("Navigating to LinkedIn to validate session...");
  await page.goto("https://www.linkedin.com/feed/", {
    waitUntil: "commit",
    timeout: 60000,
  });
  await page.waitForTimeout(3000);

  const currentUrl = page.url();
  if (currentUrl.includes("/login") || currentUrl.includes("/authwall")) {
    await browser.close();
    throw new Error(
      "Cookie-based login failed — cookies may have expired. Please re-authenticate via LinkedIn OAuth."
    );
  }

  console.log("✅ LinkedIn session validated successfully");

  const session: ManagedSession = {
    browser,
    context,
    page,
    lastUsed: Date.now(),
  };

  sessionCache.set(userId, session);
  startCleanupTimer();

  return session;
}

/**
 * Close and remove a specific user's session.
 */
export async function closeSession(userId: string): Promise<void> {
  const session = sessionCache.get(userId);
  if (session) {
    try {
      await session.browser.close();
      console.log(`🔒 Closed browser session for user: ${userId}`);
    } catch (e) {
      console.log(`Browser already closed for user: ${userId}`);
    }
    sessionCache.delete(userId);
  }
}

/**
 * Close ALL sessions (for graceful server shutdown).
 */
export async function closeAllSessions(): Promise<void> {
  for (const [userId] of sessionCache.entries()) {
    await closeSession(userId);
  }
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
  }
  console.log("🔒 All browser sessions closed");
}

/**
 * Get the number of active sessions.
 */
export function getActiveSessionCount(): number {
  return sessionCache.size;
}
