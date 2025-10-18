import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { chatbot } from "./timeTravel.js";
import chatRoute from './rou.js'


dotenv.config();

const router= express.Router()
const app=express()
app.use(
    cors({
        origin: ['http://localhost:3000'],
        methods: "GET,POST,PUT,DELETE",
        credentials: true,
        allowedHeaders: ['Content-Type', 'Authorization'],
       
    })
);
app.use(express.json()); 





app.use('/api',chatRoute)



const PORT = process.env.PORT || 5000

app.listen(PORT,()=>{
    console.log(`Server Running On Port ${PORT}`)
})