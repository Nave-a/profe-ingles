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

// --- El prompt del profesor Oliver (británico, amigable) ---
const PROMPT_PROFESOR = `Eres Oliver, un profesor de inglés británico, muy amigable y paciente. Tu misión es enseñar inglés conversacional.

Reglas:
1. Si el estudiante comete un error, primero dile algo positivo ("Good try!", "Almost there!"), luego da la frase correcta ("You should say: ...") y explica brevemente el error en UNA frase. Termina pidiéndole que lo intente de nuevo.
2. Si el estudiante acierta, muéstrate entusiasta ("Brilliant!", "Well done, mate!") y haz una nueva pregunta relacionada para continuar la conversación.
3. Usa expresiones británicas amigables como "spot on", "let's crack on", "fancy trying?".
4. Si el estudiante se bloquea, puedes usar una palabra en español para ayudarle, pero anímalo siempre a pensar en inglés.
5. Mantén tus respuestas concisas (máximo 2-3 frases) para que la conversación sea fluida.

Ejemplo de interacción:
Estudiante: "I go to cinema yesterday."
Tú: "Good attempt! In British English, we'd say 'I WENT to the cinema yesterday' because 'yesterday' means past tense. Can you try that again for me? Brilliant."`;

// --- Configuración de Gemini ---
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
    console.error("ERROR: La variable de entorno GEMINI_API_KEY no está configurada.");
    process.exit(1);
}
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
// Usamos gemini-1.5-flash (rápido y económico)
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// --- Endpoint /chat ---
app.post('/chat', async (req, res) => {
    const { userMessage, conversationHistory } = req.body;

    // Validación básica
    if (!userMessage) {
        return res.status(400).json({ error: "Mensaje de usuario requerido" });
    }

    try {
        // Construir el historial para Gemini
        let chat = model.startChat({
            history: (conversationHistory || []).map(msg => ({
                role: msg.role === 'user' ? 'user' : 'model',
                parts: [{ text: msg.content }]
            })),
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 150,
            }
        });

        // Si no hay historial, incluimos el prompt del sistema como primera instrucción
        if (!conversationHistory || conversationHistory.length === 0) {
            await model.generateContent(PROMPT_PROFESOR);
            chat = model.startChat({
                history: [{ role: 'model', parts: [{ text: PROMPT_PROFESOR }] }],
                generationConfig: { temperature: 0.7, maxOutputTokens: 150 }
            });
        }

        const result = await chat.sendMessage(userMessage);
        const reply = result.response.text();
        res.json({ reply: reply });
    } catch (error) {
        console.error("Error llamando a Gemini:", error);
        res.status(500).json({ error: "Professor Oliver is having tea. Try again!" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Professor Oliver with Gemini ready on port ${PORT}`);
    console.log(`Health check: /health`);
    console.log(`Test endpoint: /test`);
});