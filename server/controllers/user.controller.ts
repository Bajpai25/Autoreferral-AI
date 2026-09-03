import jwt from "jsonwebtoken";
import { Request, Response } from "express";
import { chromium } from "playwright";
import crypto from "crypto";
import {prisma} from "../utils/constant"

declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}



// now storing the cookie and li_at in the db for using it later on for multiple automation setup by the user

export interface LinkedInOAuthSession {
  li_at: string;
  jsessionId: string;
  accessToken: string;
  createdAt: Date;
}

export const linkedinSessions = new Map<string, LinkedInOAuthSession>();

// creation of register controller 

export const register=async(req:Request,res:Response)=>{
    const {email , password, name} = req.body;

    try{
        if(!email || !password || !name){
            res.status(400).json({
                message:"Please fill all the fields"
            })
        }
        // now to check if the user alradyv exists in the db or not

        const user =await prisma.user.findUnique({
            where:{
                email:email
            }
        })
        if(user){
            return res.status(400).json({
                message:"User already exists"
            })
        }
        // now we can create a new fresh user

        const newUser=await prisma.user.create({
            data:{
                email:email,
                password:password,
                name:name
            }
        })
        return res.status(200).json({
            message:"User registered successfully",
            user:newUser
        });
    }
    catch(error){
        console.error("Error during user registration:", error);
        return res.status(500).json({
            message:"Internal server error"
        });
    }
}

// creation of login controller

export const login=async(req:Request,res:Response)=>{
    const {email , password} = req.body;

    try{
        if(!email || !password){
            res.status(400).json({
                message:"Please fill all the fields"
            })
        }
        // now to check if the user exists in the db or not

        const user =await prisma.user.findUnique({
            where:{
                email:email
            }
        })
        if(!user){
            return res.status(400).json({
                message:"User does not exists"
            })
        }
        // now we can check if the password is correct or not

        if(user.password !== password){
            return res.status(400).json({
                message:"Incorrect password"
            })
        }
        // now we can create a jwt token and send it to the user

        const token = jwt.sign({id:user.id},process.env.JWT_SECRET || "vdchjvahcvashc" ,{
            expiresIn:"1d"
        })

        return res.status(200).json({
            message:"User logged in successfully",
            token:token,
            user:user
        });
    }
    catch(error){
        console.error("Error during user login:", error);
        return res.status(500).json({
            message:"Internal server error"
        });
    }
}

// identification of user

export const authenticateUser=async(req:Request , res:Response,next:any)=>{
    const token = req.headers.authorization?.split(" ")[1];

    if(!token){
        return res.status(401).json({
            message:"Unauthorized"
        });
    }

    try{
        const decoded = jwt.verify(token, process.env.JWT_SECRET ||"vdchjvahcvashc" );
        req.user = decoded;
        next();
    }
    catch(error){
        console.error("Error during token verification:", error);
        return res.status(401).json({
            message:"Invalid token"
        });
    }
}

export const authenticateUserToken=async(req:Request , res:Response,next:any)=>{
    const token = req.headers.authorization?.split(" ")[1];

    if(!token){
        return res.status(401).json({
            message:"Unauthorized"
        });
    }

    try{
        const decoded = jwt.verify(token, process.env.JWT_SECRET ||"vdchjvahcvashc" );
        req.user = decoded;
        const data=await prisma.user.findUnique({where:{id:req.user.id}})
       
        return res.status(200).json({success:true , message:"User is valid",data:req.user.id , name:data?.name});
    }
    catch(error){
        console.error("Error during token verification:", error);
        return res.status(401).json({
            message:"Invalid token"
        });
    }
}

// complete flow explained below

// LinkedIn OAuth Callback
// Receives ?code=...&state=... from LinkedIn redirect
// Exchanges code → access_token → fetches profile → Find/Create User
// → Playwright manual login → extract cookies → store session (keyed by DB userId)
// → Redirect to dashboard with app token

