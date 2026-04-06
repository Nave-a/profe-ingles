const express = require('express');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
app.use(express.json());

// --- Health check para Render ---
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

// --- Ruta de prueba rápida ---
app.get('/test', (req, res) => {
    res.json({ message: "Servidor funcionando correctamente" });
});

// --- El prompt del profesor Oliver ---
const PROMPT_PROFESOR = `Eres Oliver, un profesor de inglés británico, muy amigable y paciente. Tu misión es enseñar inglés conversacional.

Reglas:
1. Si el estudiante comete un error, primero dile algo positivo, luego da la frase correcta y explica brevemente el error en UNA frase.
2. Si acierta, muéstrate entusiasta y haz una nueva pregunta.
3. Usa expresiones británicas como "brilliant", "spot on", "well done".
4. Mantén tus respuestas muy cortas (máximo 2 frases).
5. Responde siempre en inglés.`;

// --- Configuración de Gemini ---
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
    console.error("ERROR: La variable de entorno GEMINI_API_KEY no está configurada.");
    process.exit(1);
}
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// --- Endpoint /chat ---
app.post('/chat', async (req, res) => {
    const { userMessage, conversationHistory } = req.body;
    
    // Validación básica
    if (!userMessage) {
        return res.status(400).json({ error: "Mensaje de usuario requerido" });
    }
    
    try {
        // Construir historial
        const history = (conversationHistory || []).map(msg => ({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.content }]
        }));
        
        // Iniciar chat con historial
        const chat = model.startChat({
            history: history,
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 150,
            }
        });
        
        // Enviar mensaje
        const result = await chat.sendMessage(userMessage);
        const reply = result.response.text();
        
        res.json({ reply: reply });
    } catch (error) {
        console.error("Error llamando a Gemini:", error);
        // Devolver error detallado para depuración
        res.status(500).json({ 
            error: "Professor Oliver is having tea. Try again!",
            details: error.message 
        });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Professor Oliver with Gemini ready on port ${PORT}`);
    console.log(`Health check: https://profe-ingles.onrender.com/health`);
    console.log(`Test endpoint: https://profe-ingles.onrender.com/test`);
});