import { Page } from "playwright";
import { prisma } from "../utils/constant";
import { closeSession, getOrCreateSession } from "./session-manager";
import { searchAndMessageEmployees } from "./outreach.service";
import nodemailer from "nodemailer";

// ─── Types ───
export interface ConnectionResult {
  name: string;
  profileUrl?: string;
  status: "sent" | "failed";
  error?: string;
}

interface ProfileCard {
  name: string;
  profileUrl?: string;
  cardIndex: number; // 0-based index among listitems on that page
}

// Send connection result to backend API so frontend can poll it.
export async function sendConnectionResult(result: ConnectionResult, workflowId?: string) {
  const base = process.env.API_BASE || "http://localhost:8000";
  const url = `${base.replace(/\/$/, "")}/api/workflows/workflow-results`;

  try {
    if (typeof fetch === "undefined") {
      try {
        const undici = await import("undici");
        // @ts-ignore
        (global as any).fetch = undici.fetch;
      } catch {}
    }

    const payload = { workflowId, ...result };
    console.log("→ sendConnectionResult POST to", url, payload.name);

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true as any,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("⚠️  sendConnectionResult failed:", res.status, text);
    }
  } catch (err) {
    console.error("⚠️  Failed to send connection result to API:", err);
  }
}

// SMTP transporter (keep minimal)
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
  },
});
transporter.verify().then(() => console.log("SMTP verified")).catch(() => {});

// Dismiss common LinkedIn popups
async function dismissPopups(page: Page): Promise<void> {
  // List of popup dismiss strategies, tried in order
  const dismissStrategies: { name: string; selector: string }[] = [
    // "Discard" confirmation when leaving an unsent message
    { name: 'Discard dialog', selector: 'button[data-test-dialog-primary-btn]' },
    { name: 'Discard button', selector: 'button.artdeco-modal__confirm-dialog-btn' },
    { name: 'Discard text btn', selector: 'button:has-text("Discard")' },

    // Premium upsell modals
    { name: 'Premium dismiss', selector: 'button[data-test-modal-close-btn]' },
    { name: 'Premium X', selector: '.premium-upsell-link--dismiss' },
    { name: 'Prem modal close', selector: 'button.artdeco-modal__dismiss' },

    // Generic modal/dialog dismiss buttons
    { name: 'Modal dismiss', selector: 'button.artdeco-modal__dismiss' },
    { name: 'Modal close icon', selector: 'button.artdeco-button--circle.artdeco-modal__dismiss' },
    { name: 'Toast close', selector: 'button.artdeco-toast-item__dismiss' },

    // "Not now" / "Got it" / "Skip" generic dismissals
    { name: 'Not now', selector: 'button:has-text("Not now")' },
    { name: 'Got it', selector: 'button:has-text("Got it")' },
    { name: 'Skip', selector: 'button:has-text("Skip")' },
    { name: 'Dismiss', selector: 'button:has-text("Dismiss")' },
    { name: 'No thanks', selector: 'button:has-text("No thanks")' },

    // Cookie consent
    { name: 'Cookie accept', selector: 'button[action-type="ACCEPT"]' },

    // Message overlay "X" close buttons (stray ones)
    { name: 'Msg overlay close', selector: 'button.msg-overlay-bubble-header__control--close-btn' },
  ];

  // Run up to 3 rounds to handle chained popups
  for (let round = 0; round < 3; round++) {
    let dismissed = false;
    for (const strategy of dismissStrategies) {
      try {
        const el = await page.$(strategy.selector);
        if (el && (await el.isVisible())) {
          await el.click();
          console.log(`  🚫 Dismissed popup: ${strategy.name}`);
          await page.waitForTimeout(3000);
          dismissed = true;
          break; // Restart from top to catch chained popups
        }
      } catch {
        // Selector not found or not clickable — move on
      }
    }
    if (!dismissed) break; // No more popups
  }
}