export const linkedinAuthCallback = async (req: Request, res: Response) => {
  const code = req.query.code as string;
  // Note: we can still use state if needed, but we'll primarily rely on the email from LinkedIn
  
    // console.log("LinkedIn OAuth callback received");
    // console.log("code:", code);

    const DASHBOARD_URL = "http://localhost:5173/dashboard";

    if (!code) {
      console.error(" Missing code in callback");
      return res.redirect(`${DASHBOARD_URL}?error=missing_auth_code`);
    }

    try {
      // Step 1: Exchange authorization code for access token
      const params = new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: process.env.LINKEDIN_REDIRECT_URI!,
        client_id: process.env.LINKEDIN_CLIENT_ID!,
        client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
      });

      // console.log("Exchanging code for access token");

      const tokenRes = await fetch(
        "https://www.linkedin.com/oauth/v2/accessToken",
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: params.toString(),
        }
      );

      const tokenData = await tokenRes.json();

      if (!tokenData.access_token) {
        console.error("Token exchange failed:", tokenData);
        return res.redirect(`${DASHBOARD_URL}?error=token_exchange_failed`);
      }

      const accessToken = tokenData.access_token;
      // console.log("Access Token obtained:", accessToken);

    // Step 2: Fetch user's profile from LinkedIn userinfo API
    let userEmail = "";
    let userName = "";
    try {
      console.log("Fetching user profile from LinkedIn API...");
      const profileRes = await fetch("https://api.linkedin.com/v2/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const profileData = await profileRes.json();
      userEmail = profileData.email || "";
      userName = profileData.name || profileData.given_name || "LinkedIn User";
      console.log(`User email: ${userEmail}, Name: ${userName}`);
    } catch (e) {
      console.error("Failed to fetch user profile from LinkedIn" , e);
      return res.redirect(`${DASHBOARD_URL}?error=profile_fetch_failed`);
    }

    if (!userEmail) {
      console.error("No email returned from LinkedIn");
      return res.redirect(`${DASHBOARD_URL}?error=email_not_provided`);
    }

    // Step 3: Find or create user in DB
    let user = await prisma.user.findUnique({
      where: { email: userEmail }
    });

    if (!user) {
      console.log(`Creating new user for email: ${userEmail}`);
      user = await prisma.user.create({
        data: {
          email: userEmail,
          name: userName,
          password: crypto.randomUUID(), // Random password for OAuth users
        }
      });
    } else {
      console.log(`Existing user found: ${user.id}`);
    }

    // Step 4: Generate App JWT Token
    const appToken = jwt.sign(
      { id: user.id },
      process.env.JWT_SECRET || "vdchjvahcvashc" ,
      { expiresIn: "1d" }
    );

    // Step 5: Launch Playwright for manual login & cookie extraction
    console.log("Launching Playwright — please log in to LinkedIn in the browser window.");
    const cookies = await getLinkedInCookiesViaManualLogin(userEmail);

    if (!cookies.liAt || !cookies.jsessionId) {
      console.error("Cookie extraction failed");
      // Still redirect with token since user is created/logged in locally, 
      // but they won't have LinkedIn outreach capability until they try again.
      return res.redirect(`${DASHBOARD_URL}?token=${appToken}&error=linkedin_session_failed`);
    }

    // Step 6: Store session in memory keyed by DB User ID
    linkedinSessions.set(user.id, {
      li_at: cookies.liAt,
      jsessionId: cookies.jsessionId,
      accessToken,
      createdAt: new Date(),
    });

    // Also persist cookies to DB so they survive server restarts
    await prisma.user.update({
      where: { id: user.id },
      data: {
        linkedinLiAt: cookies.liAt,
        linkedinJsessionId: cookies.jsessionId,
        linkedinAccessToken: accessToken,
        linkedinCookieUpdatedAt: new Date(),
      },
    });

    // console.log(`LinkedIn session stored for user ID: ${user.id}`);
    // console.log(`Active sessions: ${linkedinSessions.size}`);

    // Step 7: Redirect user back to dashboard WITH the token
    return res.redirect(`${DASHBOARD_URL}?token=${appToken}`);

  } catch (error) {
    console.error(" LinkedIn OAuth callback error:", error);
    return res.redirect(`${DASHBOARD_URL}?error=callback_internal_error`);
  }
};


