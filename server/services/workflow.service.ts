import { Page, BrowserContext } from "playwright";
import { prisma } from "../utils/constant";
import { closeSession, getOrCreateSession } from "./session-manager";
import nodemailer from "nodemailer";
// import {  workflowQueue } from "./workflow.producer";

// ─── Types ───

export interface ConnectionResult {
  name: string;
  profileUrl: string;
  status: "sent" | "failed";
  error?: string;
}
interface ConnectionDetails {
  name: string;
  profileUrl: string;
  status: "sent" | "failed";
  error?: string;
}

interface ProfileCard {
  name: string;
  profileUrl: string;
  cardIndex: number;
}


// TODO: Move credentials to env vars (SMTP_USER, SMTP_PASS)
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER || "Shashwat252003",
    pass: process.env.SMTP_PASS || "Bajpai123",
  },
});
transporter.verify().then(()=>{
  console.log("SMTP transporter verified successfully.");
}).catch((err)=>{
  console.error("SMTP transporter verification failed:", err);
})

// ─── Helper: Dismiss popups ───

async function dismissPopups(page: Page): Promise<void> {
  const dismissSelectors = [
    'button[data-test-modal-close-btn]',
    'button.artdeco-modal__dismiss',
    'button[aria-label="Dismiss"]',
    'button:has-text("Not now")',
    'button:has-text("Got it")',
    'button:has-text("Skip")',
    'button[action-type="ACCEPT"]',
  ];

  for (let round = 0; round < 3; round++) {
    let dismissed = false;
    for (const selector of dismissSelectors) {
      try {
        const el = await page.$(selector);
        if (el && (await el.isVisible())) {
          await el.click();
          console.log(`  🚫 Dismissed popup: ${selector.slice(0, 40)}`);
          await page.waitForTimeout(100);
          dismissed = true;
          break;
        }
      } catch {}
    }
    if (!dismissed) break;
  }
}



// ─── Helper: Scroll to load all search results ───

async function scrollToLoadAllResults(page: Page): Promise<string> {
  console.log("📜 Scrolling to load all search results...");

  let previousCount = 0;
  let stableRounds = 0;
  const MAX_STABLE = 3;
  const SCROLL_PX = 600;
  let attempts = 0;
  const MAX_ATTEMPTS = 5;

  try {
    await page.waitForSelector('div[role="listitem"]', { timeout: 1000 });
  } catch {
    console.log("⚠️  No search results found on page");
    return "Please go to the connections workflow in order to have better chances of getting a referral.";
  }

  while (attempts < MAX_ATTEMPTS) {
    attempts++;
    await page.mouse.wheel(0, SCROLL_PX);
    await page.waitForTimeout(300);

    const count = await page.evaluate(
      () => document.querySelectorAll('div[role="listitem"]').length
    );

    if (count > previousCount) {
      previousCount = count;
      stableRounds = 0;
    } else {
      stableRounds++;
      if (stableRounds >= MAX_STABLE) break;
    }
  }

  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(200);

  console.log(`📜 Total cards discovered: ${previousCount}`);
  
  return `This is the profiles received as your connections: ${previousCount}`;
}

// ─── Helper: Extract profiles with Connect button (2nd/3rd degree) ───
// IMPORTANT: LinkedIn's Connect buttons are <a> tags, NOT <button> tags.
// Each <a> has aria-label="Invite {Name} to connect".