// Scroll page until results stabilize and return count as number
async function scrollToLoadAllResults(page: Page): Promise<number> {
  const SCROLL_PX = 600;
  const MAX_STABLE = 3;
  const MAX_ROUNDS = 10;
  let prev = 0;
  let stable = 0;
  let rounds = 0;

  try {
    await page.waitForSelector('div[role="listitem"]', { timeout: 2000 });
  } catch {
    return 0;
  }

  while (rounds < MAX_ROUNDS && stable < MAX_STABLE) {
    rounds++;
    await page.mouse.wheel(0, SCROLL_PX);
    await page.waitForTimeout(300 + Math.random() * 200);
    const count = await page.evaluate(() => document.querySelectorAll('div[role="listitem"]').length);
    if (count > prev) {
      prev = count;
      stable = 0;
    } else {
      stable++;
    }
  }

  // bring viewport to top
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(150);
  return prev;
}

// Extract connectable profile cards on page
async function extractConnectableProfiles(page: Page): Promise<ProfileCard[]> {
  const cards = await page.$$('div[role="listitem"]');
  const results: ProfileCard[] = [];

  for (let i = 0; i < cards.length; i++) {
    try {
      const card = cards[i];
      
      const anchor = await card.$('a[href*="/in/"]');
      
      const profileUrl = anchor ? (await anchor.getAttribute('href')) || undefined : undefined;
      const name =  profileUrl?profileUrl.split("/in/")[1].replace(/\/$/, ''):`Person-${i+1}`; 
      console.log(name , "this is the name");

      // find connect button inside the card
      const connectBtn = await card.$('a[aria-label*="Invite"][aria-label*="connect"]') || await card.$('button:has-text("Connect")');
      if (!connectBtn) continue;

      // check disabled state
      const disabled = await connectBtn.getAttribute('aria-disabled');
      if (disabled === 'true') continue;

      results.push({ name, profileUrl, cardIndex: i });
    } catch (err) {
      // ignore and continue
    }
  }

  return results;
}

// Click Connect button on nth card
async function clickConnectOnCard(page: Page, cardIndex: number): Promise<boolean> {
  try {
    const locator = page.locator('div[role="listitem"]').nth(cardIndex);
    // try invite anchor first
    const inviteLocator = locator.locator('a[aria-label*="Invite"][aria-label*="connect"]');
    if (await inviteLocator.count() > 0) {
      try {
        console.log(`  ℹ️  Clicking Invite anchor on card ${cardIndex}`);
        await inviteLocator.first().click({ timeout: 2000 });
        await page.waitForTimeout(300);
        return true;
      } catch (err) {
        console.warn('  ⚠️  Invite anchor click failed', err);
      }
    }

    // fallback: any button with text Connect inside card
    const btn2 = locator.locator('button:has-text("Connect")');
    if (await btn2.count() > 0) {
      try {
        console.log(`  ℹ️  Clicking Connect button on card ${cardIndex}`);
        await btn2.first().click({ timeout: 2000 });
        await page.waitForTimeout(300);
        return true;
      } catch (err) {
        console.warn('  ⚠️  Connect button click failed', err);
      }
    }

    console.log(`  ⚠️  No clickable Connect found on card ${cardIndex}`);
    return false;
  } catch (err) {
    return false;
  }
}

// Handle the Connect modal/dialog: fill note if provided or send without note
async function handleConnectDialog(page: Page, connectionNote: string | null, personName: string): Promise<boolean> {
  // small delay for dialog to appear
  await page.waitForTimeout(400);

  try {
    // if dialog not present, assume sent
    const dialog = await page.$('div[role="dialog"]') || await page.$('div.artdeco-modal');
    if (!dialog) return true;

    if (connectionNote && connectionNote.trim()) {
      const addNote = await dialog.$('button:has-text("Add a note")');
      if (addNote && (await addNote.isVisible())) {
        await addNote.click();
        await page.waitForTimeout(250);
        const textarea = await dialog.$('textarea') || await page.$('textarea[name="message"]');
        if (textarea) {
          const firstName = personName.split(' ')[0] || 'there';
          const note = connectionNote.replace(/<FirstName>/g, firstName).replace(/<Name>/g, personName).slice(0, 300);
          await textarea.click();
          await textarea.fill('');
          await page.keyboard.type(note, { delay: 5 });
        }

        const sendBtn = await dialog.$('button:has-text("Send")') || await dialog.$('button[aria-label*="Send"]');
        if (sendBtn) {
          await sendBtn.click();
          await page.waitForTimeout(250);
          return true;
        }
      }
    }

    // send without note
    const sendWithout = await dialog.$('button:has-text("Send without a note")') || await dialog.$('button:has-text("Send")');
    if (sendWithout) {
      await sendWithout.click();
      await page.waitForTimeout(250);
      return true;
    }

    return true;
  } catch (err) {
    return false;
  }
}

