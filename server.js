const express = require('express');
const Groq = require('groq-sdk');

const app = express();

// --- CORS ---
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
});

app.use(express.json());

// --- Health check ---
app.get('/health', (req, res) => res.status(200).send('OK'));

// ============================================================
// PROMPT CORTO Y EFECTIVO (evita que Groq lo ignore)
// ============================================================

const PROMPT_PROFESOR = `Eres Oliver, un profesor de inglés que usa un método especial:

REGLAS ESTRICTAS:
1. HABLAS 100% EN ESPAÑOL. Nunca uses inglés en tus respuestas.
2. Cuando el estudiante use palabras en inglés, CELEBRAS: "¡Excelente! Dijiste 'hello' - muy bien!"
3. Luego repites la frase correcta en inglés y explicas en español por qué.
4. NUNCA uses expresiones británicas como "brilliant", "mate", "spot on".
5. Usa expresiones neutras: "excelente", "muy bien", "fantástico", "buen trabajo".
6. Si el estudiante habla solo español, le ayudas a traducir.
7. Si el estudiante mezcla inglés y español, corriges suavemente.
8. Tus respuestas son cortas y alentadoras.

EJEMPLO:
Estudiante: "Hola, my name es Victor"
Tú: "¡Excelente! Usaste 'my name' - muy bien. La frase completa sería: 'My name is Victor'. En inglés, decimos 'is' en lugar de 'es'. ¿Puedes intentarlo de nuevo? ¡Vamos!"

INICIA LA CONVERSACIÓN:
"Hola, soy Oliver, tu profesor de inglés. Vamos a aprender de forma natural. No tengas miedo de equivocarte. Cuéntame, ¿cómo te llamas y de dónde eres?"`;

// ============================================================
// CONFIGURACIÓN DE GROQ
// ============================================================

const GROQ_API_KEY = process.env.GROQ_API_KEY;
if (!GROQ_API_KEY) {
    console.error("ERROR: GROQ_API_KEY no configurada");
    process.exit(1);
}

const groq = new Groq({ apiKey: GROQ_API_KEY });

// ============================================================
// ENDPOINT PRINCIPAL /chat
// ============================================================

app.post('/chat', async (req, res) => {
    const { userMessage, conversationHistory } = req.body;
    
    if (!userMessage) {
        return res.status(400).json({ error: "Mensaje requerido" });
    }
    
    try {
        // Construir mensajes incluyendo TODO el historial
        const messages = [
            { role: "system", content: PROMPT_PROFESOR }
        ];
        
        // Agregar todo el historial de la conversación
        if (conversationHistory && conversationHistory.length > 0) {
            for (const msg of conversationHistory) {
                messages.push({
                    role: msg.role === 'user' ? 'user' : 'assistant',
                    content: msg.content
                });
            }
        }
        
        // Agregar el mensaje actual
        messages.push({ role: "user", content: userMessage });
        
        console.log(`Mensajes en historial: ${messages.length}`);
        
        const completion = await groq.chat.completions.create({
            messages: messages,
            model: "llama-3.3-70b-versatile",
            temperature: 0.7,
            max_tokens: 250
        });
        
        const reply = completion.choices[0].message.content;
        res.json({ reply: reply });
        
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ error: "Oliver está tomando té. ¡Intenta de nuevo!" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Professor Oliver ready on port ${PORT}`);
    console.log(`Health check: /health`);
});