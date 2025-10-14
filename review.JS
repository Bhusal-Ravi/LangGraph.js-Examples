import { ChatGroq } from "@langchain/groq";
import { StateGraph, Annotation } from "@langchain/langgraph";
import {z} from 'zod'
import dotenv from 'dotenv'

dotenv.config();

const llm= new ChatGroq({
     model: "llama-3.3-70b-versatile",
     temperature:0.1
})


const sentimentStructure=z.object({
    sentiment:z.enum(["positive","negative"]).describe('positive or negative sentiment of the review')
})

const structuredSentimentLlm=llm.withStructuredOutput(sentimentStructure)




const stateSchema=z.object({
    review:z.string(),
    sentiment:z.enum(['positive','negative']).optional(),
   
    issueType:z.string().optional(),
    tone:z.string().optional(),
    urgency:z.string().optional(),
    response:z.string().optional()
})

const state= Annotation.Root({
     review:Annotation(),
    sentiment:Annotation(),
    
    issueType:Annotation(),
     tone:Annotation(),
     urgency:Annotation(),
    response:Annotation()
})

async function findSentiment(state){
    const {review}=state
    try{
       const  prompt=`For the following review find out the sentiment \n ${review}`
        const output=await structuredSentimentLlm.invoke(prompt)

        return {...state,sentiment:output.sentiment}
    }catch(error){
        console.log(error)
    }
}

function conditionalSentiment(state){
    const {sentiment}=state
    if(sentiment==='positive'){
        return 'positiveResponse'
    } else return 'runDiagnosis'
}

const diagnosisSchema= z.object({
    issueType:z.string().describe('What kind of issue is the review pointing towards ie. "Software","Hardware","Ui","Human" etc'),
    tone:z.string().describe('Tone of the review'),
    urgency:z.string().describe('The urgency that is shown in the review')
})

const diagnosisllm= llm.withStructuredOutput(diagnosisSchema)

async function runDiagnosis(state){
    try{
    const {review,sentiment}=state
    
    const prompt=`Evaluate this review: ${review} \n
                  based on the review provide the issueType,tone and the urgency of the review      `

    const output= await diagnosisllm.invoke(prompt)
    
     const { issueType, tone, urgency } = output;
    return {issueType:issueType,tone:tone,urgency:urgency}
    }catch(error){
        console.log(error)
    }
}

async function positiveResponse(state){
    try{
    const {review,sentiment}=state
    
    const prompt=`Write a short thankyou message beased on the review:${review},Do not add any other information , just provide only the required review `

    const output= await llm.invoke(prompt)

    return {response:output.content}
    
    }catch(error){
        console.log(error)
    }
}

async function negativeResponse(state){
    try{
    const {review,sentiment,issueType, tone, urgency}=state
    
    const prompt=`You are given a negative review: ${review}\n which had issueType: ${issueType} with a tone: ${tone} and a urgency: ${urgency}, write a response to the review based on the provided parameter. Do not add any other information , just provide only the required review `

    const output= await llm.invoke(prompt)

    return {response:output.content}
  
    }catch(error){
        console.log(error)
    }
}



const graphBuilder= new StateGraph(state)
const graph= graphBuilder
        .addNode('findSentiment',findSentiment)
        .addNode('runDiagnosis',runDiagnosis)
         .addNode('negativeResponse',negativeResponse)
         .addNode('positiveResponse',positiveResponse)
        .addEdge('__start__','findSentiment')
        .addConditionalEdges('findSentiment',conditionalSentiment)
        .addEdge('runDiagnosis','negativeResponse')
        .addEdge('positiveResponse','__end__')
        .addEdge('negativeResponse','__end__')

        



        const workflow= graph.compile()
        const output= await workflow.invoke({review:"I absolutely love this product! The user interface is intuitive and beautiful. Customer support responded to my question within an hour and solved my problem immediately. The features are exactly what I needed and the performance is lightning fast. Highly recommend to anyone looking for a reliable solution. Worth every penny!"})

        console.log(output)
