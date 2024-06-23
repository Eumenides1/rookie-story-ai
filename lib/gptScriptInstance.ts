import { GPTScript } from "@gptscript-ai/gptscript";


export const g = new GPTScript({
    APIKey: process.env.OPENAI_API_KEY,
    BaseURL: process.env.BASE_URL,
})