async function extractConnectableProfiles(page: Page): Promise<ProfileCard[]> {
  return page.evaluate(() => {
    const results: { name: string; profileUrl: string; cardIndex: number }[] = [];
    const cards = document.querySelectorAll('div[role="listitem"]');

    cards.forEach((card, index) => {
      // LinkedIn uses <a> tags (not <button>) for the Connect action
      const connectBtn =
        card.querySelector('a[aria-label*="Invite"][aria-label*="to connect"]') ||
        card.querySelector('a[aria-label*="connect"]');
      if (!connectBtn) return;

      // Check if already disabled (pending invite)
      if (connectBtn.getAttribute("aria-disabled") === "true") return;

      let name = "";
      let profileUrl = "";

      // The first <a href="/in/..."> in the card is the profile link
      const profileLink = card.querySelector('a[href*="/in/"]') as HTMLAnchorElement | null;
      if (profileLink) {
        profileUrl = profileLink.getAttribute("href") || "";
        // Get the text content but clean it up
        const nameEl = profileLink.querySelector("a.dea7061d") || profileLink;
        name = nameEl.textContent?.trim() || "";
      }

      // Clean up name: remove degree indicators, verified badges, whitespace
      name = name
        .replace(/\s*•\s*(1st|2nd|3rd)\s*/g, "")
        .replace(/\s+/g, " ")
        .trim();

      // Remove trailing "Verified" text if present
      name = name.replace(/\s*Verified\s*$/, "").trim();

      results.push({
        name: name || `Profile #${index + 1}`,
        profileUrl,
        cardIndex: index,
      });
    });

    return results;
  });
}

// ─── Helper: Click Connect button on a specific card ───
// Uses <a> tag selector matching LinkedIn's actual HTML structure.

async function clickConnectOnCard(
  page: Page,
  cardIndex: number
): Promise<boolean> {
  try {
    const cards = await page.$$('div[role="listitem"]');
    if (cardIndex >= cards.length) return false;

    const card = cards[cardIndex];
    await card.scrollIntoViewIfNeeded();
    await page.waitForTimeout(150);

    // LinkedIn Connect buttons are <a> tags with aria-label="Invite {Name} to connect"
    const connectBtn =
      (await card.$('a[aria-label*="Invite"][aria-label*="to connect"]')) ||
      (await card.$('a[aria-label*="connect"]'));

    if (!connectBtn) {
      console.log("  ⚠️  No Connect button found on this card");
      return false;
    }

    // Check if disabled
    const isDisabled = await connectBtn.getAttribute("aria-disabled");
    if (isDisabled === "true") {
      console.log("  ⚠️  Connect button is disabled (already invited?)");
      return false;
    }

    await connectBtn.scrollIntoViewIfNeeded();
    await page.waitForTimeout(100);
    await connectBtn.click();
    return true;
  } catch (err) {
    console.error("  ❌ Error clicking Connect:", err);
    return false;
  }
}

// ─── Helper: Handle the "Add a note" dialog after clicking Connect ───
// LinkedIn shows: "Add a note to your invitation?" with two buttons:
//   - "Add a note"
//   - "Send without a note"
// We click "Send without a note" by default, unless a connectionNote is configured.

