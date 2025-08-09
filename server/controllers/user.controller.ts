import jwt from "jsonwebtoken";
import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

// Extend Express Request interface to include 'user'
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

const prisma = new PrismaClient();

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

        const token = jwt.sign({id:user.id},process.env.JWT_SECRET || "dvchvchjvcjhsvchjvscjh" ,{
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
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "dvchvchjvcjhsvchjvscjh");
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