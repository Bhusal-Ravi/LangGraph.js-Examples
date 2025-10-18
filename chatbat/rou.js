import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { chatbot } from "./timeTravel.js";

const router= express.Router()


router.post('/chat',async(req,res)=>{
    const {message,thread_id}=req.body
    
    try{
        const response=await chatbot(message,thread_id)
        console.log(response)
        res.status(200).json(response)
    }catch(error){
        console.log(error)
    }
})



export default router