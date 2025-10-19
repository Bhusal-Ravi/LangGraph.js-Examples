import { ChatGroq } from "@langchain/groq";
import { StateGraph, Annotation, interrupt, Command } from "@langchain/langgraph";
import {z} from 'zod'
import dotenv from 'dotenv'
import { MemorySaver } from "@langchain/langgraph";
import { HumanMessage,AIMessage } from "@langchain/core/messages";
import { SqliteSaver } from "@langchain/langgraph-checkpoint-sqlite";
import Database from 'better-sqlite3';
import { TavilySearch } from "@langchain/tavily";


dotenv.config();



const tool = new TavilySearch({
  maxResults: 5,
  topic: "general",
 
});

const tools=[tool]

const llm= new ChatGroq({
     model: "llama-3.3-70b-versatile",
     temperature:0.1
})

const llmTools=llm.bindTools(tools=tools)



// const db = new Database('hil.sqlite', { verbose: console.log });

const state= Annotation.Root({
   
   message:Annotation({
    reducer:(prev,next)=>[...(prev||[]),...(next|| [])]
   }),
   humanResponse:Annotation()
  
})


function A(state){
    const {message}=state
    console.log('a hit')

    return {message:message+ 'a' }

}

function B(state){
    const {message}=state
      console.log('b hit')

       const humanResponse= interrupt("Do you want to goto C OR D");

       return {message:message+'b', humanResponse:humanResponse}
      

}



function check(state){
  const {humanResponse}=state

  if(humanResponse.toLowerCase()=='c'){
    return 'C'
  }else return 'D'

}



const graphBuilder=new StateGraph(state)
const graph= graphBuilder
               .addNode('A', A)
              .addNode('B', B)
              
              .addEdge('__start__', 'A')
              .addEdge('A', 'B')
              .addConditionalEdges('B',check)
              
            
                
                
                


 const config={"configurable": {"thread_id": '1'}}
const checkPointer= new  MemorySaver()
const workflow= graph.compile({checkpointer:checkPointer})

const output= await workflow.invoke({message:''},config)
console.log(output)


const second= await workflow.invoke(new Command({resume:'c'}),config)

console.log(second)