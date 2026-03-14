import { API_BASE_URL } from "./apiConfig.js";
import { getLoggedInUser } from "./sessionService.js";
import { getInterviewContext, getInterviewSession } from "./interviewService.js";

/**
 * Extrae las respuestas en formato clave-valor
 * Clave: Pregunta (texto)
 * Valor: Respuesta del usuario (texto)
 * @param {Object} session - Sesión de entrevista
 * @param {Object} context - Contexto de la entrevista
 * @returns {Object} Objeto con preguntas como claves y respuestas como valores
 */
export function extractAnswersAsKeyValuePairs({ session, context }) {
  const respuestasObjeto = {};

  if (!session?.questions || !session?.answers) {
    return respuestasObjeto;
  }

  session.questions.forEach((question, index) => {
    const entry = session.answers[index] || {};
    const preguntaTexto = question?.question_text ?? `Pregunta ${index + 1}`;
    const respuestaTexto = entry.answer ?? "";

    respuestasObjeto[preguntaTexto] = respuestaTexto;
  });

  return respuestasObjeto;
}

/**
 * Extrae las respuestas en formato detallado con metadatos
 * @param {Object} session - Sesión de entrevista
 * @param {Object} context - Contexto de la entrevista
 * @returns {Array} Array de objetos con detalles de cada respuesta
 */
export function extractDetailedAnswers({ session, context }) {
  const respuestasDetalladas = [];

  if (!session?.questions || !session?.answers) {
    return respuestasDetalladas;
  }

  session.questions.forEach((question, index) => {
    const entry = session.answers[index] || {};
    respuestasDetalladas.push({
      orden: index + 1,
      pregunta: question?.question_text ?? `Pregunta ${index + 1}`,
      respuesta: entry.answer ?? "",
      puntaje: entry.score ?? entry.puntaje ?? 0,
      razon: entry.reason ?? entry.razon ?? "",
      id_question: question?.id_question ?? null,
      id_question_instance: question?.id_question_instance ?? null,
    });
  });

  return respuestasDetalladas;
}

export function extractInterviewAnswers({ session, context }) {
  const answers = (session?.answers || []).filter(Boolean);

  return answers.map((entry, index) => {
    const question = session?.questions?.[index];
    return {
      order_num: index + 1,
      id_question: entry?.questionId ?? question?.id_question ?? null,
      question_text: question?.question_text ?? "",
      answer: entry?.answer ?? "",
      pregunta: question?.question_text ?? "",
      respuesta: entry?.answer ?? "",
      puntaje: entry?.score ?? entry?.puntaje ?? 0,
      razon: entry?.reason ?? entry?.razon ?? "",
    };
  });
}

export function buildN8nAnswerPayload({
  id_session,
  id_question_instance,
  id_user,
  order_num,
  id_question,
  pregunta,
  texto,
  audio,
  mode,
}) {
  return {
    id_session,
    id_question_instance,
    id_user,
    order_num,
    id_question,
    pregunta,
    texto,
    audio,
    mode,
  };
}

export async function ensureInterviewSessionId({ context, user } = {}) {
  const resolvedContext = context || getInterviewContext();
  const resolvedUser = user || getLoggedInUser();

  if (resolvedContext?.id_session) {
    return { id_session: resolvedContext.id_session, created: false };
  }

  if (!resolvedUser?.id_user) {
    return { id_session: null, created: false, error: "missing_id_user" };
  }

  const payload = {
    id_user: resolvedUser.id_user,
    id_topic: resolvedContext?.id_topic ?? resolvedContext?.nodeId ?? null,
    id_level: resolvedUser.id_level,
    session_status: "active",
    date_ini: new Date().toISOString(),
  };

  const response = await fetch(`${API_BASE_URL}/interview`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    return { id_session: null, created: false, error: text || "create_session_failed" };
  }

  const data = await response.json();
  const interview = data?.interview || data?.session || data;

  return {
    id_session: interview?.id_session ?? interview?.id ?? null,
    created: true,
    raw: data,
  };
}

