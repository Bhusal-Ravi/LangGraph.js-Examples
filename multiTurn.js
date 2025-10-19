import { ChatGroq } from "@langchain/groq";
import { StateGraph, Annotation, interrupt, Command } from "@langchain/langgraph";
import {z} from 'zod'
import dotenv from 'dotenv'
import { MemorySaver } from "@langchain/langgraph";
import { HumanMessage, AIMessage } from "@langchain/core/messages";
import { SqliteSaver } from "@langchain/langgraph-checkpoint-sqlite";
import Database from 'better-sqlite3';
import { TavilySearch } from "@langchain/tavily";
import { ToolNode } from "@langchain/langgraph/prebuilt";


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

const llmTools=llm.bindTools(tools)



// const db = new Database('hil.sqlite', { verbose: console.log });

const state= Annotation.Root({
   
   messages:Annotation({
    reducer:(prev,next)=>[...(prev||[]),...(next|| [])]
   }),
   humanResponse:Annotation()
  
})


async function A(state){
    const {messages}=state

    const response= await llmTools.invoke(messages)

   

    return {messages:[new AIMessage(response)]}

}





function check(state){
  const {messages}=state
  
  console.log(messages[messages.length-1]?.tool_calls)
 
  if(messages[messages.length-1]?.tool_calls.length>0)  return 'tools'
  else return '__end__'


}



const graphBuilder=new StateGraph(state)
const graph= graphBuilder
                .addNode('A', A)
              .addNode('tools',new ToolNode(tools) )
              
              .addEdge('__start__', 'A')
              .addConditionalEdges('A', check)
              .addEdge('tools','A')
              .addEdge('A','__end__')
              
            
                
                
                


 const config={"configurable": {"thread_id": '1'}}
const checkPointer= new  MemorySaver()
const workflow= graph.compile({checkpointer:checkPointer})

const output= await workflow.invoke({messages:[new HumanMessage('Who is the current primeminister of Nepal?')]},config)

console.log(output)

