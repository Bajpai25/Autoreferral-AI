"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoginLinkedIn = LoginLinkedIn;
exports.SearchEmployee = SearchEmployee;
exports.sendReferralMessage = sendReferralMessage;
const playwright_1 = require("playwright");
// step 1 login done to linkedIn successfully
async function LoginLinkedIn(email, password) {
    const browser = await playwright_1.chromium.launch({ headless: false });
    const page = await browser.newPage();
    await page.goto("https://www.linkedin.com/login");
    await page.fill('input[name="session_key"]', email);
    await page.fill('input[name="session_password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: "networkidle" });
    console.log("Logged in to LinkedIn successfully");
    // check for login challenges
    if (page.url().includes("checkpoint")) {
        throw new Error("Login challenge detected");
    }
    return { browser, page };
}
// step 2 : search for the company employee from the linkedin search bar
async function SearchEmployee(page, companyName) {
    const searchUrl = `https://www.linkedin.com/search/results/people/?currentCompany=%5B%221441%22%5D&heroEntityKey=urn%3Ali%3Aorganization%3A1441&keywords=${companyName}&network=%5B%22F%22%5D&origin=FACETED_SEARCH&sid=8%3A)`;
    await page.goto(searchUrl, { waitUntil: "domcontentloaded" });
    await page.waitForSelector('a[href*="/in/"]', { timeout: 15000 });
    let profiles = [];
    let lastHeight = 0;
    while (true) {
        // Scroll down
        // await page.evaluate(() => window.scrollBy(0, window.innerHeight));
        // await page.waitForTimeout(1500);
        // Extract profile URLs
        const newProfiles = await page.$$eval('a[href*="/in/"]', (links) => links
            .map((link) => link.href)
            .filter((href) => /linkedin\.com\/in\//.test(href))
            .map((href) => {
            const url = new URL(href);
            return `https://www.linkedin.com${url.pathname.replace(/\/+$/, "")}/`;
        }));
        profiles = Array.from(new Set([...profiles, ...newProfiles]));
        // Stop when height doesn't change
        const newHeight = await page.evaluate(() => document.body.scrollHeight);
        if (newHeight === lastHeight)
            break;
        lastHeight = newHeight;
    }
    console.log(`Found ${profiles.length} unique profiles for company: ${companyName}`);
    return profiles;
}
// step 3 : visit each profile and send connection request
async function sendReferralMessage(page, profileUrl, message) {
    await page.goto(`${profileUrl}`);
    await page.waitForTimeout(2000);
    const isConnected = await page.$('button:has-text("Message")');
    if (isConnected) {
        await page.click('button:has-text("Message")');
        await page.fill('div.msg-form__contenteditable', message);
        await page.click('button.msg-form__send-button');
    }
    else {
        await page.click('button:has-text("Connect")');
        await page.click('button:has-text("Add a note")');
        await page.fill('textarea[name="message"]', "Hi! I’d like to connect and request a referral.");
        await page.click('button:has-text("Send")');
        // You'd need to schedule a re-check for when they accept.
    }
}