// fallback: click Next button on current page
async function loadNextPage(page: Page): Promise<boolean> {
  try {
    const nextBtn = await page.$('button[aria-label="Next"]') || await page.$('button:has-text("Next")');
    if (!nextBtn) return false;
    await nextBtn.click();
    await page.waitForTimeout(800);
    await page.waitForSelector('div[role="listitem"]', { timeout: 5000 }).catch(() => {});
    return true;
  } catch {
    return false;
  }
}

// Main executor
export async function executeWorkflow(workflowId: string): Promise<{ totalFound: number; results: ConnectionResult[] }> {
  console.log(`\nExecuting workflow ${workflowId}`);

  const workflow = await prisma.workflow.findUnique({ where: { id: workflowId }, include: { user: true } });
  if (!workflow) throw new Error(`Workflow ${workflowId} not found`);
  if (!workflow.user) throw new Error(`Workflow user missing`);

  // ensure LinkedIn cookies exist
  if (!workflow.user.linkedinLiAt || !workflow.user.linkedinJsessionId) {
    throw new Error(`User ${workflow.userId} missing LinkedIn session cookies`);
  }

  await prisma.workflow.update({ where: { id: workflowId }, data: { status: 'running' } }).catch(() => {});

  const session = await getOrCreateSession(workflow.userId, workflow.user.linkedinLiAt, workflow.user.linkedinJsessionId);
  const page = await session.context.newPage();

  const results: ConnectionResult[] = [];
  let currentPage = 1;
  const MAX_PAGES = 12;

  try {
    const searchUrlBase = `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(workflow.targetCompany)}&origin=FACETED_SEARCH&network=%5B%22S%22%2C%22O%22%5D`;

    // If this workflow has an associated outreach/message template id, delegate to outreach service
    const outreachMessageId = (workflow as any).messageId || (workflow as any).outreachId || (workflow as any).outreachMessageId || null;
    if (outreachMessageId) {
      console.log(`Detected outreach messageId ${outreachMessageId} on workflow ${workflowId} — delegating to outreach service`);
      try {
        // reuse same session/page
        const outreachResult = await searchAndMessageEmployees(page, workflow.targetCompany || '', '', String(outreachMessageId), workflow.maxConnections || 30, 1500, 12);
        // searchAndMessageEmployees calls sendConnectionResult for each sent message
        const sent = outreachResult.results.filter(r => r.status === 'sent').length;
        const failed = outreachResult.results.filter(r => r.status === 'failed').length;
        await prisma.workflow.update({ where: { id: workflowId }, data: { totalSent: { increment: sent }, totalFailed: { increment: failed }, lastRunAt: new Date(), status: 'active', connectionData: outreachResult.results.map(r => JSON.stringify(r)) } }).catch(() => {});
        return { totalFound: outreachResult.totalFound, results: outreachResult.results.map(r => ({ name: r.name, profileUrl: r.profileUrl, status: r.status as "sent" | "failed", error: r.error })) };
      } catch (e) {
        console.error('Outreach delegation failed', e);
        await prisma.workflow.update({ where: { id: workflowId }, data: { status: 'failed' } }).catch(() => {});
        throw e;
      }
    }
    await page.goto(searchUrlBase, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('div[role="listitem"]', { timeout: 15000 }).catch(() => {});

    while (results.filter(r => r.status === 'sent').length < workflow.maxConnections && currentPage <= MAX_PAGES) {
      console.log(`Processing page ${currentPage}`);
      await dismissPopups(page);
      await scrollToLoadAllResults(page);
      const pageProfiles = await extractConnectableProfiles(page);
      console.log(`Found ${pageProfiles.length} profiles on page ${currentPage}`);

      for (const p of pageProfiles) {
        if (results.filter(r => r.status === 'sent').length >= workflow.maxConnections) break;
        try {
          await dismissPopups(page);
          console.log(`  → Attempting to click connect for ${p.name} (card ${p.cardIndex})`);
          const clicked = await clickConnectOnCard(page, p.cardIndex);
          if (!clicked) {
            results.push({ name: p.name, profileUrl: p.profileUrl, status: 'failed', error: 'Could not click' });
            continue;
          }
          const sent = await handleConnectDialog(page, workflow.connectionNote ?? null, p.name);
          if (sent) {
            results.push({ name: p.name, profileUrl: p.profileUrl, status: 'sent' });
            // send immediate result for frontend polling
            sendConnectionResult(results[results.length - 1], workflowId);
          } else {
            results.push({ name: p.name, profileUrl: p.profileUrl, status: 'failed', error: 'Dialog handling failed' });
          }
          await dismissPopups(page);
          await page.waitForTimeout(800 + Math.random() * 400);
        } catch (err) {
          results.push({ name: p.name, profileUrl: p.profileUrl, status: 'failed', error: String(err) });
        }
      }

      // if still not enough, open next page in new tab and process there
      const sentCount = results.filter(r => r.status === 'sent').length;
      if (sentCount >= workflow.maxConnections) break;

      currentPage++;
      if (currentPage > MAX_PAGES) break;

      const nextPage = await session.context.newPage();
      try {
        const url = new URL(searchUrlBase);
        url.searchParams.set('page', String(currentPage));
        console.log(`Opening next page tab: ${url.toString()}`);
        await nextPage.goto(url.toString(), { waitUntil: 'domcontentloaded', timeout: 60000 });
        await nextPage.waitForSelector('div[role="listitem"]', { timeout: 10000 }).catch(() => {});
        await dismissPopups(nextPage);
        await scrollToLoadAllResults(nextPage);
        const nextProfiles = await extractConnectableProfiles(nextPage);

        for (const p of nextProfiles) {
          if (results.filter(r => r.status === 'sent').length >= workflow.maxConnections) break;
          try {
            await dismissPopups(nextPage);
            const clicked = await clickConnectOnCard(nextPage, p.cardIndex);
            if (!clicked) {
              results.push({ name: p.name, profileUrl: p.profileUrl, status: 'failed', error: 'Could not click' });
              continue;
            }
            const sent = await handleConnectDialog(nextPage, workflow.connectionNote || null, p.name);
            if (sent) {
              results.push({ name: p.name, profileUrl: p.profileUrl, status: 'sent' });
              sendConnectionResult(results[results.length - 1], workflowId);
            } else {
              results.push({ name: p.name, profileUrl: p.profileUrl, status: 'failed', error: 'Dialog failed' });
            }
            await dismissPopups(nextPage);
            await nextPage.waitForTimeout(800 + Math.random() * 400);
          } catch (err) {
            results.push({ name: p.name, profileUrl: p.profileUrl, status: 'failed', error: String(err) });
          }
        }

        await nextPage.close();
      } catch (err) {
        try { await nextPage.close(); } catch {}
        // fallback: try to advance original page
        const advanced = await loadNextPage(page);
        if (!advanced) break;
      }
    }

    // update DB stats
    const sent = results.filter(r => r.status === 'sent').length;
    const failed = results.filter(r => r.status === 'failed').length;
    await prisma.workflow.update({ where: { id: workflowId }, data: { totalSent: { increment: sent }, totalFailed: { increment: failed }, lastRunAt: new Date(), status: 'active', connectionData: results.map(r => JSON.stringify(r)) } }).catch(() => {});

    return { totalFound: results.length, results };
  } catch (err) {
    await prisma.workflow.update({ where: { id: workflowId }, data: { status: 'failed' } }).catch(() => {});
    throw err;
  } finally {
    try { await page.close(); } catch {}

    try {
      const finalSent = results.filter(r => r.status === 'sent').length;
      const finalFailed = results.filter(r => r.status === 'failed').length;
      const html = buildReportEmail({ userName: workflow.user.name || 'there', workflowName: workflow.name, targetCompany: workflow.targetCompany, totalFound: results.length, sentCount: finalSent, failedCount: finalFailed, connections: results, executedAt: new Date() });

      await transporter.sendMail({ from: process.env.SMTP_FROM || 'noreply@example.com', to: workflow.user.email, subject: `Workflow ${workflow.name} — ${finalSent} connections`, text: `${finalSent} sent, ${finalFailed} failed`, html }).catch(() => {});
    } catch (e) {
      console.error('Email/report failed', e);
    }

    try {
      const pages = await session.context.pages();
      if (pages.length <= 1) await closeSession(workflow.userId);
    } catch {}
  }
}

// Minimal HTML report builder
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