// Open a Playwright browser, navigate to LinkedIn login,
// pre-fill the email if available, then WAIT for the user
// to complete login manually. Extract cookies after login.
// This handles 2FA, captchas, etc. naturally.

export async function getLinkedInCookiesViaManualLogin(email?: string) {
  const browser = await chromium.launch({
    headless: false,
    args: ["--disable-blink-features=AutomationControlled"],
  });

  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    viewport: { width: 1280, height: 720 },
  });

  const page = await context.newPage();

  try {
    // Navigate to LinkedIn login page
    console.log("Navigating to LinkedIn login");
    await page.goto("https://www.linkedin.com/login", {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    await page.waitForTimeout(2000);

    if (email) {
      console.log(`Pre-filling email: ${email}`);
      try {
        await page.fill('input[type="email"]', email);
        // Focus the password field so user just needs to type password
        await page.click('input[type="session_password"]');
      } catch (e) {
        console.log(" Could not pre-fill email field");
      }
    }

    // Wait for user to complete login — poll until we land on /feed/
    console.log("Waiting for you to log in (up to 2 minutes)...");
    console.log("Please enter your password and complete login in the browser window");

    const maxWaitMs = 120_000; // 2 minutes
    const pollInterval = 2000;
    let elapsed = 0;
    let loggedIn = false;

    while (elapsed < maxWaitMs) {
      await page.waitForTimeout(pollInterval);
      elapsed += pollInterval;

      const currentUrl = page.url();

      // Check if we've reached the feed (successful login)
      if (currentUrl.includes("/feed") || currentUrl.includes("/mynetwork") || currentUrl.includes("/in/")) {
        console.log("Login detected! Extracting cookies...");
        loggedIn = true;
        break;
      }

      // Check for challenge pages — user needs to complete them
      if (currentUrl.includes("checkpoint") || currentUrl.includes("challenge")) {
        console.log(`Challenge/2FA detected — waiting for completion... (${Math.round(elapsed / 1000)}s)`);
      }

      // Log progress every 10 seconds
      if (elapsed % 10000 === 0) {
        console.log(`Still waiting for login... (${Math.round(elapsed / 1000)}s / ${maxWaitMs / 1000}s)`);
      }
    }

    if (!loggedIn) {
      console.log("Login timed out after 2 minutes");
      return { liAt: undefined, jsessionId: undefined };
    }

    // Give LinkedIn a moment to set all cookies
    await page.waitForTimeout(3000);

    // Extract cookies
    const allCookies = await context.cookies();
    const liAt = allCookies.find((c) => c.name === "li_at")?.value;
    const jsessionId = allCookies.find((c) => c.name === "JSESSIONID")?.value;

    console.log("li_at:", liAt ? liAt : "NOT FOUND");
    console.log("JSESSIONID:", jsessionId ? jsessionId : "NOT FOUND");

    return { liAt, jsessionId };
  } finally {
    await browser.close();
    console.log("Playwright browser closed");
  }
}

// handle the logout logic too once the user clicks on Logout then remove the user cookie from the db , and other session credentials too for better privacy 


export const logoutUser=async(req:Request , res:Response)=>{
     const {userId}=req.body;
     if(!userId){
      return res.status(404).json({message:"UserId not found"});
     }
     try{
      const userData=await prisma.user.update({where:{id:userId},data:{
          linkedinLiAt:"",
          linkedinAccessToken:"",
          linkedinJsessionId:""
      }})

      if(!userData){
        return res.status(404).json({message:"User not found with this UserId"});
      }
      return res.status(200).json({message:"User logged out successfully"});
     }
     catch(err){
      console.log(err);
      return res.status(500).json({message:"Internal server error"});
     }
}

