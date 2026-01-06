import { GoogleGenerativeAI } from "https://esm.run/@google/generative-ai";

export const GeminiService = {
    apiKey: 'Your API Key',
    genAI: null,

    initialize(key) {
        const finalKey = key || this.apiKey || localStorage.getItem('gemini_api_key');

        if (finalKey) {
            this.apiKey = finalKey.trim();
            localStorage.setItem('gemini_api_key', this.apiKey);

            try {
                this.genAI = new GoogleGenerativeAI(this.apiKey);
            } catch (error) {
                console.error("Failed to initialize Gemini Client:", error);
                this.genAI = null;
            }
        }
    },

    setApiKey(key) {
        this.initialize(key);
    },

    getApiKey() {
        if (!this.apiKey) {
            this.apiKey = localStorage.getItem('gemini_api_key');
        }
        return this.apiKey;
    },

    async generateContent(prompt) {
        this.initialize();

        if (!this.genAI) {
            throw new Error('Gemini Client not initialized. Please check your API Key.');
        }

        const modelsToTry = [
            "gemini-2.5-flash",
            "gemini-2.5-flash-001",
        ];

        let lastError = null;

        for (const modelName of modelsToTry) {
            try {
                const model = this.genAI.getGenerativeModel({ model: modelName });
                const result = await model.generateContent(prompt);
                const response = await result.response;

                console.log(`%c Gemini Success! Using model: ${modelName}`, 'color: #00ff00; font-weight: bold;');
                return response.text();

            } catch (error) {
                lastError = error;
            }
        }

        throw new Error(`All models failed. Last error: ${lastError ? lastError.message : 'Unknown error'}`);
    },

    async summarize(text) {
        const prompt = `Please summarize the following note concisely in Markdown format:\n\n${text}`;
        return this.generateContent(prompt);
    }
};
