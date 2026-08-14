// check for authorised user
const url=import.meta.env.VITE_API_URL;

export const checkLogin=async()=>{
  const authToken=sessionStorage.getItem("authToken");
  try{
   const res=await fetch(`${url}authenticate`,{
    method: 'GET',
    headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
    }
   })

   const data=await res.json();
   if(res.ok){
      localStorage.setItem("userId" ,data?.data);
      localStorage.setItem("name",data?.name);
    return true;
   }
   else{
    return false;
   }
  }
  catch(e){
     return false;
  }
}

export const checkLogout=async()=>{
  const userId=localStorage.getItem("userId");
  if(!userId){
    sessionStorage.removeItem("authToken");
    localStorage.clear();
    window.location.reload();
    return ;
  }
  try{
  const response=await fetch(url+"logout",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({userId:userId})
  })

  if(response.ok){
    sessionStorage.removeItem("authToken");
    localStorage.clear();
    window.location.reload();
    return ;
  }
  }
  catch(err){
    console.log("Internal Server ")
    alert("There was an error while Logging Out");
    return ;
  }
}

