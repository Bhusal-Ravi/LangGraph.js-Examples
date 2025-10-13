import dotenv from 'dotenv'
import {StateGraph,Annotation} from '@langchain/langgraph'
import {z} from 'zod'
import { ChatGroq } from "@langchain/groq";


dotenv.config();

const stateSchema= z.object({
    runs:z.number(),
    balls:z.number(),
    fours:z.number(),
    sixes: z.number(),

    strikeRate:z.number().optional(),
    boundaryPercent:z.number().optional(),
    ballsPerBoundary:z.number().optional(),
    summary:z.string().optional(),


})

const state= Annotation.Root({
    runs:Annotation(),
    balls:Annotation(),
    fours:Annotation(),
    sixes: Annotation(),

    strikeRate:Annotation(),
    boundaryPercent:Annotation(),
    ballsPerBoundary:Annotation(),
    summary:Annotation()
})

const llm= new ChatGroq({
     model: "llama-3.3-70b-versatile",
})

function sr(state){
    const {runs,balls}=state

    const src= (runs/balls)*100

    
    return {'strikeRate':src}
}

function bpd(state){
    const {runs,balls,fours,sixes}=state

    const src= (balls/(fours+sixes))

   
    return {'ballsPerBoundary':src}
}


function b(state){
    const {runs,balls,fours,sixes}=state

    const src= ((fours*4 + sixes*6)/runs)*100

    
    return {'boundaryPercent':src}
}

function summaryGen(state){

    const {strikeRate,boundaryPercent,ballsPerBoundary}= state
   const  summary=`Strike Rate: ${strikeRate} \n 
             Balls per boundary: ${ballsPerBoundary} \n 
             BoundaryPercentage: ${boundaryPercent} `
                       

            state['summary']=summary

            return state
}



const graphBuilder= new StateGraph(state)

const graph=graphBuilder
    .addNode('sr',sr)
    .addNode('b%',b)
    .addNode('bpd',bpd)
    .addNode('summaryGen',summaryGen)
    .addEdge('__start__','sr')
    .addEdge('__start__','b%')
    .addEdge('__start__','bpd')
     .addEdge('sr','summaryGen')
    .addEdge('b%','summaryGen')
    .addEdge('bpd','summaryGen')
    .addEdge('summaryGen','__end__')


    const workFlow= graph.compile()
    const input={runs:100,balls:50 ,fours:6 , sixes:4} 
    const output= await workFlow.invoke(stateSchema.parse(input))
    console.log(output)
