import { StateGraph, Annotation } from "@langchain/langgraph";
import {z} from 'zod'

const BmiSchema= z.object({
     weight_kg: z.number().positive() ,
    height_m: z.number().positive(),
    category:z.string().optional(),
    bmi: z.number().optional(),
})


const BmiState= Annotation.Root({
    weight_kg: Annotation(),
    height_m: Annotation(),
    category:Annotation(),
    bmi: Annotation(),
})

function calculate_bmi(state){
    const weight=state['weight_kg']
    const height= state['height_m']
    const bmi= weight/(height*height)

    state['bmi']= Math.floor(bmi,2)
    return state
}

function label_bmi(state){
    const bmi= state['bmi'];
    

    if(bmi<18.5) {state['category']='UnderWeight'}
    else if(18.5<=bmi<25) {state['category']='Normal'}
    else if(25<=bmi<35){state['category']='OverWeight'}
    else { state['category']='Obese'}


    return state


}

const graphBuilder= new StateGraph(BmiState);

const graph=graphBuilder
    .addNode('calculate_bmi',calculate_bmi)
    .addNode('label_bmi',label_bmi)
    .addEdge('__start__','calculate_bmi')
    .addEdge('calculate_bmi','label_bmi')
    .addEdge('label_bmi','__end__')

const input={weight_kg: 80, height_m: 1.73}

const workFlow= graph.compile()

const output= await workFlow.invoke(BmiSchema.parse(input))

console.log(output)