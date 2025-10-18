import { ChatGroq } from "@langchain/groq";
import { StateGraph, Annotation } from "@langchain/langgraph";
import {z} from 'zod'
import dotenv from 'dotenv'
import { MemorySaver } from "@langchain/langgraph";
import { HumanMessage,AIMessage } from "@langchain/core/messages";
import { SqliteSaver } from "@langchain/langgraph-checkpoint-sqlite";
import Database from 'better-sqlite3';

dotenv.config();

const llm= new ChatGroq({
     model: "llama-3.3-70b-versatile",
     temperature:0.1
})

const db = new Database('db.sqlite', { verbose: console.log });

const state= Annotation.Root({
   
   messages:Annotation(
            {reducer:(prev,next)=>[...(prev || []),...(next || [])]}
   )
  
})

async function generateJoke(state){
    try{
        const {messages}= state
        const response= await llm.invoke(messages)
        return {messages:[new AIMessage(response.content)]}
    }catch(error){
        console.log(error)
    }
}   






const graphBuilder=new StateGraph(state)

const graph= graphBuilder
            .addNode('generateJoke',generateJoke)
            
            .addEdge('__start__','generateJoke')
          
            .addEdge('generateJoke','__end__')



const checkPointer= new  SqliteSaver(db)
const workflow= graph.compile({checkpointer:checkPointer})




export async function chatbot(question,thread_id){

    try{
        const config={"configurable": {"thread_id": thread_id}}
        const topic= {messages:[new HumanMessage(question)]}
 const output= await workflow.invoke(topic,config)

 
 return output.messages[output.messages.length-1].content
}catch(error){console.log(error)}
}