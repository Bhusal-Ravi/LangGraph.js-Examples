import { ChatGroq } from "@langchain/groq";
import { StateGraph, Annotation } from "@langchain/langgraph";
import {z} from 'zod'
import dotenv from 'dotenv'


const stateSchema=z.object({
    a:z.number(),
    b:z.number(),
    c:z.number(),

    equation:z.string().optional(),
    discriminator:z.number().optional(),
    result:z.string().optional()
})


const state=Annotation.Root({
    a:Annotation(),
    b:Annotation(),
    c:Annotation(),

    equation:Annotation(),
    discriminator:Annotation(),
    result:Annotation(),
})



const graphBuilder=new StateGraph(state)

function showEquation(state){
    const {a,b,c}=state
    const equation=`${a}x2${b}x${c}`
    return {equation:equation}
}

function calculateDiscriminant(state){
    const {a,b,c}=state
    const equation=(b**2) -(4*a*c)

    return {discriminator:equation}
}


function realRoots(state){
    const {a,b,c,discriminator}=state
    const root1= (-b + discriminator**0.5)/(2*a)
      const root2= (-b - discriminator**0.5)/(2*a)
      const result= `The Roots root1: ${root1} and root2: ${root2}`

      return {result:result}
}

function repeatedRoots(state){
    const root= -b /(2*a)

    return {result:`Repeated Roots:${root}`}
}

function noRealRoots(state){
    return {result:"No real root"}
}

function checkCondition(state){
    const {discriminator}=state

    if(discriminator>0){
        return 'realRoots'
    }else if(discriminator===0){
        return 'repeatedRoots'
    }else return 'noRealRoots'
}

const graph= graphBuilder
            .addNode('showEquation',showEquation)
            .addNode('calculateDiscriminant',calculateDiscriminant)
            .addNode('realRoots',realRoots)
            .addNode('repeatedRoots',repeatedRoots)
            .addNode('noRealRoots',noRealRoots)
            .addEdge('__start__','showEquation')
            .addEdge('showEquation','calculateDiscriminant')
            .addEdge('calculateDiscriminant','__end__')
            .addConditionalEdges('calculateDiscriminant',checkCondition)
            .addEdge('realRoots','__end__')
            .addEdge('repeatedRoots','__end__')
            .addEdge('noRealRoots','__end__')



const workFlow= graph.compile()

const output= await workFlow.invoke(stateSchema.parse({a:4,b:2,c:4}))
console.log(output)
