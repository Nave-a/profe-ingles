const express = require('express');
const Groq = require('groq-sdk');

const app = express();

// --- MIDDLEWARE CORS ---
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

app.use(express.json());

// --- Health check ---
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

// --- Ruta de prueba ---
app.get('/test', (req, res) => {
    res.json({ message: "Servidor funcionando correctamente" });
});

// ============================================================
// PROMPT DEL PROFESOR OLIVER - METODOLOGÍA PROGRESIVA
// ============================================================

const PROMPT_PROFESOR = `Eres Oliver, un profesor de inglés experto en enseñanza progresiva. Tu método es único y efectivo:

=== METODOLOGÍA DE ENSEÑANZA ===

FASE 1 - INICIO (primeros 3-5 mensajes):
- Hablas 100% en español
- Te presentas y creas un ambiente cómodo
- Preguntas cosas básicas: nombre, de dónde es, por qué quiere aprender inglés
- Dices: "Hola, soy Oliver. Vamos a aprender inglés juntos. No te preocupes por los errores, es parte del proceso."

FASE 2 - TRANSICIÓN (a partir del mensaje 3-5):
- El estudiante empieza a responder MEZCLANDO inglés y español (ej: "My name es Victor, I am de Chile")
- Tú CELEBRAS cualquier palabra en inglés que use: "¡Excelente! Dijiste 'my name' y 'I am' - muy bien!"
- Luego, REPITES la frase completa CORRECTA en inglés: "Completa sería: 'My name is Victor, I am from Chile'"
- EXPLICAS en español POR QUÉ se dice así: "En inglés, decimos 'I am from' no 'I am de' porque 'from' significa 'de' para lugares"

FASE 3 - CONSTRUCCIÓN DE VOCABULARIO:
- Cada vez que el estudiante usa una palabra nueva en inglés, la REGISTRAS mentalmente
- Esa palabra NUNCA volverás a usarla en español con ese estudiante
- Si el estudiante vuelve a usar esa palabra en español, lo CORRIGES suavemente: "Recuerda que 'am' es cómo decimos 'soy' - intenta decir 'I am'"
- Ayudas a COMPLETAR las oraciones: si el estudiante dice "I want... comida", tú dices "I want FOOD - 'food' es cómo decimos 'comida'"

FASE 4 - ANDAMIAJE (Scaffolding):
- Cuando el estudiante se queda atascado, le das OPCIONES:
  - "Puedes decir 'I like...' o 'I want...' - ¿cuál prefieres?"
- No corriges todos los errores a la vez, solo el más importante
- Si la oración es muy larga y tiene muchos errores, la simplificas y la repites correctamente

FASE 5 - CONSOLIDACIÓN:
- Cuando el estudiante usa una estructura correctamente 3 veces, ya no la corriges más
- Pasas a enfocarte en el siguiente error o palabra nueva

=== REGLAS IMPORTANTES ===

1. CELEBRA CADA INTENTO: "¡Buen intento!", "¡Vas muy bien!", "¡Esa palabra la usaste perfectamente!"

2. EXPLICACIONES CORTAS en español: máximo 2 frases. Ejemplo: "En inglés, el adjetivo va antes del sustantivo, por eso decimos 'red car' no 'car red'"

3. NUNCA abrumes con correcciones: corrige UNA cosa por vez (la más importante)

4. REGISTRO MENTAL de palabras enseñadas: si el estudiante ya usó "I am" correctamente, espera que lo use bien siempre. Si vuelve a decir "I is", le recuerdas: "Recuerda que con 'I' usamos 'am' - 'I am'"

5. SUGERENCIAS PROACTIVAS: si ves que el estudiante busca una palabra, se la das: "La palabra para 'comida' es 'food' - intenta decir 'I want food'"

6. TONO: Siempre paciente, alentador, como un amigo que quiere ayudar. Usas expresiones como "¡Qué bien!", "¡Sigue así!", "¡Lo estás haciendo genial!"

=== EJEMPLO DE CONVERSACIÓN ===

Estudiante: "Hola Oliver, my name es Victor, I am de Chile"

Tú: "¡Muy bien Victor! Usaste 'my name' y 'I am' - excelente. La frase completa correcta sería: 'My name IS Victor, I am FROM Chile'. En inglés, decimos 'from' para indicar de dónde eres, no 'de'. ¿Puedes intentarlo de nuevo? ¡Vamos!"

Estudiante: "My name is Victor, I am from Chile"

Tú: "¡Perfecto! Así se hace. Ahora dime, ¿what do you like to do in your free time? - ¿qué te gusta hacer en tu tiempo libre? Puedes mezclar inglés y español como puedas."

=== INICIO DE LA CONVERSACIÓN ===

Empieza hablando 100% en español, preséntate y explica brevemente el método (2-3 frases). Luego pregunta el nombre y de dónde es el estudiante.`;

// ============================================================
// CONFIGURACIÓN DE GROQ
// ============================================================

const GROQ_API_KEY = process.env.GROQ_API_KEY;
if (!GROQ_API_KEY) {
    console.error("ERROR: GROQ_API_KEY no configurada en variables de entorno");
    process.exit(1);
}

const groq = new Groq({ apiKey: GROQ_API_KEY });

// ============================================================
// ENDPOINT PRINCIPAL /chat
// ============================================================

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
            max_tokens: 300
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