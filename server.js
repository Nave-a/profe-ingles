const express = require('express');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
app.use(express.json());

// --- Health check ---
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

// --- Ruta de prueba ---
app.get('/test', (req, res) => {
    res.json({ message: "Servidor funcionando correctamente" });
});

// --- Prompt del profesor Oliver ---
const PROMPT_PROFESOR = `Eres Oliver, un profesor de inglés británico, muy amigable y paciente. Tu misión es enseñar inglés conversacional.

Reglas:
1. Si el estudiante comete un error, primero dile algo positivo, luego da la frase correcta y explica brevemente el error en UNA frase.
2. Si acierta, muéstrate entusiasta y haz una nueva pregunta.
3. Usa expresiones británicas como "brilliant", "spot on", "well done".
4. Mantén tus respuestas muy cortas (máximo 2-3 frases).
5. Responde siempre en inglés.`;

// --- Configuración de Gemini con gemini-1.0-pro (el más compatible) ---
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
    console.error("ERROR: La variable de entorno GEMINI_API_KEY no está configurada.");
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
// Forzar el uso de la versión v1beta de la API
const model = genAI.getGenerativeModel({ 
    model: "gemini-1.0-pro",
    apiVersion: "v1beta"  // Esta es la clave
});

// --- Endpoint /chat ---
app.post('/chat', async (req, res) => {
    const { userMessage, conversationHistory } = req.body;
    
    if (!userMessage) {
        return res.status(400).json({ error: "Mensaje de usuario requerido" });
    }
    
    try {
        // Construir el prompt completo con historial
        let fullPrompt = PROMPT_PROFESOR + "\n\n";
        
        if (conversationHistory && conversationHistory.length > 0) {
            for (const msg of conversationHistory) {
                const role = msg.role === 'user' ? 'Estudiante' : 'Oliver';
                fullPrompt += `${role}: ${msg.content}\n`;
            }
        }
        
        fullPrompt += `Estudiante: ${userMessage}\nOliver:`;
        
        const result = await model.generateContent(fullPrompt);
        const reply = result.response.text();
        
        res.json({ reply: reply });
    } catch (error) {
        console.error("Error llamando a Gemini:", error.message);
        res.status(500).json({ 
            error: "Professor Oliver is having tea. Try again!",
            details: error.message 
        });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Professor Oliver with Gemini ready on port ${PORT}`);
    console.log(`Health check: /health`);
    console.log(`Test endpoint: /test`);
});