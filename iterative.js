import { ChatGroq } from "@langchain/groq";
import { StateGraph, Annotation } from "@langchain/langgraph";
import {z} from 'zod'
import dotenv from 'dotenv'
import { SystemMessage,HumanMessage } from "@langchain/core/messages";
import { START,END } from "@langchain/langgraph";

dotenv.config()


const llm= new ChatGroq({
     model: "llama-3.3-70b-versatile",
     
})


const stateSchema= z.object({
   topic:z.string(),
    tweet:z.string().optional(),
    evaluation:z.enum(["approved","needsImprovement"]).optional(),
    feedback:z.string().optional(),
    iteration:z.number().optional(),
    maxIteration:z.number(),
    tweetHistory:z.array().optional()


})

const state= Annotation.Root({
    topic:Annotation(),
    tweet: Annotation(),
    evaluation:Annotation() ,
    feedback:Annotation() ,
   iteration:Annotation() ,
    maxIteration:Annotation() ,
    tweetHistory:Annotation({
        reducer:(prev,next)=>([...(prev||[]),...(next||[])])
    }),
    feedbackHistory:Annotation({
        reducer:(prev,next)=>([...(prev||[]),...(next||[])])
    })

})

async function generate(state){
   
    const {topic}=state

    try{
        const messages=[
           new SystemMessage(`
You are a witty and sarcastic content creator who writes viral-worthy Twitter (X) posts based on a given topic.

Your tone should always be funny, ironic, or built on mean logic — think of relatable humor, light cynicism, or everyday frustrations expressed cleverly.

Strict Rules:
1. No question–answer format.
2. Avoid being generic or repetitive.
3. Use natural, daily human language.
4. Be clever, punchy, and short (1–2 sentences, under 280 characters).
5. Include irony, sarcasm, or a relatable punchline that makes readers laugh or nod in agreement.
6. The tweet must be relevant to the given topic.
`)
,
   new HumanMessage(`Write a Twitter (X) post about ${topic}.`)


]

const response=await llm.invoke(messages)

return{tweet:response.content,tweetHistory:[response.content]}
    }catch(error){
        console.log(error)
    }
}

const evaluatorStructure= z.object({

    
    evaluation:z.enum(['approved','needsImprovement']).describe('Evaluation form the generated X/twitter post'),
    feedback:z.string().describe('One parahraph explaining the strength and weekness ')
})

const evaluationLlm= llm.withStructuredOutput(evaluatorStructure)



async function evaluate(state){
    const{topic,tweet}=state
        try{
    const messages= [
        new HumanMessage(`Evalute the tweet :[${tweet}] \n
                          which was generated for the topic: ${topic}      `),
       new SystemMessage(`
You are an expert evaluator of Twitter (X) posts. You judge whether a tweet meets strict humor, sarcasm, and originality standards.

Instructions:

1. Tone must be funny, sarcastic, ironic, or using mean logic/relatable humor.
2. Language must be casual, natural, human, and readable.
3. Format must NOT be question-answer.
4. Length must be short and punchy (1-2 sentences, under 280 characters).
5. The punchline must include irony, clever twist, or relatable humor.
6. Avoid generic, repetitive, or cliché jokes.
7. Tweet must be relevant to the topic.

**Scoring / Evaluation:**
- For each criterion (Tone, Language, Format, Punchline, Originality, Relevance):
  
  - Give one line reasoning
- Only mark 'approved' if **all criteria are upto point and the tweet is creative and funny.
- If any criterion is below eligible, mark 'needsImprovement' and clearly explain which part fails and why, citing examples from the tweet.

Output Format:
Always respond in structured format:
- evaluation: "approved" or "needsImprovement"
- feedback: A paragraph explaining the tweet's strengths and weaknesses.
`)

    ]

    const response= await evaluationLlm.invoke(messages)

    return {evaluation:response.evaluation,feedback:response.feedback,feedbackHistory:[response.feedback]}

}catch(error){
    console.log(error)
}
}


async function optimize(state){
    const {tweet,feedback,topic,iteration}=state
    try{

        const messages=[
            new HumanMessage(`Optimize the tweet: [${tweet}] \n
                              that was generated on the topic: [${topic}] \n
                              based on the feedback: [${feedback}]
                              rewrite it as short, viral worthy tweet. Abvoid Q &A style and stay under 280 characters `),

            new SystemMessage(`
You are an optimizer that rewrites and improves Twitter (X) posts for maximum humor, clarity, and virality.

Your task is to take a tweet and its feedback, then produce an improved version that keeps the humor intact but sharpens its tone and delivery.

Strict Rules:
1. No question–answer format, ever.
2. Avoid generic or predictable jokes — always aim for originality.
3. Keep it funny, sarcastic, ironic, or built on mean logic and relatable frustration.
4. Use natural, everyday human language — like a real person ranting or making a clever remark.
5. Keep it short, punchy, and scroll-stopping (1–2 sentences, under 280 characters).
6. Keep the original theme or intent but make it wittier, smoother, and more shareable.
7. The final tweet must be clever, natural, and relevant to the topic.


`)
,

        ]

        const response= await llm.invoke(messages)
        const num= iteration + 1

        return {tweet:response.content,iteration:num,tweetHistory:[response.content]}

    }catch(error){

    }
}

function tweetFeedback(state){
    const {evaluation,iteration,maxIteration}=state
    if(evaluation==='approved' || iteration>=maxIteration) {
        return 'approved'
    }
    else return 'needsImprovement'
}



const graphBuilder= new StateGraph(state)

const graph= graphBuilder
            .addNode('generate',generate)
            .addNode('evaluate',evaluate)
            .addNode('optimize',optimize)
            .addEdge('__start__','generate')
            .addEdge('generate','evaluate')
            .addConditionalEdges('evaluate',tweetFeedback,{'approved':'__end__','needsImprovement':'optimize'})
            .addEdge('optimize','evaluate')


const workFlow= graph.compile()
const input= {iteration:1,maxIteration:10,topic:'IkkuIkku and its properties'}

const output= await workFlow.invoke(stateSchema.parse(input))

console.log(output)