async function handleConnectDialog(
  page: Page,
  connectionNote: string | null,
  personName: string
): Promise<boolean> {
  // Wait for the dialog to appear
  await page.waitForTimeout(500);

  try {
    // Check if a dialog/modal appeared
    // LinkedIn uses role="dialog" or a modal overlay
    const dialogSelectors = [
      'div[role="dialog"]',
      'div.artdeco-modal',
      'div[data-test-modal]',
    ];

    let dialogVisible = false;
    for (const sel of dialogSelectors) {
      try {
        const dialog = await page.$(sel);
        if (dialog && (await dialog.isVisible())) {
          dialogVisible = true;
          break;
        }
      } catch {}
    }

    if (!dialogVisible) {
      // No dialog — connection request might have been sent directly
      // Also check if the button text changed to "Pending"
      console.log("  ✅ Connection sent directly (no dialog appeared)");
      return true;
    }

    // Dialog is visible — handle it
    if (connectionNote && connectionNote.trim()) {
      // User configured a note — click "Add a note" then type it
      const addNoteBtn = await page.$('button:has-text("Add a note")');
      if (addNoteBtn && (await addNoteBtn.isVisible())) {
        await addNoteBtn.click();
        await page.waitForTimeout(300);

        // Find the note textarea
        const noteInput =
          (await page.$('textarea[name="message"]')) ||
          (await page.$('textarea#custom-message')) ||
          (await page.$("textarea"));

        if (noteInput) {
          const firstName = personName.split(" ")[0] || "there";
          const personalizedNote = connectionNote
            .replace(/<FirstName>/g, firstName)
            .replace(/<Name>/g, personName)
            .slice(0, 300); // LinkedIn limit

          await noteInput.click();
          await noteInput.fill(""); // Clear any existing text
          await page.keyboard.type(personalizedNote, { delay: 5 });
          console.log(`  ✏️  Added connection note (${personalizedNote.length} chars)`);
        }

        // Now click "Send" / "Send invitation"
        const sendBtnSelectors = [
          'button[aria-label="Send invitation"]',
          'button[aria-label="Send now"]',
          'button:has-text("Send")',
        ];

        for (const sel of sendBtnSelectors) {
          try {
            const btn = await page.$(sel);
            if (btn && (await btn.isVisible())) {
              await btn.click();
              console.log("  ✅ Sent invitation with note");
              await page.waitForTimeout(200);
              return true;
            }
          } catch {}
        }
      }
    }

    // No note configured OR "Add a note" button not found
    // → Click "Send without a note"
    const sendWithoutNoteSelectors = [
      'button[aria-label="Send without a note"]',
      'button:has-text("Send without a note")',
    ];

    for (const sel of sendWithoutNoteSelectors) {
      try {
        const btn = await page.$(sel);
        if (btn && (await btn.isVisible())) {
          await btn.click();
          console.log("  ✅ Sent invitation without note");
          await page.waitForTimeout(200);
          return true;
        }
      } catch {}
    }

    // Fallback: try any Send button
    const fallbackSendSelectors = [
      'button[aria-label="Send invitation"]',
      'button[aria-label="Send now"]',
      'button:has-text("Send")',
    ];

    for (const sel of fallbackSendSelectors) {
      try {
        const btn = await page.$(sel);
        if (btn && (await btn.isVisible())) {
          await btn.click();
          console.log("  ✅ Clicked fallback Send button");
          await page.waitForTimeout(200);
          return true;
        }
      } catch {}
    }

    // Last resort: close the dialog so we don't get stuck
    console.log("  ⚠️  Could not find Send button, dismissing dialog");
    const dismissBtn = await page.$('button[aria-label="Dismiss"]');
    if (dismissBtn && (await dismissBtn.isVisible())) {
      await dismissBtn.click();
      await page.waitForTimeout(200);
    }

    return false;
  } catch (err) {
    console.error("  ❌ Error handling connect dialog:", err);

    // Try to dismiss any stuck dialog
    try {
      const dismissBtn = await page.$('button[aria-label="Dismiss"]');
      if (dismissBtn && (await dismissBtn.isVisible())) {
        await dismissBtn.click();
      }
    } catch {}

    return false;
  }
}

// ─── Helper: Handle pagination and load next page ───
async function loadNextPage(page: Page): Promise<boolean> {
  try {
    // Look for the "Next" button on LinkedIn search results
    const nextBtnSelectors = [
      'button[aria-label="View next page"]',
      'button:has-text("Next")',
      'a[aria-label="Next"]',
      'li button[aria-label*="next"]',
    ];

    for (const selector of nextBtnSelectors) {
      try {
        const nextBtn = await page.$(selector);
        if (nextBtn && (await nextBtn.isVisible())) {
          const isDisabled = await nextBtn.getAttribute("aria-disabled");
          if (isDisabled !== "true") {
            await nextBtn.click();
            console.log("  📄 Navigated to next page");
            await page.waitForTimeout(1500); // Wait for page load
            await page.waitForSelector('div[role="listitem"]', { timeout: 10000 });
            return true;
          }
        }
      } catch {}
    }

    console.log("  ⚠️  No more pages available or Next button not found");
    return false;
  } catch (err) {
    console.error("  ❌ Error loading next page:", err);
    return false;
  }
}

