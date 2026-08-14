const url=import.meta.env.VITE_API_URL;
const jobUrl=url+'jobs/';
const resumeUrl=url+'resume/';
const outreachUrl=url+'outreach/';

// api calls for various steps starting from

// this is the 
export async function scrapeJobData(userId:String , JobLink:String){
    // get userId and the JobLink to scrape the daya from it
   try{
    const response=await fetch(jobUrl+'scrape',{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
            userId:userId,
            link:JobLink
        })
    })
    const data=await response.json();
    console.log(data)
    if(!response.ok){
        return alert("Something went wrong");
    }
    
    localStorage.setItem("jobId",data?.data?.id);
   }
   catch(e){
      return alert(`Internal Server Error: ${e}`);
   }
      
}


export async function extractResumeData(file: File) {
  try {
    const formData = new FormData();
    const userId=localStorage.getItem("userId")|| "";
    formData.append("file", file);
    formData.append("userId",userId);
    

    const response = await fetch(resumeUrl + "upload", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();
    console.log(data , "Resume data");

    if (!response.ok) {
      throw new Error(data?.message || "Resume upload failed");
    }

    localStorage.setItem("resumeId", data?.resumeId);
    return data;
  } catch (e: any) {
    throw new Error(e.message);
  }
}


export async function combineJobandResume(){
      // here send the jobId , resumeId , userId
      try{
  const response=await fetch(jobUrl+"combine",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({
         resumeId:localStorage.getItem("resumeId"),
         jobId:localStorage.getItem("jobId"),
         userId:localStorage.getItem("userId")
    })

  })
  const data=await response.json();

  if(!response.ok){
    alert("There was some error while combining the resources");
    return ;
  }
  localStorage.setItem("combineId", data?.data?.id);
      }
      catch(e){
           alert("Internal Server Error")
          return  ;
      }
}

export async function getFinalMessage(messageTone:String){
    try{
    const response=await fetch(jobUrl+"generate",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
            userId:localStorage.getItem("userId"),
            jobId:localStorage.getItem("jobId"),
            resumeId:localStorage.getItem("resumeId"),
            skillsMatcherId:localStorage.getItem("combineId"),
            tone:messageTone
        })
    })
    const data=await response.json();
    console.log(data , "the message is generated");
    localStorage.setItem("messageId",data?.data?.id);
    
    if(!response.ok){
        alert("There was an error in generating this referral message");
        return ;
    }
     return data?.data?.message;
    }
    catch(e){
    alert("Internal Server Error");
     return ;
    }
}

// run the automation for sending the referral linkedIn messages

export async function sendReferral(){
    try{
    const response=await fetch(outreachUrl+"send-referral",{
        method:"POST",
        headers:{'Authorization': `Bearer ${sessionStorage.getItem("authToken")}`,
      'Content-Type':'application/json'
    },
    body:JSON.stringify({
companyName:localStorage.getItem("companyName"),
messageId:localStorage.getItem("messageId"),
messageTemplate:localStorage.getItem("message")
    })

    })
    const data=await response.json();
    console.log(data);
    if(data?.data?.failedCount==1 && data?.data?.sentCount==0){
      alert("You don't have any connections yet , please redirect to workflow page to build connections.");
      localStorage.removeItem("messageId");
      localStorage.removeItem("message");
      localStorage.removeItem("jobId");
      localStorage.removeItem("resumeId");
      localStorage.removeItem("combineId");
      localStorage.removeItem("companyName");
      window.location.replace("/workflow-builder");
    }
    if(!response.ok){
         alert("Error while processing the data");
         localStorage.removeItem("messageId");
      localStorage.removeItem("message");
      localStorage.removeItem("jobId");
      localStorage.removeItem("resumeId");
      localStorage.removeItem("combineId");
      localStorage.removeItem("companyName");
         return ;
    }
    }
    catch(e){
       alert("Internal Server Error");
       return ;
    }
}

export async function getJobs(userId:string){
  try{
 const response=await fetch(jobUrl+"getJobs",{
  method:"POST",
  headers:{"Content-Type":"application/json"},
  body:JSON.stringify({
    userId:userId
  })
 })
 const data=await response.json();

 if(!response.ok){
  alert("There was an error in fetching the jobs");
  return ;
 }
 return data?.data;
  }
  catch(err){
     alert("Internal Server Error");
     return ;
  }
}

export async function getOutreach(userId:string){
  try{
 const response=await fetch(outreachUrl+"getOutreach",{
  method:"POST",
  headers:{"Content-Type":"application/json"},
  body:JSON.stringify({
    userId:userId
  })
 })
 const data=await response.json();

 if(!response.ok){
  alert("There was an error in fetching the outreach");
  return ;
 }
 return data?.outreach || data?.data;
  }
  catch(err){
     alert("Internal Server Error");
     return ;
  }
}

// ─── Workflow API ───

const workflowUrl = url + 'workflows/';

function getAuthHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${sessionStorage.getItem("authToken")}`,
  };
}

export async function createAndTriggerWorkflow(payload: {
  name: string;
  targetCompany: string;
  cronExpression: string;
  maxConnections: number;
  connectionNote?: string;
  nodesJson?: any;
  edgesJson?: any;
}): Promise<any> {
  // 1. Create the workflow on the backend (registers cron job)
  const createRes = await fetch(workflowUrl, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  const createData = await createRes.json();
  if (!createRes.ok) {
    throw new Error(createData?.message || "Failed to create workflow");
  }

  const workflowId = createData?.data?.id;

  // 2. Trigger immediate execution
  const triggerRes = await fetch(workflowUrl + workflowId + '/trigger', {
    method: "POST",
    headers: getAuthHeaders(),
  });

  if (!triggerRes.ok) {
    console.warn("Workflow created but trigger failed — will run on cron schedule");
  }

  return createData?.data;
}

export async function getUserWorkflows(): Promise<any[]> {
  const res = await fetch(workflowUrl, {
    method: "GET",
    headers: getAuthHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || "Failed to fetch workflows");
  return data?.data || [];
}

export async function triggerWorkflowById(workflowId: string): Promise<void> {
  const res = await fetch(workflowUrl + workflowId + '/trigger', {
    method: "POST",
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data?.message || "Failed to trigger workflow");
  }
}

export async function deleteWorkflowById(workflowId: string): Promise<void> {
  const res = await fetch(workflowUrl + workflowId, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data?.message || "Failed to delete workflow");
  }
}
