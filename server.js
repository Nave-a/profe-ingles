const express = require('express');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
app.use(express.json());

// --- Health check (siempre responde) ---
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

// --- Configuración de Gemini (con manejo de errores) ---
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Función para obtener respuesta de Gemini (con fallback)
async function getGeminiResponse(userMessage, history) {
    if (!GEMINI_API_KEY) {
        return "I need my API key to work! Please check the configuration.";
    }
    
    try {
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        
        let fullPrompt = PROMPT_PROFESOR + "\n\n";
        
        if (history && history.length > 0) {
            for (const msg of history) {
                const role = msg.role === 'user' ? 'Estudiante' : 'Oliver';
                fullPrompt += `${role}: ${msg.content}\n`;
            }
        }
        
        fullPrompt += `Estudiante: ${userMessage}\nOliver:`;
        
        const result = await model.generateContent(fullPrompt);
        return result.response.text();
    } catch (error) {
        console.error("Error específico de Gemini:", error.message);
        // Devolver un mensaje amigable en lugar de fallar
        return "I'm having technical difficulties connecting to my AI brain. Please try again in a moment! - Professor Oliver";
    }
}

// --- Endpoint /chat (nunca falla, siempre responde) ---
app.post('/chat', async (req, res) => {
    const { userMessage, conversationHistory } = req.body;
    
    if (!userMessage) {
        return res.status(400).json({ error: "Mensaje de usuario requerido" });
    }
    
    try {
        const reply = await getGeminiResponse(userMessage, conversationHistory);
        res.json({ reply: reply });
    } catch (error) {
        // Esto nunca debería ejecutarse, pero por si acaso
        console.error("Error catastrófico:", error);
        res.json({ reply: "Professor Oliver is taking a short break. Try again! - Oliver" });
    }
});

// Manejar errores no capturados (evita que el servidor se caiga)
process.on('uncaughtException', (error) => {
    console.error('Error no capturado:', error);
    // No salimos del proceso
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Promesa rechazada no manejada:', reason);
    // No salimos del proceso
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Professor Oliver with Gemini ready on port ${PORT}`);
    console.log(`Health check: /health`);
    console.log(`Test endpoint: /test`);
});