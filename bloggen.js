import dotenv from 'dotenv'
import {StateGraph,Annotation} from '@langchain/langgraph'
import {z} from 'zod'
import { ChatGroq } from "@langchain/groq";

dotenv.config()

const llm= new ChatGroq({
     model: "llama-3.3-70b-versatile",
})

const stateSchema= z.object({
    prompt:z.string(),
    outline:z.string().optional(),
    content:z.string().optional(),
    review:z.string().optional(),

})

const state= Annotation.Root({
     prompt:Annotation(),
    outline:Annotation(),
    content:Annotation(),
    review:Annotation(),
})




async function outlineGen(state){
    try{
        const prompt=state['prompt']
        const message=[
            {role:'user',content:`Generate a outline for the given topic:${prompt}`},
            {role:'system',content:`You are a part of a agentic system that writes Blog. You are responsible for providing a detailed outline for the given topic from the user. The outline should contain various related structure for the given topic. The outline that you provide will be later used by another agent to write a detailed blog `}
        ]
        const response= await llm.invoke(message)

        state['outline']=response.content;

        return state


    }catch(error){
        console.log(error)
    }
}


async function contentGen(state){
    try{
        const{prompt,outline}=state
        
        const message=[
            {role:'user',content:`Generate a blog for the given topic ${prompt} using this specific outline:${outline}`},
            {role:'system',content:`You are responsible for writing a detailed blog post on the topic provided by the user, following the outline that has already been given. The blog should be well-structured, informative, and aligned with the points in the outline. `}
        ]
        const response= await llm.invoke(message)

        state['content']=response.content;

        return state


    }catch(error){
        console.log(error)
    }
}


async function reviewGen(state){
    try{
        const {prompt,outline,content}=state
        const message=[
            {role:'user',content:`Generate a review for the blog ${content} ,that is written based on the users query:${prompt}, By using the outline that was provided:${outline}`},
            {role:'system',content:`You are responsible for reviewing the blog written based on the topic provided by the user, the outline generated for that topic, and the blog content created using that outline. The review should ensure accuracy, clarity, and alignment with the outline. The review should be short and consise and includes points only . You should also provide a rating [x/5] outof 5 `}
        ]
        const response= await llm.invoke(message)

        state['review']=response.content;

        return state


    }catch(error){
        console.log(error)
    }
}




const graphBuilder=new StateGraph(state)

const graph= graphBuilder
        .addNode('outlineGen',outlineGen)
        .addNode('contentGen',contentGen)
        .addNode('reviewGen',reviewGen)
        .addEdge('__start__','outlineGen')
        .addEdge('outlineGen','contentGen')
        .addEdge('contentGen','reviewGen')
        .addEdge('reviewGen','__end__')



const input={prompt:"Write a blog on the Topic [`Nepal and it's advantegas over the world `] "}

const workflow= graph.compile()

const output=await  workflow.invoke(stateSchema.parse(input))

console.log(output)