export async function sendN8nAnswer({ payload, audioBlob } = {}) {
  if (!payload) {
    throw new Error("missing_payload");
  }

  let response;

  if (audioBlob) {
    const formData = new FormData();
    Object.entries(payload).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, String(value));
      }
    });
    formData.append("audio", audioBlob, "answer.webm");

    response = await fetch(`${API_BASE_URL}/voice/feedback`, {
      method: "POST",
      body: formData,
    });
  } else {
    response = await fetch(`${API_BASE_URL}/voice/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  }

  const contentType = response.headers.get("content-type") || "";
  const isJson = contentType.toLowerCase().includes("application/json");

  if (!response.ok) {
    const errorBody = isJson ? await response.json() : await response.text();
    throw new Error(
      typeof errorBody === "string" ? errorBody : errorBody?.mensaje || "n8n_request_failed"
    );
  }

  return isJson ? await response.json() : await response.arrayBuffer();
}

/**
 * Genera un prompt detallado para que n8n/IA analice la entrevista de forma general
 * @param {Object} params - Parámetros para generar el prompt
 * @returns {string} Prompt estructurado para análisis de IA
 */
export function buildInterviewAnalysisPrompt({
  technology,
  topic,
  difficulty,
  respuestasObjeto,
  respuestasDetalladas,
  scorePromedio,
  nivelEstimado,
  language = "es",
} = {}) {
  const isSpanish = language === "es" || language === 1;

  if (isSpanish) {
    return `
## Análisis General de Entrevista Técnica

### Contexto
- **Tecnología Evaluada:** ${technology}
- **Tema:** ${topic}
- **Dificultad:** ${difficulty}
- **Puntaje Promedio Inicial:** ${scorePromedio}%
- **Nivel Estimado Inicial:** ${nivelEstimado}

### Preguntas y Respuestas Completas
${JSON.stringify(respuestasObjeto, null, 2)}

### Instrucciones de Análisis - RETORNA SOLO JSON

Analiza el conjunto COMPLETO de preguntas y respuestas de forma hoística (NO respuesta por respuesta).

**RETORNA ÚNICAMENTE UN OBJETO JSON (sin texto adicional) con esta estructura exacta:**

\`\`\`json
{
  "score": 75,
  "feedback": "Análisis general de 2-3 párrafos que incluya: nivel real del candidato, fortalezas identificadas con ejemplos específicos, áreas de mejora concretas, y recomendaciones para mejorar."
}
\`\`\`

**Criterios de Calificación (1-100):**
- 85-100: Dominio avanzado, respuestas profundas, coherentes y con vocabulario técnico adecuado
- 65-84: Dominio intermedio, buena comprensión pero con áreas por mejorar
- 45-64: Dominio básico, respuestas superficiales o incompletas
- 0-44: Conocimiento muy limitado, respuestas confusas o incorrectas

**IMPORTANTE:**
- NO evalúes cada respuesta por separado
- Analiza la coherencia y consistencia del conocimiento
- Proporciona UN ÚNICO feedback general basado en patrones observados
- Retorna SOLO el JSON válido, sin explicaciones, texto adicional o markdown
`;
  }

  return `
## Technical Interview General Analysis

### Context
- **Technology Evaluated:** ${technology}
- **Topic:** ${topic}
- **Difficulty:** ${difficulty}
- **Initial Average Score:** ${scorePromedio}%
- **Estimated Level:** ${nivelEstimado}

### Complete Questions and Answers
${JSON.stringify(respuestasObjeto, null, 2)}

### Analysis Instructions - RETURN ONLY JSON

Analyze the COMPLETE set of questions and answers holistically (NOT answer by answer).

**RETURN ONLY A JSON OBJECT (no additional text) with this exact structure:**

\`\`\`json
{
  "score": 75,
  "feedback": "General analysis of 2-3 paragraphs including: candidate's real level, identified strengths with specific examples, concrete areas for improvement, and recommendations to enhance performance."
}
\`\`\`

**Scoring Criteria (1-100):**
- 85-100: Advanced mastery, deep and coherent responses with appropriate technical vocabulary
- 65-84: Intermediate mastery, good understanding but with areas for improvement
- 45-64: Basic mastery, superficial or incomplete responses
- 0-44: Very limited knowledge, confused or incorrect responses

**IMPORTANT:**
- DO NOT evaluate each response separately
- Analyze coherence and consistency of knowledge
- Provide ONE SINGLE general feedback based on observed patterns
- Return ONLY valid JSON, no explanations, additional text or markdown
`;
}

export function getN8nExtractionSnapshot() {
  const context = getInterviewContext();
  const session = getInterviewSession();
  const user = getLoggedInUser();

  return {
    context,
    session,
    user,
    answers: extractInterviewAnswers({ session, context }),
  };
}
