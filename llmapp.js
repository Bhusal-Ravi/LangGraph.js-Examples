import { ChatGroq } from "@langchain/groq";
import { StateGraph, Annotation } from "@langchain/langgraph";
import {z} from 'zod'
import dotenv from 'dotenv'

dotenv.config()
const llm= new ChatGroq({
     model: "llama-3.3-70b-versatile",
})

const stateSchema= z.object({
    question:z.string(),
    answer:z.string().optional()
})

const state=Annotation.Root({
    question:Annotation,
    answer:Annotation
})

async function llmqa(state){
    try{
        const question=state['question']

        const response=await llm.invoke(question)

        state['answer']=response.content;
        
        return state

    }catch(error){

    }
}



const graphBuilder= new StateGraph(state)

const graph= graphBuilder
.addNode("llmqa",llmqa)
.addEdge('__start__','llmqa')
.addEdge('llmqa','__end__')


const workflow= graph.compile()

const input={question:"Who is the primeMinister of nepal"}
const output= await workflow.invoke(stateSchema.parse(input))
console.log(output)