// ─── Main: Execute a workflow ───

export async function executeWorkflow(workflowId: string): Promise<{
  totalFound: number;
  results: ConnectionResult[];
}> {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`🚀 Executing workflow: ${workflowId}`);
  console.log(`${"=".repeat(60)}`);

  // 1. Fetch workflow + user data from DB
  const workflow = await prisma.workflow.findUnique({
    where: { id: workflowId },
    include: { user: true },
  });

  if (!workflow) {
    throw new Error(`Workflow ${workflowId} not found`);
  }

  if (!workflow.user.linkedinLiAt || !workflow.user.linkedinJsessionId) {
    throw new Error(
      `User ${workflow.userId} has no LinkedIn session cookies. Please re-authenticate via LinkedIn OAuth.`
    );
  }

  // 2. Update status to running
  await prisma.workflow.update({
    where: { id: workflowId },
    data: { status: "running" },
  });

  // 3. Get or create browser session (reuses existing browser)
  const session = await getOrCreateSession(
    workflow.userId,
    workflow.user.linkedinLiAt,
    workflow.user.linkedinJsessionId
  );

  // 4. Open a NEW TAB in the existing browser context (not a new browser)
  const page = await session.context.newPage();
  const results: ConnectionResult[] = [];
  let allProfiles: ProfileCard[] = [];
  let currentPage = 1;
  const MAX_PAGES = 10; // Prevent infinite loops

  try {
    // 5. Search for people at target company (2nd & 3rd degree connections only)
    const searchUrl = `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(
      workflow.targetCompany
    )}&origin=FACETED_SEARCH&network=%5B%22S%22%2C%22O%22%5D`;

    console.log(`🔍 Searching: ${searchUrl}`);
    await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 60000 });

    // Wait for results
    try {
      await page.waitForSelector('div[role="listitem"]', { timeout: 15000 });
      console.log("✅ Search results loaded");
    } catch {
      console.log("⚠️  No search results appeared within 15s");
      return { totalFound: 0, results: [] };
    }

    // 6. Loop through pages until we have enough profiles or reach max pages
    while (allProfiles.length < workflow.maxConnections && currentPage <= MAX_PAGES) {
      console.log(`\n📖 Processing page ${currentPage}...`);

      // Dismiss any popups
      await dismissPopups(page);

      // Scroll to load all results on current page
      const real_profiles=await scrollToLoadAllResults(page);

      if(Number(real_profiles) < workflow.maxConnections){
             // if this is happening then go to the next page of that same person and get the profiles from there and come back here again 
             // click on next button displayed at the page bottom
        
      }
      

      // Extract profiles with Connect button
      const pageProfiles = await extractConnectableProfiles(page);

      if (pageProfiles.length === 0) {
        console.log("⚠️  No connectable profiles found on this page");
        break;
      }

      console.log(`\n📋 Found ${pageProfiles.length} connectable profiles on page ${currentPage}:`);
      pageProfiles.forEach((p, i) => {
        console.log(`  ${i + 1}. ${p.name} → ${p.profileUrl}`);
      });

      // Add profiles from this page
      allProfiles = [...allProfiles, ...pageProfiles];

      // Check if we have enough profiles or if there are more pages
      if (allProfiles.length >= workflow.maxConnections) {
        console.log(`✅ Reached target of ${workflow.maxConnections} profiles`);
        break;
      }

      // Try to load next page
      console.log(
        `⚠️  Only ${allProfiles.length} profiles found so far, which is less than the configured maxConnections (${workflow.maxConnections}).`
      );
      console.log("📄 Attempting to load next page...");

      const hasNextPage = await loadNextPage(page);
      if (!hasNextPage) {
        console.log("⚠️  No more pages available");
        break;
      }

      currentPage++;
    }

    if (allProfiles.length === 0) {
      console.log("⚠️  No connectable profiles found across all pages");
      return { totalFound: 0, results: [] };
    }

    console.log(`\n✅ Total profiles collected: ${allProfiles.length}`);

    // 7. Send connection requests (up to maxConnections, max 10 per page)
    results.length = 0; // reset in case of retry
    const limit = Math.min(allProfiles.length, workflow.maxConnections, 10);

    for (let i = 0; i < limit; i++) {
      const { name, profileUrl, cardIndex } = allProfiles[i];

      try {
        console.log(`\n${"─".repeat(40)}`);
        console.log(` [${i + 1}/${limit}] ${name}`);

        await dismissPopups(page);

        // Click Connect
        const clicked = await clickConnectOnCard(page, cardIndex);
        if (!clicked) {
          results.push({
            name,
            profileUrl,
            status: "failed",
            error: "Could not click Connect button",
          });
          continue;
        }
        console.log("  📨 Clicked Connect button");

        // Handle dialog (send without note / add note + send)
        const sent = await handleConnectDialog(
          page,
          workflow.connectionNote,
          name
        );

        if (sent) {
          console.log(`  ✅ Connection request sent to ${name}!`);
          results.push({ name, profileUrl, status: "sent" });
        } else {
          results.push({
            name,
            profileUrl,
            status: "failed",
            error: "Could not complete connection dialog",
          });
        }

        await dismissPopups(page);

        // Quick 1s delay between connections
        if (i < limit - 1) {
          const delay = 1000;
          console.log(`  ⏳ 1s pause...`);
          await page.waitForTimeout(delay);
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Unknown error";
        console.error(`  ❌ Error for ${name}:`, errorMsg);

        // Check if browser is still alive
        try {
          await page.title();
        } catch {
          console.error("💥 Browser crashed, stopping");
          results.push({ name, profileUrl, status: "failed", error: "Browser crashed" });
          break;
        }

        results.push({ name, profileUrl, status: "failed", error: errorMsg });

        // Dismiss any stuck dialogs before continuing
        await dismissPopups(page);
        await page.waitForTimeout(200);
      }
    }

    // 8. Summary
    const sentCount = results.filter((r) => r.status === "sent").length;
    const failedCount = results.filter((r) => r.status === "failed").length;
    console.log(
      `\n🏁 Done! ${sentCount} sent, ${failedCount} failed out of ${results.length}`
    );

    // 9. Update workflow stats + connectionData in DB
    await prisma.workflow.update({
      where: { id: workflowId },
      data: {
        totalSent: { increment: sentCount },
        totalFailed: { increment: failedCount },
        lastRunAt: new Date(),
        status: "active",
        connectionData: results.map((r) => JSON.stringify(r)),
      },
    });

    return { totalFound: allProfiles.length, results };
  } catch (error) {
    console.error(`❌ Workflow ${workflowId} failed:`, error);

    await prisma.workflow.update({
      where: { id: workflowId },
      data: { status: "failed" },
    });

    throw error;
  } finally {
    // Close the TAB only (not the browser — session-manager handles lifecycle)

      await page.close();
      console.log("🔒 Closed workflow tab");

      // Gather final results for the email
      const finalSent = results.filter((r) => r.status === "sent").length;
      const finalFailed = results.filter((r) => r.status === "failed").length;

      const htmlBody = buildReportEmail({
        userName: workflow.user.name || "there",
        workflowName: workflow.name,
        targetCompany: workflow.targetCompany,
        totalFound: results.length,
        sentCount: finalSent,
        failedCount: finalFailed,
        connections: results,
        executedAt: new Date(),
      });

      await transporter.sendMail({
        from: `"AutoReferrals" <${process.env.SMTP_FROM || "bajpai.shashwat.332@gmail.com"}>`,
        to: workflow.user.email,
        subject: `✅ Workflow "${workflow.name}" — ${finalSent} connections sent`,
        text: `Your workflow "${workflow.name}" targeting ${workflow.targetCompany} has completed. ${finalSent} sent, ${finalFailed} failed.`,
        html: htmlBody,
      });

      console.log("📧 Report email sent to", workflow.user.email);

      try{
        // check for the active tabs using the session in browser using playwright 

        if(session && session.context){
          const openTabs=await session.context.pages();

          if(openTabs.length<=1){
            console.log("🔒 No other tabs open, closing browser session for user",workflow.userId);
            await closeSession(workflow.userId);
           
        }
      }
    }

     catch (emailErr) {
      console.error("⚠️  Failed to close tab or send email:", emailErr);
    }
  }
}


