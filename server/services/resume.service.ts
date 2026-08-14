import {prisma} from "../utils/constant"
import { Request, Response } from "express";
import { PdfReader } from "pdfreader";
import { resumeSummariser } from "../utils/message";

interface ResumeAnalysis {
  candidateName: string;
  yearsOfExperience: string;
  primaryTechStack: string[];
  otherSkills: string[];
  notableProjects: string[];
  currentRole: string;
  resumeSummary: string;
}



export function parseResumeAnalysis(raw: string): ResumeAnalysis {
  try {
    if (!raw || typeof raw !== "string") {
      throw new Error("Empty AI response");
    }

    // Remove markdown code block wrappers if present
    let cleaned = raw.trim();

    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/```json/i, "")
                       .replace(/```/g, "")
                       .trim();
    }

    // Sometimes AI adds weird invisible characters
    cleaned = cleaned.replace(/^\uFEFF/, "");

    const parsed: ResumeAnalysis = JSON.parse(cleaned);

    return parsed;
  } catch (error) {
    console.error("Raw AI Response:\n", raw);
    console.error("Parsing Error:", error);
    throw new Error("Invalid AI JSON response");
  }
}


const OPENROUTER_API_KEY=process.env.OPENROUTER_API_KEY;

export const processResume = async (req: Request, res: Response) => {
  try {
    const file = req.file;
    const { userId } = req.body;

    if (!file) {
      return res.status(400).json({ message: "File not uploaded" });
    }

    if (!userId) {
      return res.status(400).json({ message: "userId is required" });
    }

    // --------------------------------------------------
    // 1 Check if resume already exists
    // --------------------------------------------------

    const existingResume = await prisma.resume.findUnique({
      where: { fileName: file.originalname }
    });

    let resumeRecord;

    // --------------------------------------------------
    // 2 If exists skip extraction
    // --------------------------------------------------

    if (existingResume) {
      resumeRecord = existingResume;
    } else {

      // --------------------------------------------------
      // 3 Extract text from PDF
      // --------------------------------------------------

      const textContent = await new Promise<string>((resolve, reject) => {
        let rows: { [key: number]: string[] } = {};

        new PdfReader().parseBuffer(file.buffer, (err, item) => {
          if (err) reject(err);
          else if (!item) {
            const finalString = Object.keys(rows)
              .sort((a, b) => Number(a) - Number(b))
              .map((r) => rows[Number(r)].join(" "))
              .join("\n");

            resolve(finalString);
          } else if (item.text) {
            (rows[item.y] = rows[item.y] || []).push(item.text);
          }
        });
      });

      const cleanedText = textContent
        .replace(/\n+/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      // --------------------------------------------------
      // 4 Save resume
      // --------------------------------------------------

      resumeRecord = await prisma.resume.create({
        data: {
          content: cleanedText,
          userId,
          fileName: file.originalname
        }
      });
    }

    // --------------------------------------------------
    // 5 Generate AI Summary
    // --------------------------------------------------

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
              content: resumeSummariser
            },
            {
              role: "user",
              content: `Here is the raw resume text:\n\n${resumeRecord.content}`
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

    const data = await response.json();

    const aiContent = data.choices?.[0]?.message?.content;

    const parsed = parseResumeAnalysis(aiContent);

    // --------------------------------------------------
    // 6 Update summary
    // --------------------------------------------------

    const updatedResume = await prisma.resume.update({
      where: { id: resumeRecord.id },
      data: {
        summary: parsed.resumeSummary
      }
    });

    // --------------------------------------------------
    // 7 Final Response
    // --------------------------------------------------

    return res.status(200).json({
      success: true,
      message: "Resume processed successfully",
      resumeId: updatedResume.id,
      summary: updatedResume.summary
    });

  } catch (error) {
    console.error("Resume Processing Error:", error);

    return res.status(500).json({
      success: false,
      message: "Error processing resume"
    });
  }
};

// export const extractText = async (req: Request, res: Response) => {
//     try {
//         const file = req.file;

//         if (!file) {
//             return res.status(400).json({ message: "File not uploaded" });
//         }

//         // 1. Check if this file has already been processed
//         const existingResume = await prisma.resume.findUnique({
//             where: { fileName: file.originalname }
//         });

//         // 2. If it exists, return the DB content immediately and STOP
//         if (existingResume) {
//             return res.status(200).json({
//                 success: true,
//                 message: "Resume found in database, skipping extraction.",
//                 data: existingResume
//             });
//         }

//         // 3. If it doesn't exist, proceed to extract text (The "Heavy" Part)
//         const textContent = await new Promise<string>((resolve, reject) => {
//             let rows: { [key: number]: string[] } = {};
//             new PdfReader().parseBuffer(file.buffer, (err, item) => {
//                 if (err) reject(err);
//                 else if (!item) {
//                     const finalString = Object.keys(rows)
//                         .sort((a, b) => Number(a) - Number(b))
//                         .map(r => rows[Number(r)].join(" "))
//                         .join("\n");
//                     resolve(finalString);
//                 } else if (item.text) {
//                     (rows[item.y] = rows[item.y] || []).push(item.text);
//                 }
//             });
//         });

//         const cleanedText = textContent.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();

//         // 4. Save the newly extracted data to the DB
//         // NOTE: Make sure req.user contains the ID (depends on your auth middleware)
//         const newResume = await prisma.resume.create({
//             data: {
//                 content: cleanedText,
//                 userId: req.body.userId, 
//                 fileName: file.originalname
//             }
//         });

//         return res.status(201).json({
//             success: true,
//             message: "New resume processed and saved.",
//             data: newResume
//         });

//     } catch (error) {
//         console.error("Extraction Error:", error);
//         return res.status(500).json({
//             success: false,
//             message: "Error in processing PDF content"
//         });
//     }
// };

// export const generateSummary = async (req: Request, res: Response) => {
//   try {
//     const { resumeId } = req.body;

//     if (!resumeId) {
//       return res.status(400).json({ message: "resumeId is required" });
//     }

//     const rawData = await prisma.resume.findUnique({
//       where: { id: resumeId }
//     });

//     if (!rawData) {
//       return res.status(404).json({ message: "Resume not found" });
//     }

//     const response = await fetch(
//       "https://openrouter.ai/api/v1/chat/completions",
//       {
//         method: "POST",
//         headers: {
//           Authorization: `Bearer ${OPENROUTER_API_KEY}`,
//           "Content-Type": "application/json"
//         },
//         body: JSON.stringify({
//           model: "google/gemini-3.1-flash-lite-preview",
//           messages: [
//             {
//               role: "system",
//               content: resumeSummariser
//             },
//             {
//               role: "user",
//               content: `Here is the raw resume text:\n\n${rawData.content}`
//             }
//           ],
//           temperature: 0.3
//         })
//       }
//     );

//     if (!response.ok) {
//       const errorBody = await response.text();
//       console.error("OpenRouter API error:", response.status, errorBody);
//       throw new Error(`OpenRouter API returned status ${response.status}`);
//     }

//     const data = await response.json();

//     const aiContent = data.choices?.[0]?.message?.content;
//     console.log(aiContent)

//     const parsed = parseResumeAnalysis(aiContent);

//     const updatedResume = await prisma.resume.update({
//       where: { id: resumeId },
//       data: {
//         summary: parsed.resumeSummary
//       }
//     });

//     return res.status(200).json({
//       message: "Summary generated successfully",
//       summary: updatedResume.summary
//     });

//   } catch (error) {
//     console.error("Generate Summary Error:", error);
//     return res.status(500).json({
//       message: "Internal server error"
//     });
//   }
// };


