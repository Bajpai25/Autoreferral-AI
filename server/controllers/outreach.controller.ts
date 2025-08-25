import { Request, Response } from 'express';
import { LoginLinkedIn , SearchEmployee ,  sendReferralMessage} from '../services/outreach.service';
import { profile } from 'console';



export async function sendReferral(req: Request, res: Response): Promise<void> {
  const { email, password, company, message } = req.body;

  try {
    const { browser, page } = await LoginLinkedIn(email, password);

    const profiles: string[] = await SearchEmployee(page, company);
    console.log(`Found ${profiles.length} profiles`);

    for (const [index, profile] of profiles.entries()) {
      console.log(`➡️ Sending message to ${profile} (${index + 1}/${profiles.length})`);
      try {
        await sendReferralMessage(page, profile, message);

        // Small delay to avoid LinkedIn bot detection (2–4 seconds random)
        const delay = 2000 + Math.floor(Math.random() * 2000);
        await page.waitForTimeout(delay);
      } catch (err) {
        console.error(`❌ Failed to send message to ${profile}:`, err);
      }
    }

    await browser.close();
    res.json({ success: true, processed: profiles.length });
  } catch (err: unknown) {
    console.error(err);
    if (err instanceof Error) {
      res.status(500).json({ error: err.message });
    } else {
      res.status(500).json({ error: "An unknown error occurred." });
    }
  }
}
