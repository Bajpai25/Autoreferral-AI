"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOutreach = void 0;
exports.loginLinkedInWithCookies = loginLinkedInWithCookies;
exports.loginLinkedIn = loginLinkedIn;
exports.searchAndMessageEmployees = searchAndMessageEmployees;
const constant_1 = require("../utils/constant");
const playwright_1 = require("playwright");
// ─── Legacy login functions (kept for backward compatibility) ───
async function loginLinkedInWithCookies(liAt, jsessionId) {
    const browser = await playwright_1.chromium.launch({
        headless: false,
        args: ["--disable-blink-features=AutomationControlled"],
    });
    const context = await browser.newContext({
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        viewport: { width: 1280, height: 720 },
    });
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
    console.log("Navigating to LinkedIn with injected cookies.");
    await page.goto("https://www.linkedin.com/feed/", {
        waitUntil: "domcontentloaded",
        timeout: 30000,
    });
    await page.waitForTimeout(2000);
    const currentUrl = page.url();
    if (currentUrl.includes("/login") || currentUrl.includes("/authwall")) {
        await browser.close();
        throw new Error("Cookie-based login failed — cookies may have expired. Please re-authenticate via LinkedIn OAuth.");
    }
    console.log("Logged in via cookies successfully");
    const cookies = await context.cookies();
    return { browser, page, cookies };
}
async function loginLinkedIn(email, password) {
    const browser = await playwright_1.chromium.launch({
        headless: false,
        args: ["--disable-blink-features=AutomationControlled"],
    });
    const context = await browser.newContext({
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        viewport: { width: 1280, height: 720 },
    });
    const page = await context.newPage();
    await page.goto("https://www.linkedin.com/login");
    await page.waitForTimeout(2000);
    await page.fill('input[name="session_key"]', email);
    await page.fill('input[name="session_password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForURL("**/feed/**", { timeout: 30000 });
    if (page.url().includes("checkpoint") ||
        page.url().includes("challenge")) {
        throw new Error("Login challenge detected (captcha/2FA). Please complete it manually.");
    }
    await page.waitForTimeout(3000);
    const cookies = await context.cookies();
    console.log("Logged in successfully");
    return { browser, page, cookies };
}
// ─── Helper: Human-like random delay ───
function randomDelay(minMs, maxMs) {
    return minMs + Math.random() * (maxMs - minMs);
}
// ─── Helper: Dismiss the "Leave? / Discard" confirmation dialog ───
async function dismissDiscardDialog(page) {
    const discardSelectors = [
        'button[data-test-dialog-primary-btn]',
        'button.artdeco-modal__confirm-dialog-btn',
        'button.artdeco-button--primary:has-text("Discard")',
        'button:has-text("Discard")',
    ];
    for (const sel of discardSelectors) {
        try {
            const btn = await page.$(sel);
            if (btn && (await btn.isVisible())) {
                await btn.click();
                console.log(`  🚫 Dismissed discard dialog via: ${sel}`);
                await page.waitForTimeout(randomDelay(100, 250));
                return true;
            }
        }
        catch {
            // Selector not found or not clickable — try next
        }
    }
    return false;
}
// ─── Helper: Dismiss random LinkedIn popups/dialogs ───
async function dismissPopups(page) {
    // List of popup dismiss strategies, tried in order
    const dismissStrategies = [
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
                    await page.waitForTimeout(randomDelay(100, 250));
                    dismissed = true;
                    break; // Restart from top to catch chained popups
                }
            }
            catch {
                // Selector not found or not clickable — move on
            }
        }
        if (!dismissed)
            break; // No more popups
    }
}
// ─── Helper: Progressive scroll to load all search results ───
async function scrollToLoadAllResults(page) {
    console.log("📜 Scrolling to load all search results...");
    let previousCardCount = 0;
    let stableRounds = 0;
    const MAX_STABLE_ROUNDS = 3; // Stop after 3 scrolls with no new cards
    const SCROLL_INCREMENT = 600;
    let scrollAttempts = 0;
    const MAX_SCROLL_ATTEMPTS = 20; // Safety cap
    // Wait for initial results to appear
    try {
        await page.waitForSelector('div[role="listitem"]', { timeout: 10000 });
    }
    catch {
        console.log("⚠️  No search results found on page");
        return "Please go to the connections workflow in order to have better chances of getting a referral.";
    }
    while (scrollAttempts < MAX_SCROLL_ATTEMPTS) {
        scrollAttempts++;
        // Scroll down
        await page.mouse.wheel(0, SCROLL_INCREMENT);
        await page.waitForTimeout(randomDelay(400, 700));
        // Count current cards
        const currentCardCount = await page.evaluate(() => {
            return document.querySelectorAll('div[role="listitem"]').length;
        });
        if (currentCardCount > previousCardCount) {
            console.log(`  Scroll #${scrollAttempts}: ${currentCardCount} cards loaded`);
            previousCardCount = currentCardCount;
            stableRounds = 0;
        }
        else {
            stableRounds++;
            if (stableRounds >= MAX_STABLE_ROUNDS) {
                console.log(`  No new cards after ${MAX_STABLE_ROUNDS} scrolls — all results loaded`);
                break;
            }
        }
    }
    // Scroll back to top
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(200);
    console.log(`📜 Total cards discovered: ${previousCardCount}`);
    return `This is the profiles received as your connections: ${previousCardCount}`;
}
// ─── Helper: Extract messageable profiles from the current page ───
async function extractMessageableProfiles(page) {
    return page.evaluate(() => {
        const results = [];
        const cards = document.querySelectorAll('div[role="listitem"]');
        cards.forEach((card, index) => {
            // Check for Message button (1st-degree connections)
            // LinkedIn: <a aria-label="Message" href="/messaging/compose/...">
            const msgBtn = card.querySelector('a[aria-label="Message"]') ||
                card.querySelector('a[href*="/messaging/compose/"]');
            if (!msgBtn)
                return;
            // Extract name — the profile name is in the FIRST <a href="/in/..."> in the card
            // Structure: <p><a href="/in/name-slug/">Full Name</a> <span>• 1st</span></p>
            let name = "";
            let profileUrl = "";
            // Find the profile link — first a[href*="/in/"] in the card is always the person's name
            const profileLink = card.querySelector('a[href*="/in/"]');
            if (profileLink) {
                profileUrl = profileLink.getAttribute("href") || "";
                // Name is direct text content of the <a> tag
                name = profileLink.textContent?.trim() || "";
            }
            // Clean up name — remove any degree indicators that might have leaked in
            name = name.replace(/\s*•\s*(1st|2nd|3rd)\s*/g, "").trim();
            // Always include profiles that have a Message button
            results.push({
                name: name || `Profile #${index + 1}`,
                profileUrl,
                cardIndex: index,
            });
        });
        return results;
    });
}
// ─── Helper: Click Message button on a specific card by index ───
async function clickMessageButtonOnCard(page, cardIndex, retries = 2) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const cards = await page.$$('div[role="listitem"]');
            if (cardIndex >= cards.length) {
                console.log(`  ⚠️  Card #${cardIndex} not found (${cards.length} cards on page)`);
                return false;
            }
            const card = cards[cardIndex];
            // Scroll the card into view
            await card.scrollIntoViewIfNeeded();
            await page.waitForTimeout(randomDelay(100, 200));
            // Find the Message button INSIDE this specific card
            // LinkedIn: <a aria-label="Message" href="/messaging/compose/...">
            const msgBtn = (await card.$('a[aria-label="Message"]')) ||
                (await card.$('a[href*="/messaging/compose/"]'));
            if (!msgBtn) {
                console.log(`  ⚠️  No Message button in card #${cardIndex}`);
                return false;
            }
            await msgBtn.scrollIntoViewIfNeeded();
            await page.waitForTimeout(randomDelay(50, 150));
            await msgBtn.click();
            return true;
        }
        catch (e) {
            if (attempt < retries) {
                console.log(`  ⚠️  Retry ${attempt}/${retries} clicking Message button on card #${cardIndex}`);
                await page.waitForTimeout(randomDelay(200, 400));
            }
        }
    }
    return false;
}
// ─── Helper: Extract name from the opened message dialog ───
async function extractNameFromMessageDialog(page) {
    const nameSelectors = [
        // Current LinkedIn structure: <a class="profile-card-one-to-one__profile-link"><span class="truncate">Name</span></a>
        'a.profile-card-one-to-one__profile-link span.truncate',
        // Fallback selectors
        '.msg-s-profile-card a[href*="/in/"] span.truncate',
        '.msg-s-profile-card .artdeco-entity-lockup__title a span',
        '.msg-overlay-bubble-header__title',
    ];
    for (const selector of nameSelectors) {
        try {
            const nameEl = await page.$(selector);
            if (nameEl) {
                const name = await nameEl.evaluate((el) => el.textContent?.trim() || '');
                if (name) {
                    console.log(`  👤 Extracted name from dialog: "${name}"`);
                    return name;
                }
            }
        }
        catch { }
    }
    console.log('Could not extract name from message dialog');
    return '';
}
// ─── Helper: Type and send message in the open dialog ───
async function typeAndSendMessage(page, messageTemplate, dialogName) {
    // Use the name extracted from the dialog for personalization
    const firstName = dialogName.split(' ')[0] || 'there';
    const message = messageTemplate
        .replace('<FirstName>', firstName)
        .replace('<Name>', dialogName);
    // Wait for dialog to open
    await page.waitForTimeout(randomDelay(500, 800));
    // Try multiple selectors for the message input
    const inputSelectors = [
        'div.msg-form__contenteditable[contenteditable="true"]',
        'div[contenteditable="true"][role="textbox"]',
        'div[contenteditable="true"][aria-label*="Write a message"]',
        'div[contenteditable="true"][aria-label*="message"]',
    ];
    let inputFound = false;
    for (const selector of inputSelectors) {
        try {
            const inputBox = await page.waitForSelector(selector, {
                timeout: 3000,
                state: "visible",
            });
            if (!inputBox)
                continue;
            await inputBox.click();
            await page.waitForTimeout(100);
            // Clear existing text
            await page.keyboard.press("Control+A");
            await page.keyboard.press("Backspace");
            await page.waitForTimeout(100);
            // Type the message with human-like speed
            await page.keyboard.type(message, { delay: randomDelay(5, 15) });
            await page.waitForTimeout(200);
            // Verify text was typed
            const typedText = await inputBox.evaluate((el) => el.textContent || el.innerText || "");
            if (typedText.trim().length > 0) {
                console.log(`  ✏️  Message typed (${typedText.trim().length} chars)`);
                inputFound = true;
                break;
            }
        }
        catch {
            continue;
        }
    }
    if (!inputFound) {
        console.log("  ❌ Could not type message — no input box found");
        return { sent: false, name: dialogName };
    }
    // Click Send button
    let sendClicked = false;
    try {
        // Wait for send button to become enabled
        await page.waitForFunction(() => {
            const btn = document.querySelector("button.msg-form__send-button");
            return btn && !btn.hasAttribute("disabled");
        }, { timeout: 3000 });
        const sendBtn = await page.$("button.msg-form__send-button");
        if (sendBtn && (await sendBtn.isEnabled())) {
            await sendBtn.click();
            sendClicked = true;
            console.log("  ✅ Clicked Send");
        }
    }
    catch {
        // Fallback: try force click
        try {
            const sendBtn = await page.$("button.msg-form__send-button");
            if (sendBtn) {
                await sendBtn.click({ force: true });
                sendClicked = true;
                console.log("  ✅ Force-clicked Send");
            }
        }
        catch { }
    }
    // Last resort: press Enter
    if (!sendClicked) {
        await page.keyboard.press("Enter");
        console.log("  ✅ Pressed Enter as send fallback");
    }
    await page.waitForTimeout(randomDelay(500, 800));
    return { sent: true, name: dialogName };
}
// ─── Helper: Close the message dialog (with retry + discard handling) ───
async function closeMessageDialog(page) {
    const MAX_RETRIES = 3;
    const closeSelectors = [
        'button.msg-overlay-bubble-header__control--close-btn',
        'button[data-control-name="overlay.close_conversation_window"]',
        'button.msg-overlay-bubble-header__control[aria-label*="Close"]',
        'button.artdeco-button--circle.artdeco-button--muted[aria-label*="Close"]',
    ];
    // Selectors to check if any message dialog is still open
    const dialogOpenSelectors = [
        'div.msg-overlay-conversation-bubble--is-active',
        'div.msg-overlay-bubble-header',
        'div.msg-form__contenteditable',
    ];
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        // 1. Always dismiss any existing "Leave? / Discard" dialog first
        await dismissDiscardDialog(page);
        // 2. Try to click a close button
        let closed = false;
        for (const selector of closeSelectors) {
            try {
                const btn = await page.$(selector);
                if (btn && (await btn.isVisible())) {
                    await btn.click();
                    console.log(`  ✖️  Clicked close button: ${selector.slice(0, 50)}`);
                    closed = true;
                    await page.waitForTimeout(randomDelay(150, 300));
                    break;
                }
            }
            catch { }
        }
        // 3. If clicking close triggered a "Leave?" dialog, dismiss it
        await dismissDiscardDialog(page);
        // 4. Check if dialog is actually gone
        let stillOpen = false;
        for (const sel of dialogOpenSelectors) {
            try {
                const el = await page.$(sel);
                if (el && (await el.isVisible())) {
                    stillOpen = true;
                    break;
                }
            }
            catch { }
        }
        if (!stillOpen) {
            return; // Successfully closed
        }
        // 5. Last resort on final attempt: press Escape + handle discard
        if (attempt === MAX_RETRIES) {
            console.log('  ⚠️  Final attempt: pressing Escape to close dialog');
            try {
                await page.keyboard.press('Escape');
                await page.waitForTimeout(200);
                await dismissDiscardDialog(page);
                await page.waitForTimeout(100);
            }
            catch { }
        }
        await page.waitForTimeout(randomDelay(100, 200));
    }
}
// ─── Main: Search and message employees ───
async function searchAndMessageEmployees(page, companyName, messageTemplate, messageId, maxMessages = 10, delayBetweenMessages = 3000, maxPages = 1) {
    // Navigate to search
    const searchUrl = `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(companyName)}&network=%5B%22F%22%5D&origin=FACETED_SEARCH`;
    console.log(`\n🔍 Navigating to search: ${searchUrl}`);
    await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
    // Wait for search results to load (adaptive — wait for actual DOM elements)
    try {
        await page.waitForSelector('div[role="listitem"]', { timeout: 15000 });
        console.log("✅ Search results loaded");
    }
    catch {
        console.log("⚠️  No search results appeared within 15s");
        await page.close();
        const fallbackmsg = [
            {
                name: "dummy",
                profileUrl: "null",
                status: "failed",
                error: "Please try to create more connections using the connections workflow to have a better chance at getting referrals"
            }
        ];
        return { totalFound: 0, results: fallbackmsg };
    }
    // Scroll to discover all lazy-loaded profiles
    await scrollToLoadAllResults(page);
    // Extract messageable profiles
    const cardData = await extractMessageableProfiles(page);
    console.log(`\n📋 Found ${cardData.length} messageable profiles (1st connections):`);
    cardData.forEach((p, i) => {
        console.log(`  ${i + 1}. ${p.name} → ${p.profileUrl}`);
    });
    if (cardData.length === 0) {
        const debug = await page.evaluate(() => ({
            listItems: document.querySelectorAll('div[role="listitem"]').length,
            msgButtons: document.querySelectorAll('a[aria-label="Message"]').length,
            titleLinks: document.querySelectorAll('a[data-view-name="search-result-lockup-title"]').length,
            url: window.location.href,
        }));
        console.log("Debug info:", JSON.stringify(debug));
        await page.close();
        const fallbackmsg = [
            {
                name: "dummy",
                profileUrl: "null",
                status: "failed",
                error: "Please try to create more connections using the connections workflow to have a better chance at getting referrals"
            }
        ];
        return { totalFound: 0, results: fallbackmsg };
    }
    // Fetch the actual message template from DB if messageId is provided
    if (messageId && messageId.trim() !== "") {
        const messageData = await constant_1.prisma.outreach.findUnique({
            where: { id: messageId },
        });
        if (!messageData || !messageData.message) {
            throw new Error("Invalid messageId or message not found in database");
        }
        messageTemplate = messageData.message;
    }
    // Process each profile — card by card
    const results = [];
    const limit = Math.min(cardData.length, maxMessages);
    for (let i = 0; i < limit; i++) {
        const { name: searchName, profileUrl, cardIndex } = cardData[i];
        let name = searchName;
        try {
            console.log(`\n${"=".repeat(50)}`);
            console.log(` [${i + 1}/${limit}] ${searchName}`);
            // Dismiss any stray popups before starting
            await dismissPopups(page);
            // Step 1: Click the Message button on THIS specific card
            const clicked = await clickMessageButtonOnCard(page, cardIndex);
            if (!clicked) {
                results.push({
                    name: searchName,
                    profileUrl,
                    status: "failed",
                    error: "Could not click Message button",
                });
                continue;
            }
            console.log(`  📩 Clicked Message button`);
            // Step 2: Wait for dialog to open, then extract name from dialog profile card
            await page.waitForTimeout(randomDelay(500, 800));
            const dialogName = await extractNameFromMessageDialog(page);
            name = dialogName || searchName;
            // Step 3: Type personalized message and send
            const result = await typeAndSendMessage(page, messageTemplate, name);
            if (!result.sent) {
                await closeMessageDialog(page);
                results.push({
                    name,
                    profileUrl,
                    status: "failed",
                    error: "Could not type/send message",
                });
                continue;
            }
            // Step 4: Close the message dialog
            await closeMessageDialog(page);
            // Step 5: Final cleanup — dismiss any stray popups that appeared
            await dismissPopups(page);
            console.log(`  ✅ Message sent to ${name}!`);
            results.push({ name, profileUrl, status: "sent" });
            // Human-like delay before next message
            if (i < limit - 1) {
                const delay = delayBetweenMessages + randomDelay(500, 1500);
                console.log(`  ⏳ Waiting ${Math.round(delay / 1000)}s before next...`);
                await page.waitForTimeout(delay);
            }
        }
        catch (error) {
            const errorMsg = error instanceof Error ? error.message : "Unknown error";
            console.error(`  ❌ Error for ${name}:`, errorMsg);
            // Check if browser is still alive
            try {
                await page.title();
            }
            catch {
                console.error("💥 Browser crashed, stopping");
                results.push({
                    name,
                    profileUrl,
                    status: "failed",
                    error: "Browser crashed",
                });
                break;
            }
            results.push({ name, profileUrl, status: "failed", error: errorMsg });
            // Cleanup: dismiss any popups and close dialog
            await dismissPopups(page);
            await closeMessageDialog(page);
            await dismissPopups(page);
            await page.waitForTimeout(randomDelay(200, 400));
        }
    }
    // ─── Pagination: process additional pages if configured ───
    let currentPage = 1;
    while (currentPage < maxPages && results.filter((r) => r.status === "sent").length < maxMessages) {
        console.log(`\n📄 Looking for page ${currentPage + 1}...`);
        // Scroll to the bottom to expose pagination controls
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await page.waitForTimeout(randomDelay(500, 1000));
        // Try to find and click "Next" button
        const nextBtnSelectors = [
            'button[aria-label="Next"]',
            'button.artdeco-pagination__button--next',
            'li.artdeco-pagination__indicator--number.active + li button',
        ];
        let nextClicked = false;
        for (const sel of nextBtnSelectors) {
            try {
                const btn = await page.$(sel);
                if (btn && (await btn.isVisible()) && (await btn.isEnabled())) {
                    await btn.click();
                    nextClicked = true;
                    console.log(`  ➡️  Clicked Next page button`);
                    break;
                }
            }
            catch { }
        }
        if (!nextClicked) {
            console.log('  ⚠️  No Next page button found — stopping pagination');
            break;
        }
        currentPage++;
        // Wait for next page to load
        try {
            await page.waitForSelector('div[role="listitem"]', { timeout: 15000 });
            await page.waitForTimeout(randomDelay(800, 1500));
        }
        catch {
            console.log('  ⚠️  Next page did not load — stopping pagination');
            break;
        }
        // Dismiss any popups on the new page
        await dismissPopups(page);
        // Scroll to load all results on the new page
        await scrollToLoadAllResults(page);
        // Extract new profiles
        const newCardData = await extractMessageableProfiles(page);
        console.log(`\n📋 Page ${currentPage}: Found ${newCardData.length} messageable profiles`);
        if (newCardData.length === 0) {
            console.log('  ⚠️  No profiles found on this page — stopping pagination');
            break;
        }
        // Process profiles on this page
        const remainingSlots = maxMessages - results.filter((r) => r.status === "sent").length;
        const pageLimit = Math.min(newCardData.length, remainingSlots);
        for (let i = 0; i < pageLimit; i++) {
            const { name: searchName, profileUrl, cardIndex } = newCardData[i];
            let name = searchName;
            try {
                console.log(`\n${"=".repeat(50)}`);
                console.log(` [Page ${currentPage} - ${i + 1}/${pageLimit}] ${searchName}`);
                await dismissPopups(page);
                const clicked = await clickMessageButtonOnCard(page, cardIndex);
                if (!clicked) {
                    results.push({ name: searchName, profileUrl, status: "failed", error: "Could not click Message button" });
                    continue;
                }
                console.log(`  📩 Clicked Message button`);
                await page.waitForTimeout(randomDelay(500, 800));
                const dialogName = await extractNameFromMessageDialog(page);
                name = dialogName || searchName;
                const result = await typeAndSendMessage(page, messageTemplate, name);
                if (!result.sent) {
                    await closeMessageDialog(page);
                    results.push({ name, profileUrl, status: "failed", error: "Could not type/send message" });
                    continue;
                }
                await closeMessageDialog(page);
                await dismissPopups(page);
                console.log(`  ✅ Message sent to ${name}!`);
                results.push({ name, profileUrl, status: "sent" });
                if (i < pageLimit - 1) {
                    const delay = delayBetweenMessages + randomDelay(500, 1500);
                    console.log(`  ⏳ Waiting ${Math.round(delay / 1000)}s before next...`);
                    await page.waitForTimeout(delay);
                }
            }
            catch (error) {
                const errorMsg = error instanceof Error ? error.message : "Unknown error";
                console.error(`  ❌ Error for ${name}:`, errorMsg);
                try {
                    await page.title();
                }
                catch {
                    console.error("💥 Browser crashed, stopping");
                    results.push({ name, profileUrl, status: "failed", error: "Browser crashed" });
                    break;
                }
                results.push({ name, profileUrl, status: "failed", error: errorMsg });
                await dismissPopups(page);
                await closeMessageDialog(page);
                await dismissPopups(page);
                await page.waitForTimeout(randomDelay(200, 400));
            }
        }
    }
    // Summary
    const sentCount = results.filter((r) => r.status === "sent").length;
    const failedCount = results.filter((r) => r.status === "failed").length;
    console.log(`\n🏁 Done! ${sentCount} sent, ${failedCount} failed out of ${results.length} (across ${currentPage} page(s))`);
    await page.close();
    // Update DB
    await constant_1.prisma.outreach.update({
        where: { id: messageId },
        data: { messageCount: sentCount },
    });
    return { totalFound: cardData.length, results };
}
// get outreach via passing the userId
const getOutreach = async (req, res) => {
    try {
        const { userId } = req.body;
        if (!userId) {
            return res.status(400).json({ message: "userId is required" });
        }
        const outreach = await constant_1.prisma.outreach.findMany({
            where: {
                userId: userId
            }
        });
        return res.status(200).json({ outreach });
    }
    catch (err) {
        console.log(err);
        return res.status(500).json({ message: "Internal server error" });
    }
};
exports.getOutreach = getOutreach;
