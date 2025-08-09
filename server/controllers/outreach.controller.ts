import { Request, Response } from 'express';
import { LoginLinkedIn , SearchEmployee ,  sendReferralMessage} from '../services/outreach.service';
import { profile } from 'console';



 export async function sendReferral (req: Request, res: Response):Promise<void>  {
    const { email, password, company, message } = req.body;

    try {
        const { browser, page } = await LoginLinkedIn(email, password);
        const profiles:string[] = await SearchEmployee(page, company);
        console.log(profiles);

        // for (const profile of profiles) {
            await sendReferralMessage(page, profiles[0], message);
        // }

        await browser.close();
        res.json({ success: true, processed: profiles.length });
    } catch (err:unknown) {
        console.error(err);
        if (err instanceof Error) {
            res.status(500).json({ error: err.message });
        } else {
            res.status(500).json({ error: 'An unknown error occurred.' });
        }
    }
}