"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendReferral = sendReferral;
const outreach_service_1 = require("../services/outreach.service");
async function sendReferral(req, res) {
    const { email, password, company, message } = req.body;
    try {
        const { browser, page } = await (0, outreach_service_1.LoginLinkedIn)(email, password);
        const profiles = await (0, outreach_service_1.SearchEmployee)(page, company);
        console.log(profiles);
        // for (const profile of profiles) {
        await (0, outreach_service_1.sendReferralMessage)(page, profiles[0], message);
        // }
        await browser.close();
        res.json({ success: true, processed: profiles.length });
    }
    catch (err) {
        console.error(err);
        if (err instanceof Error) {
            res.status(500).json({ error: err.message });
        }
        else {
            res.status(500).json({ error: 'An unknown error occurred.' });
        }
    }
}