// ═══════════════════════════════════════════════════════════════════
// Beautiful HTML Email Builder
// ═══════════════════════════════════════════════════════════════════

function buildReportEmail(data: {
  userName: string;
  workflowName: string;
  targetCompany: string;
  totalFound: number;
  sentCount: number;
  failedCount: number;
  connections: ConnectionResult[];
  executedAt: Date;
}): string {
  const {
    userName, workflowName, targetCompany,
    totalFound, sentCount, failedCount,
    connections, executedAt,
  } = data;

  const dateStr = executedAt.toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
  const timeStr = executedAt.toLocaleTimeString("en-US", {
    hour: "2-digit", minute: "2-digit",
  });

  const connectionRows = connections
    .map((c) => {
      const isSent = c.status === "sent";
      const statusColor = isSent ? "#22c55e" : "#ef4444";
      const statusBg = isSent ? "#052e16" : "#450a0a";
      const statusLabel = isSent ? "&#10003; Sent" : "&#10007; Failed";
      const profileLink = c.profileUrl
        ? `<a href="https://www.linkedin.com${c.profileUrl}" style="color:#06b6d4;text-decoration:none;">${c.name}</a>`
        : c.name;
      const errorNote = c.error
        ? `<br/><span style="font-size:11px;color:#a1a1aa;">${c.error}</span>`
        : "";

      return `<tr>
        <td style="padding:12px 16px;border-bottom:1px solid #1e1e2e;font-size:14px;color:#e4e4e7;">${profileLink}${errorNote}</td>
        <td style="padding:12px 16px;border-bottom:1px solid #1e1e2e;text-align:center;">
          <span style="display:inline-block;padding:3px 10px;border-radius:99px;font-size:11px;font-weight:600;letter-spacing:0.3px;color:${statusColor};background:${statusBg};border:1px solid ${statusColor}33;">${statusLabel}</span>
        </td>
      </tr>`;
    })
    .join("");

  const failedBg = failedCount > 0 ? "#450a0a" : "#111118";
  const failedBorder = failedCount > 0 ? "#7f1d1d" : "#1e1e2e";
  const failedTextColor = failedCount > 0 ? "#ef4444" : "#71717a";
  const failedSubColor = failedCount > 0 ? "#fca5a5" : "#71717a";
  const dashboardUrl = process.env.CLIENT_URL || "http://localhost:5173";
  const currentYear = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>Workflow Report</title>
</head>
<body style="margin:0;padding:0;background:#09090b;font-family:'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#09090b;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- Logo & Header -->
          <tr>
            <td style="padding:0 0 32px;text-align:center;">
              <div style="display:inline-block;width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#06b6d4,#6366f1);text-align:center;line-height:40px;font-size:14px;font-weight:900;color:#000;margin-bottom:12px;">AR</div>
              <h1 style="margin:8px 0 0;font-size:22px;font-weight:700;color:#fafafa;letter-spacing:-0.3px;">Workflow Report</h1>
              <p style="margin:6px 0 0;font-size:13px;color:#71717a;">${dateStr} at ${timeStr}</p>
            </td>
          </tr>

          <!-- Main Card -->
          <tr>
            <td>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0f;border:1px solid #1e1e2e;border-radius:16px;overflow:hidden;">

                <!-- Greeting -->
                <tr>
                  <td style="padding:28px 28px 20px;">
                    <p style="margin:0;font-size:15px;color:#d4d4d8;">Hi <strong style="color:#fafafa;">${userName}</strong>,</p>
                    <p style="margin:8px 0 0;font-size:14px;color:#a1a1aa;line-height:1.6;">
                      Your workflow <strong style="color:#e4e4e7;">&ldquo;${workflowName}&rdquo;</strong> targeting
                      <strong style="color:#06b6d4;">${targetCompany}</strong> has finished executing.
                      Here&rsquo;s your summary:
                    </p>
                  </td>
                </tr>

                <!-- Stats Row -->
                <tr>
                  <td style="padding:0 28px 24px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="33%" style="padding:0 4px;">
                          <div style="background:#111118;border:1px solid #1e1e2e;border-radius:12px;padding:16px;text-align:center;">
                            <div style="font-size:28px;font-weight:700;color:#fafafa;line-height:1;">${totalFound}</div>
                            <div style="font-size:11px;color:#71717a;text-transform:uppercase;letter-spacing:0.8px;margin-top:6px;">Total</div>
                          </div>
                        </td>
                        <td width="33%" style="padding:0 4px;">
                          <div style="background:#052e16;border:1px solid #14532d;border-radius:12px;padding:16px;text-align:center;">
                            <div style="font-size:28px;font-weight:700;color:#22c55e;line-height:1;">${sentCount}</div>
                            <div style="font-size:11px;color:#4ade80;text-transform:uppercase;letter-spacing:0.8px;margin-top:6px;">Sent</div>
                          </div>
                        </td>
                        <td width="33%" style="padding:0 4px;">
                          <div style="background:${failedBg};border:1px solid ${failedBorder};border-radius:12px;padding:16px;text-align:center;">
                            <div style="font-size:28px;font-weight:700;color:${failedTextColor};line-height:1;">${failedCount}</div>
                            <div style="font-size:11px;color:${failedSubColor};text-transform:uppercase;letter-spacing:0.8px;margin-top:6px;">Failed</div>
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Connections Table -->
                ${connections.length > 0 ? `
                <tr>
                  <td style="padding:0 28px 28px;">
                    <div style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:#71717a;margin-bottom:10px;">Connection Details</div>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#111118;border:1px solid #1e1e2e;border-radius:10px;overflow:hidden;">
                      <thead>
                        <tr>
                          <th style="padding:10px 16px;text-align:left;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.8px;color:#52525b;border-bottom:1px solid #1e1e2e;">Name</th>
                          <th style="padding:10px 16px;text-align:center;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.8px;color:#52525b;border-bottom:1px solid #1e1e2e;">Status</th>
                        </tr>
                      </thead>
                      <tbody>${connectionRows}</tbody>
                    </table>
                  </td>
                </tr>` : ""}

                <!-- CTA Button -->
                <tr>
                  <td style="padding:0 28px 28px;text-align:center;">
                    <a href="${dashboardUrl}/dashboard" style="display:inline-block;padding:12px 32px;border-radius:99px;background:linear-gradient(135deg,#06b6d4,#6366f1);color:#fff;font-size:13px;font-weight:600;text-decoration:none;letter-spacing:0.3px;">
                      View Dashboard &rarr;
                    </a>
                  </td>
                </tr>

              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:28px 0 0;text-align:center;">
              <p style="margin:0;font-size:11px;color:#3f3f46;line-height:1.6;">
                You received this email because a workflow was executed on your
                <a href="${dashboardUrl}" style="color:#06b6d4;text-decoration:none;">AutoReferrals</a> account.
              </p>
              <p style="margin:6px 0 0;font-size:11px;color:#27272a;">&copy; ${currentYear} AutoReferrals. All rights reserved.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

