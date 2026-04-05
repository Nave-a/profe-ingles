const express = require('express');
const OpenAI = require('openai');

const app = express();
app.use(express.json());

// El PROMPT del profesor británico amigable (optimizado para DeepSeek)
const PROFESSOR_PROMPT = `Eres Oliver, profesor de inglés británico, amigable y paciente.

REGLAS:
1. Si hay error: di "Good try! Say: [frase correcta] because [razón corta]. Try again?"
2. Si acierta: "Brilliant!" o "Well done!" y sigue con nueva pregunta
3. Usa expresiones británicas: "spot on", "let's crack on", "fancy trying?"
4. Para alumnos de Chile: puedes usar una palabra en español si están muy perdidos
5. NUNCA te frustres

Empieza: preséntate en 2 frases y pregunta "What's your name?"`;

// Configurar DeepSeek
const client = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: "https://api.deepseek.com"
});

app.post('/chat', async (req, res) => {
  const { userMessage, conversationHistory } = req.body;
  
  try {
    const response = await client.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: PROFESSOR_PROMPT },
        ...conversationHistory,
        { role: "user", content: userMessage }
      ],
      temperature: 0.7,
      max_tokens: 150
    });
    
    res.json({ 
      reply: response.choices[0].message.content 
    });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Professor Oliver is having tea. Try again!" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Professor Oliver ready on port ${PORT}`));