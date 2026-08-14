"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getJobs = exports.linkedInMessage = exports.combineData = exports.scrapeJobs = void 0;
exports.parseAnalysis = parseAnalysis;
const constant_1 = require("../utils/constant");
const message_1 = require("../utils/message");
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
function parseAnalysis(raw) {
    try {
        if (!raw || typeof raw !== "string") {
            throw new Error("Empty AI response");
        }
        // Remove markdown backticks
        let cleaned = raw.trim();
        if (cleaned.startsWith("```")) {
            cleaned = cleaned.replace(/```json/i, "")
                .replace(/```/g, "")
                .trim();
        }
        // Remove the invisible characters
        cleaned = cleaned.replace(/^\uFEFF/, "");
        const parsed = JSON.parse(cleaned);
        return parsed;
    }
    catch (error) {
        console.error("Raw AI Response:\n", raw);
        console.error("Parsing Error:", error);
        throw new Error("Invalid AI JSON response");
    }
}
const scrapeJobs = async (req, res) => {
    try {
        const { link, userId } = req.body;
        if (!link) {
            return res.status(500).json({ message: "The job link is empty" });
        }
        // check for valid user
        const userexists = await constant_1.prisma.user.findUnique({
            where: { id: userId }
        });
        if (!userexists) {
            return res.status(500).json({ message: "The user doesn't exists" });
        }
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${OPENROUTER_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "google/gemini-3.1-flash-lite-preview",
                max_tokens: 4096,
                messages: [
                    {
                        role: "system",
                        content: message_1.jobscraper
                    },
                    {
                        role: "user",
                        content: `Here is the job link which you have to scrape:\n\n${link}`
                    }
                ],
                temperature: 0.3
            })
        });
        if (!response.ok) {
            const errorBody = await response.text();
            console.error("OpenRouter API error:", response.status, errorBody);
            throw new Error(`OpenRouter API returned status ${response.status}`);
        }
        const data = await response.json();
        const scrapedContent = data.choices?.[0]?.message?.content;
        console.log("This is the scraped job description", scrapedContent);
        const parsed = parseAnalysis(scrapedContent);
        const rawdata = parseAnalysis(scrapedContent);
        // console.log(typeof(parsed));
        const jobdata = await constant_1.prisma.job.create({
            data: {
                jobId: parsed.jobId,
                rawJobdata: rawdata,
                title: parsed.title,
                companyName: parsed.companyName,
                role: parsed.role,
                location: parsed.location,
                experienceRequired: parsed.experienceRequired,
                skills: parsed.skills,
                qualifications: parsed.qualifications,
                dateposted: parsed.dateposted,
                jobUrl: parsed.jobUrl,
                userId: userId,
                jobdescription: parsed.jobdescription
            }
        });
        if (!jobdata) {
            return res.status(500).json({ message: "Internal Sever Error" });
        }
        return res.status(200).json({ message: "The job is saved", success: true, data: jobdata });
    }
    catch (error) {
        console.error("Generate Summary Error:", error);
        return res.status(500).json({
            message: "Internal server error"
        });
    }
};
exports.scrapeJobs = scrapeJobs;
const combineData = async (req, res) => {
    try {
        const { resumeId, jobId, userId } = req.body;
        if (!resumeId || !jobId || !userId) {
            return res.status(400).json({ message: "The resume/job/user ID is missing" });
        }
        const resumeData = await constant_1.prisma.resume.findUnique({
            where: { id: resumeId }
        });
        const jobData = await constant_1.prisma.job.findUnique({
            where: { id: jobId }
        });
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${OPENROUTER_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "google/gemini-3.1-flash-lite-preview",
                max_tokens: 4096,
                messages: [
                    {
                        role: "system",
                        content: message_1.combiner
                    },
                    {
                        role: "user",
                        content: `Here is the structured job data (JSON) \n${jobData?.rawJobdata}\n`
                    },
                    {
                        role: "user",
                        content: `Here is the structured candidate Resume data (String) \n${resumeData?.content}\n`
                    }
                ],
                temperature: 0.3
            })
        });
        if (!response.ok) {
            const errorBody = await response.text();
            console.error("OpenRouter API error:", response.status, errorBody);
            throw new Error(`OpenRouter API returned status ${response.status}`);
        }
        const data = await response.json();
        const combinedAiData = data.choices?.[0]?.message?.content;
        const cleardata = parseAnalysis(combinedAiData);
        console.log(cleardata, "This is the clear data");
        if (!cleardata) {
            console.log("this is getting error");
            return res.status(500).json({ message: "Internal Server Error" });
        }
        const combinedData = await constant_1.prisma.skillsMatcher.create({
            data: {
                userId: userId,
                matchingSkills: cleardata.matchingSkills,
                fitScore: cleardata.fitScore,
                alignmentSummary: cleardata.alignmentSummary,
                referralTalkingPoints: cleardata.referralTalkingPoints
            }
        });
        console.log(combinedData, "this is the combined data");
        if (!combinedData) {
            return res.status(500).json({ message: "The combined job was not saved" });
        }
        return res.status(200).json({ success: true, message: "The combined job was stored successfully", data: combinedData });
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal Server Error", data: error });
    }
};
exports.combineData = combineData;
// now combine both the job , and the resume summary and now create a category wise linkedin message for the linkedIn connection 
const linkedInMessage = async (req, res) => {
    try {
        const { userId, jobId, resumeId, skillsMatcherId, tone } = req.body;
        if (!userId || !jobId || !resumeId || !skillsMatcherId || !tone) {
            return res.status(400).json({ message: "Missing required fields" });
        }
        const [user, job, resume, skillsMatcher] = await Promise.all([
            constant_1.prisma.user.findUnique({ where: { id: userId } }),
            constant_1.prisma.job.findUnique({ where: { id: jobId } }),
            constant_1.prisma.resume.findUnique({ where: { id: resumeId } }),
            constant_1.prisma.skillsMatcher.findUnique({ where: { id: skillsMatcherId } })
        ]);
        if (!user || !job || !resume || !skillsMatcher) {
            return res.status(404).json({ message: "Required data not found" });
        }
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${OPENROUTER_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "google/gemini-3.1-flash-lite-preview",
                max_tokens: 4096,
                temperature: 0.4,
                messages: [
                    {
                        role: "system",
                        content: message_1.linkedMessage
                    },
                    {
                        role: "user",
                        content: `
Recruiter First Name: <FirstName>

Job Data:
Title: ${job.title}
Company: ${job.companyName}
Role: ${job.role}
Description: ${job.jobdescription}
Job ID: ${job.jobId}

Candidate Resume Summary:
${resume.summary}

Matching Analysis:
Matching Skills: ${skillsMatcher.matchingSkills}
Alignment Summary: ${skillsMatcher.alignmentSummary}

Tone: ${tone}

Candidate Name: ${user.name}
Candidate Email: ${user.email}
`
                    }
                ]
            })
        });
        if (!response.ok) {
            const errorBody = await response.text();
            console.error("OpenRouter error:", errorBody);
            return res.status(500).json({ message: "AI generation failed" });
        }
        const data = await response.json();
        const message = data.choices?.[0]?.message?.content?.trim();
        if (!message) {
            return res.status(500).json({ message: "Empty AI response" });
        }
        //  Save LinkedIn message in the database
        const outreach = await constant_1.prisma.outreach.create({
            data: {
                status: "generated",
                message,
                jobId: job.id,
                userId: user.id
            }
        });
        return res.status(200).json({
            success: true,
            message: "LinkedIn message generated successfully",
            data: outreach
        });
    }
    catch (error) {
        console.error("LinkedIn Message Error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};
exports.linkedInMessage = linkedInMessage;
// extract the array of the jobs and the other data specific to the particular user
const getJobs = async (req, res) => {
    // get the list of the jobs and their data based on the userId being passed
    const { userId } = req.body;
    if (!userId) {
        return res.status(404).json({
            success: false,
            message: "The UserId not found"
        });
    }
    try {
        // it can be array of the jobs/ single job 
        const jobData = await constant_1.prisma.job.findMany({ where: { userId: userId } });
        if (!jobData) {
            return res.status(404).json({ success: false, message: "This User doesn't have any Job assosciated with him" });
        }
        return res.status(200).json({ success: true, data: jobData, message: "The Job data has been found" });
    }
    catch (err) {
        return res.status(500).json({ message: "Internal Server Error" });
    }
};
exports.getJobs = getJobs;
