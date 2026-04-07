const express = require('express');
const Groq = require('groq-sdk');

const app = express();

// --- MIDDLEWARE CORS (MÁS EXPLÍCITO, AL PRINCIPIO DE TODO) ---
app.use((req, res, next) => {
    // Permitir cualquier origen
    res.header('Access-Control-Allow-Origin', '*');
    // Permitir cualquier header
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    // Permitir métodos específicos
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    
    // Responder inmediatamente a las peticiones OPTIONS (preflight)
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    
    next();
});

// Middleware para parsear JSON
app.use(express.json());

// --- Health check (público) ---
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

// --- Ruta de prueba ---
app.get('/test', (req, res) => {
    res.json({ message: "Servidor funcionando correctamente" });
});

// --- Prompt del profesor Oliver ---
const PROMPT_PROFESOR = `Eres Oliver, un profesor de inglés británico, muy amigable y paciente. Reglas:
1. Si hay error gramatical: di "Good try! Say: [frase correcta] because [razón corta]. Try again?"
2. Si acierta: "Brilliant!" o "Well done!" y haz una nueva pregunta corta.
3. Usa expresiones británicas como "spot on", "let's crack on", "brilliant", "cheers".
4. Respuestas muy cortas (máximo 2-3 frases).
5. Responde SIEMPRE en inglés.`;

// --- Configuración de Groq ---
const GROQ_API_KEY = process.env.GROQ_API_KEY;
if (!GROQ_API_KEY) {
    console.error("ERROR: GROQ_API_KEY no configurada en variables de entorno");
    process.exit(1);
}

const groq = new Groq({ apiKey: GROQ_API_KEY });

// --- Endpoint /chat (con CORS ya habilitado) ---
app.post('/chat', async (req, res) => {
    const { userMessage, conversationHistory } = req.body;
    
    if (!userMessage) {
        return res.status(400).json({ error: "Mensaje de usuario requerido" });
    }
    
    try {
        const messages = [
            { role: "system", content: PROMPT_PROFESOR }
        ];
        
        if (conversationHistory && conversationHistory.length > 0) {
            for (const msg of conversationHistory) {
                messages.push({
                    role: msg.role === 'user' ? 'user' : 'assistant',
                    content: msg.content
                });
            }
        }
        
        messages.push({ role: "user", content: userMessage });
        
        const completion = await groq.chat.completions.create({
            messages: messages,
            model: "llama-3.3-70b-versatile",
            temperature: 0.7,
            max_tokens: 150
        });
        
        const reply = completion.choices[0].message.content;
        res.json({ reply: reply });
    } catch (error) {
        console.error("Error llamando a Groq:", error);
        res.status(500).json({ error: "Professor Oliver is having tea. Try again!" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Professor Oliver with Groq ready on port ${PORT}`);
    console.log(`Health check: /health`);
    console.log(`CORS enabled for all origins`);
});