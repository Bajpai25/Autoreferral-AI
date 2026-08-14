import {Request , Response} from "express";
import {prisma} from "../utils/constant"
import { combiner, jobscraper, linkedMessage } from "../utils/message";

const OPENROUTER_API_KEY=process.env.OPENROUTER_API_KEY;


interface ScrapedJob{
    jobId:string;
    title: string;
    jobUrl:string;
    companyName:string;
    role:string;
    location:string;
    experienceRequired:string;
    skills:string;
    qualifications:string;
    dateposted:string;
    jobdescription:string
}
interface CombinedData{  
  matchingSkills: "";
  missingSkills: "";
  fitScore: "";
  alignmentSummary: "";
  referralTalkingPoints: ""
}

export function parseAnalysis<T>(raw: string):T {
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
  } catch (error) {
    console.error("Raw AI Response:\n", raw);
    console.error("Parsing Error:", error);
    throw new Error("Invalid AI JSON response");
  }
}

export const scrapeJobs=async(req:Request , res:Response)=>{
      try{
        const {link , userId}=req.body;

        if(!link){
            return res.status(500).json({message:"The job link is empty"});
        }

        // check for valid user
        const userexists=await prisma.user.findUnique({
            where:{id:userId}
        })

        if(!userexists){
            return res.status(500).json({message:"The user doesn't exists"});
        }

        const response = await fetch(
              "https://openrouter.ai/api/v1/chat/completions",
              {
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
                      content: jobscraper
                    },
                    {
                      role: "user",
                      content: `Here is the job link which you have to scrape:\n\n${link}`
                    }
                  ],
                  temperature: 0.3
                })
              }
            );
         
         if (!response.ok) {
      const errorBody = await response.text();
      console.error("OpenRouter API error:", response.status, errorBody);
      throw new Error(`OpenRouter API returned status ${response.status}`);
    }
    const data=await response.json();
    const scrapedContent=data.choices?.[0]?.message?.content;
    console.log("This is the scraped job description" , scrapedContent);

    const parsed=parseAnalysis<ScrapedJob>(scrapedContent);
    const rawdata=parseAnalysis<any>(scrapedContent);
    // console.log(typeof(parsed));
    const jobdata=await prisma.job.create({
        data:{
            jobId:parsed.jobId,
            rawJobdata:rawdata,
            title:parsed.title,
            companyName:parsed.companyName,
            role:parsed.role,
            location:parsed.location,
            experienceRequired:parsed.experienceRequired,
            skills:parsed.skills,
            qualifications:parsed.qualifications,
            dateposted:parsed.dateposted,
            jobUrl:parsed.jobUrl,
            userId:userId,
            jobdescription:parsed.jobdescription
        }
    })

    if(!jobdata){
        return res.status(500).json({message:"Internal Sever Error"});
    }

    return res.status(200).json({message:"The job is saved" , success:true , data:jobdata});

            
      }
      catch(error){
         console.error("Generate Summary Error:", error);
    return res.status(500).json({
      message: "Internal server error"
    });
      }
}

export const combineData=async(req:Request , res:Response)=>{
    try{
     const {resumeId , jobId , userId}=req.body;

     if(!resumeId || !jobId || !userId){
        return res.status(400).json({message:"The resume/job/user ID is missing"});
     }

     const resumeData=await prisma.resume.findUnique({
        where:{id:resumeId}
     });
     const jobData=await prisma.job.findUnique({
        where:{id:jobId}
     });
     
     const response = await fetch(
              "https://openrouter.ai/api/v1/chat/completions",
              {
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
                      content: combiner
                    },
                    {
                      role: "user",
                      content: `Here is the structured job data (JSON) \n${jobData?.rawJobdata}\n`
                    },
                    {
                        role:"user",
                        content:`Here is the structured candidate Resume data (String) \n${resumeData?.content}\n`
                    }
                  ],
                  temperature: 0.3
                })
              }
            );

            if (!response.ok) {
      const errorBody = await response.text();
      console.error("OpenRouter API error:", response.status, errorBody);
      throw new Error(`OpenRouter API returned status ${response.status}`);
    }
     const data=await response.json();
     const combinedAiData=data.choices?.[0]?.message?.content;
     const cleardata=parseAnalysis<CombinedData>(combinedAiData);
     console.log(cleardata , "This is the clear data");
     if(!cleardata){
      console.log("this is getting error");
        return res.status(500).json({message:"Internal Server Error"});
     }

     const combinedData=await prisma.skillsMatcher.create({
        data:{
            userId:userId,
            matchingSkills:cleardata.matchingSkills,
            fitScore:cleardata.fitScore,
            alignmentSummary:cleardata.alignmentSummary,
            referralTalkingPoints :cleardata.referralTalkingPoints
        }
     })
     console.log(combinedData , "this is the combined data");

     if(!combinedData){
        return res.status(500).json({message:"The combined job was not saved"});
     }
     return res.status(200).json({success:true , message:"The combined job was stored successfully" , data:combinedData});

    }
    catch(error){
      console.log(error);
        return res.status(500).json({message:"Internal Server Error" , data:error});
    }
}

// now combine both the job , and the resume summary and now create a category wise linkedin message for the linkedIn connection 

export const linkedInMessage = async (req: Request, res: Response) => {
  try {
    const { userId, jobId, resumeId, skillsMatcherId, tone } = req.body;

    
    if (!userId || !jobId || !resumeId || !skillsMatcherId || !tone) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    
    const [user, job, resume, skillsMatcher] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.job.findUnique({ where: { id: jobId } }),
      prisma.resume.findUnique({ where: { id: resumeId } }),
      prisma.skillsMatcher.findUnique({ where: { id: skillsMatcherId } })
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
            content: linkedMessage
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
    const outreach = await prisma.outreach.create({
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

  } catch (error) {
    console.error("LinkedIn Message Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// extract the array of the jobs and the other data specific to the particular user

export const getJobs=async(req:Request , res:Response)=>{
     // get the list of the jobs and their data based on the userId being passed
     const {userId}=req.body;
     if(!userId){
      return res.status(404).json({
        success:false,
        message:"The UserId not found"
      })
     }
     try{
      // it can be array of the jobs/ single job 
      const jobData=await prisma.job.findMany({where:{userId:userId}});
      if(!jobData){
        return res.status(404).json({success:false,message:"This User doesn't have any Job assosciated with him"})
      }
      return res.status(200).json({success:true , data:jobData , message:"The Job data has been found"});
     }
     catch(err){
          return res.status(500).json({message:"Internal Server Error"});
     }
}



