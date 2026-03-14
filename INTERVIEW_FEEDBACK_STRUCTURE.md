# Estructura de Análisis de Entrevistas

## Descripción General

Cuando se finaliza una entrevista, el sistema envía a **n8n** un payload con todas las preguntas y respuestas en diferentes formatos para que la IA analice y proporcione un feedback general completo.

---

## Estructura del Payload Enviado a n8n

```javascript
{
  // Identificadores de la sesión
  id_session: "uuid-de-sesion",
  id_user: 123,
  is_final: true,

  // Metadatos de la entrevista
  technology: "Python",           // Tecnología evaluada
  topic: "Functions",             // Tema específico
  difficulty: "intermediate",     // Nivel de dificultad
  language: 1,                    // ID del idioma
  totalQuestions: 5,              // Total de preguntas
  scorePromedio: 72,              // Puntaje promedio
  nivelEstimado: "Intermediate",  // Nivel estimado

  // ⭐ FORMATO CLAVE-VALOR (Principal para análisis IA)
  respuestas: {
    "¿Qué es una función en Python?": "Una función es un bloque de código reutilizable...",
    "¿Cómo definir una función?": "Con la palabra clave def seguida del nombre...",
    "¿Qué son los parámetros?": "Son variables que recibe la función...",
    // ... más preguntas y respuestas
  },

  // 📋 FORMATO DETALLADO (Para referencia y auditoría)
  respuestasDetalladas: [
    {
      orden: 1,
      pregunta: "¿Qué es una función en Python?",
      respuesta: "Una función es un bloque de código reutilizable...",
      puntaje: 75,
      razon: "Buena explicación pero falta mencionar scope",
      id_question: 101,
      id_question_instance: 501
    },
    {
      orden: 2,
      pregunta: "¿Cómo definir una función?",
      respuesta: "Con la palabra clave def seguida del nombre...",
      puntaje: 80,
      razon: "Respuesta clara y completa",
      id_question: 102,
      id_question_instance: 502
    },
    // ... más detalles
  ]
}
```

---

## Formato Clave-Valor (Recomendado para IA)

El objeto `respuestas` es el **formato principal para análisis de IA**:

```javascript
{
  "¿Qué es una función en Python?": "Una función es un bloque de código reutilizable que realiza una tarea específica...",
  "¿Cómo definir una función?": "Con la palabra clave def seguida del nombre de la función y paréntesis...",
  "¿Qué son los parámetros?": "Son variables que recibe la función como entrada...",
  "¿Cómo llamar una función?": "indicando su nombre seguido de paréntesis con los argumentos..."
}
```

### Ventajas:
- ✅ Estructura clara y legible
- ✅ Fácil de analizar para modelos de IA
- ✅ Permite comparaciones pregunta por pregunta
- ✅ Ideal para generación de feedback contextual

---

## Formato Detallado (Para Auditoría)

El array `respuestasDetalladas` incluye metadatos adicionales:

```javascript
[
  {
    orden: 1,
    pregunta: "¿Qué es una función en Python?",
    respuesta: "...",
    puntaje: 75,        // Puntuación individual
    razon: "...",       // Razón del puntaje
    id_question: 101,   // ID de pregunta en BD
    id_question_instance: 501  // ID de instancia en BD
  }
]
```

---

## Funciones Auxiliares Disponibles

### 1. `extractAnswersAsKeyValuePairs()`
Extrae las respuestas en formato clave-valor (pregunta → respuesta).

```javascript
import { extractAnswersAsKeyValuePairs } from "./services/n8nBridge.js";

const respuestas = extractAnswersAsKeyValuePairs({ session, context });
// Retorna: { "pregunta 1": "respuesta 1", ... }
```

### 2. `extractDetailedAnswers()`
Extrae las respuestas con todos los metadatos.

```javascript
import { extractDetailedAnswers } from "./services/n8nBridge.js";

const detalles = extractDetailedAnswers({ session, context });
// Retorna: [ { orden, pregunta, respuesta, puntaje, ... } ]
```

### 3. `extractInterviewAnswers()`
Extrae en formato compatible con búsquedas.

```javascript
import { extractInterviewAnswers } from "./services/n8nBridge.js";

const respuestas = extractInterviewAnswers({ session, context });
// Retorna: [ { order_num, id_question, question_text, answer, ... } ]
```

---

## Cómo n8n Procesa Este Payload

El workflow de n8n recibe el payload y:

1. **Analiza el objeto `respuestas`** (formato clave-valor)
2. **Identifica patrones** en las respuestas
3. **Evalúa la coherencia** del conocimiento
4. **Genera un feedback general** considerando:
   - Consistencia entre respuestas relacionadas
   - Profundidad del conocimiento
   - Claridad y precisión en la comunicación
   - Puntos fuertes y áreas mejorables

---

## Ejemplo de Respuesta de n8n

```javascript
{
  feedback: "Tu desempeño ha sido intermedio...",
  analisisGeneral: "Has demostrado una comprensión sólida de funciones...",
  fortalezas: ["Definición clara", "Buen vocabulario técnico"],
  areasMejora: ["Profundizar en scope", "Mencionar recursión"],
  recomendaciones: "Te sugerimos..."
}
```

---

## Cambios Realizados

✅ **Nuevo formato clave-valor** para análisis de IA  
✅ **Funciones auxiliares** para extraer datos  
✅ **Payload enriquecido** con metadatos  
✅ **Logging mejorado** para debugging  
✅ **Compatibilidad** con workflow de n8n existente  

---

## Referencia de Archivos Modificados

- [interviewPage.js](../js/interviewPage.js) - Lógica de finalización
- [n8nBridge.js](../js/services/n8nBridge.js) - Funciones de extracción
