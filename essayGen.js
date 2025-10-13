import dotenv from 'dotenv'
import {StateGraph,Annotation} from '@langchain/langgraph'
import {z} from 'zod'
import { ChatGroq } from "@langchain/groq";


dotenv.config();

const llm= new ChatGroq({
     model: "llama-3.3-70b-versatile",
     temperature:0.1
})

//Defining the output we require from the llm
const responseFormat=z.object({
    feedback:z.string().describe("Detailed feedback for the essay"),
    score:z.number().describe('Score out of 10')
})

//Using withStructuredOutput function on LLM
const structuredModel=llm.withStructuredOutput(responseFormat)


const essay="The Internet and Its Use\n\nThe internet has fundamentally transformed human civilization in just a few decades. What began as a military research project has evolved into an indispensable global network connecting billions of people, devices, and institutions.\n\nAt its core, the internet serves as a vast information highway. Students research topics for assignments, professionals access work resources remotely, and curious minds explore virtually any subject imaginable. Search engines have made knowledge democratically accessible in ways previous generations could never have imagined.\n\nCommunication represents another vital use of the internet. Email, video calls, and messaging apps have erased geographical boundaries, allowing families separated by oceans to maintain close relationships and businesses to collaborate across continents in real-time. Social media platforms enable people to share experiences, organize movements, and build communities around shared interests.\n\nThe internet has also revolutionized commerce and entertainment. Online shopping offers unprecedented convenience, while streaming services provide endless entertainment options. Remote work and digital entrepreneurship have created new economic opportunities and reshaped traditional employment models.\n\nHowever, internet use requires responsibility. Issues like misinformation, cyberbullying, privacy concerns, and digital addiction present ongoing challenges. Users must develop critical thinking skills to navigate online spaces safely and ethically.\n\nUltimately, the internet is a powerful tool whose value depends entirely on how we use it. When employed thoughtfully, it enhances education, fosters connection, and drives innovation—shaping a more informed and interconnected world."









//Defining the schema for the overall System


const stateSchema=z.object({
    essay:z.string(),
    language_feedback:z.number().optional(),
    analysis_feedback:z.number().optional(),
    clarity_feedback:z.number().optional(),
   overall_feedback:z.number().optional(),
    individual_score:z.array(z.number()).default([]),
   average_score:z.number().optional()



})


const state= Annotation.Root({
     essay:Annotation(),
    language_feedback:Annotation(),
    analysis_feedback:Annotation(),
    clarity_feedback:Annotation(),
    overall_feedback:Annotation(),
    individual_score:Annotation({
        reducer:(prev,next)=> [...(prev || []), ...(next || [])] //using reducer in Annotation so that the individual_score can be update ie[7,8,9] in a parallel fashion and values are accumulated and not replaced
    }),
    average_score:Annotation()
})

async function evaluateLanguage(state){
    try{
        const {essay}= state
        const prompt=`Evaluate the language quality of the following essay and provide a feedback and assign a score out of 10 ${essay}`
        const output= await structuredModel.invoke(prompt)

        return {'language_feedback':output.feedback,'individual_score':[output.score]}

    }catch(error){
        console.log(error)
    }
}

async function evaluateAnalysis(state){
    try{
        const {essay}= state
        const prompt=`Evaluate the  depth of analysis of the following essay and provide a feedback and assign a score out of 10 ${essay}`
        const output= await structuredModel.invoke(prompt)

        return {...state,'analysis_feedback':output.feedback,'individual_score':[output.score]}

    }catch(error){
        console.log(error)
    }
}

async function evaluateThought(state){
     try{
        const {essay}= state
        const prompt=`Evaluate the clarity of thought of the following essay and provide a feedback and assign a score out of 10 ${essay}`
        const output= await structuredModel.invoke(prompt)

        return {'clarity_feedback':output.feedback,'individual_score':[output.score]}

    }catch(error){
        console.log(error)
    }
}

async function evaluateFinal(state){
     try{
        const {essay,individual_score,language_feedback,clarity_feedback,analysis_feedback}= state
        const prompt=`Based on the following feedback create a summarized feedback . LanguageFeedback: ${language_feedback}, \n ClarityFeedback: ${clarity_feedback},\n AnalysisFeedback:${analysis_feedback}`
        const output= await llm.invoke(prompt)
        let temp=0
       individual_score.forEach(element => (
            temp+=element
       ));

       const averageScore=Math.ceil(temp/(individual_score.length))

        return {'overall_feedback':output.content,'average_score':averageScore}

    }catch(error){
        console.log(error)
    }
}

const graphBuilder= new StateGraph(state)
const graph= graphBuilder
        .addNode('evaluateLanguage',evaluateLanguage)
        .addNode('evaluateAnalysis',evaluateAnalysis)
         .addNode('evaluateThought',evaluateThought)
          .addNode('evaluateFinal',evaluateFinal)
            .addEdge('__start__','evaluateLanguage')
                .addEdge('__start__','evaluateAnalysis')
                    .addEdge('__start__','evaluateThought')
                    .addEdge('evaluateLanguage','evaluateFinal')
                    .addEdge('evaluateAnalysis','evaluateFinal')
                    .addEdge('evaluateThought','evaluateFinal')
                    .addEdge('evaluateFinal','__end__')



const workflow=  graph.compile()
const input= {essay:"The Internet and Its Use\n\nThe internet has fundamentaly transformed human civilisation in just a few decades. What began as a millitary research project has evolved into an indispensible global network connecting billions of peoples, devices, and institutions.\n\nAt it's core, the internet serves as a vast information highway. Students research topics for there assignments, professionals access work resources remotely, and curious minds explores virtually any subject imaginable. Search engines has made knowledge democratically accessible in ways previous generations could never of imagined.\n\nCommunication represents another vital use of the internet. Email, video calls, and messaging apps have erased geographical boundarys, allowing familys separated by oceans to maintain close relationships and businesses to collaborate across continents in real-time. Social media platforms enables people to share experiences, organize movements, and build communitys around shared intrests.\n\nThe internet has also revolutionized commerce and entertainment. Online shopping offers unprecendented convienence, while streaming services provides endless entertainment options. Remote work and digital entrepreneurship have created new economical opportunitys and reshaped traditional employment models.\n\nHowever, internet use requires responsability. Issues like misinformation, cyberbulling, privacy concerns, and digital addiction present ongoing challenges. Users must developed critical thinking skills to navigate online spaces safely and ethicaly.\n\nUltimatly, the internet is a powerful tool who's value depends entirely on how we use it. When employed thoughtfuly, it enhances education, foster connection, and drives inovation—shaping a more informed and interconnected world. The internet are very important for everyone in todays modern society and we should use it more better."}
const overall= await  workflow.invoke(stateSchema.parse(input))
console.log(overall)