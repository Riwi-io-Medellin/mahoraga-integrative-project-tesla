import { applyTranslations, t } from "./services/i18n.js";
import { API_BASE_URL } from "./services/apiConfig.js";
import {
  clearInterviewSession,
  createInterviewSession,
  evaluateInterviewSession,
  fetchInterviewQuestions,
  saveInterviewQuestionInstances,
  saveInterviewContext,
  saveInterviewSession,
  saveQuestionAnswered,
  endInterviewSession,
} from "./services/interviewService.js";
import {
  getInterviewLanguagePreference,
  getLoggedInUser,
  requireLoggedInUser,
} from "./services/sessionService.js";
import {
  buildN8nAnswerPayload,
  ensureInterviewSessionId,
  sendN8nAnswer,
  extractAnswersAsKeyValuePairs,
  extractDetailedAnswers,
} from "./services/n8nBridge.js";
import { gameState } from "./state/gameState.js";

// Helpers para puntajes ponderados
function mapDifficultyToPesoLevel(difficulty) {
  if (difficulty === "advanced") return "senior";
  if (difficulty === "intermediate") return "mid";
  return "junior";
}

function calcularPuntaje(metrics, nivel = "mid") {
  if (!metrics) return { puntaje: null, aprobado: false, nivel_respuesta: "Sin datos" };

  const pesos = {
    junior: { correctness: 0.40, depth: 0.15, clarity: 0.25, relevance: 0.15, examples: 0.05 },
    mid: { correctness: 0.35, depth: 0.25, clarity: 0.20, relevance: 0.15, examples: 0.05 },
    senior: { correctness: 0.25, depth: 0.40, clarity: 0.15, relevance: 0.15, examples: 0.05 },
  };

  const w = pesos[nivel] || pesos.mid;

  const puntaje = Math.round(
    (metrics.correctness || 0) * w.correctness +
      (metrics.depth || 0) * w.depth +
      (metrics.clarity || 0) * w.clarity +
      (metrics.relevance || 0) * w.relevance +
      (metrics.examples || 0) * w.examples,
  );

  const aprobado = puntaje >= 60 && (metrics.correctness || 0) >= 50;
  const nivel_respuesta =
    puntaje >= 85 ? "Excelente" : puntaje >= 70 ? "Bueno" : puntaje >= 55 ? "Básico" : "Insuficiente";

  return { puntaje, aprobado, nivel_respuesta };
}

function buildFallbackMetrics(answerText = "") {
  const lengthScore = Math.max(20, Math.min(90, Math.round(answerText.trim().length / 3)));
  const base = answerText.trim().length < 20 ? 25 : lengthScore;
  return {
    correctness: base,
    depth: Math.max(20, Math.min(85, base - 5)),
    clarity: Math.max(20, Math.min(90, base + 5)),
    relevance: Math.max(20, Math.min(90, base)),
    examples: Math.max(10, Math.min(70, Math.round(base * 0.6))),
  };
}

// Genera fortalezas/debilidades/recomendaciones locales si la IA no las devuelve
function buildLocalInsights({ answers = [], scoreLabel = 0 }) {
  const metricNames = ["correctness", "depth", "clarity", "relevance", "examples"];
  const totals = { correctness: 0, depth: 0, clarity: 0, relevance: 0, examples: 0 };
  let count = 0;

  answers.forEach((a) => {
    if (a?.metrics) {
      metricNames.forEach((k) => {
        totals[k] += Number(a.metrics[k] || 0);
      });
      count += 1;
    }
  });

  const avg = {};
  metricNames.forEach((k) => {
    avg[k] = count ? Math.round(totals[k] / count) : 0;
  });

  const label = {
    correctness: "precision tecnica",
    depth: "profundidad",
    clarity: "claridad",
    relevance: "relevancia",
    examples: "uso de ejemplos",
  };

  const strengths = metricNames
    .sort((a, b) => avg[b] - avg[a])
    .slice(0, 2)
    .map((k) => (avg[k] > 0 ? `Fuerte en ${label[k]}` : null))
    .filter(Boolean);

  const weaknesses = metricNames
    .sort((a, b) => avg[a] - avg[b])
    .slice(0, 2)
    .map((k) => (avg[k] > 0 ? `${label[k]} necesita mejora` : null))
    .filter(Boolean);

  const recomendacionesCalc = weaknesses.length
    ? weaknesses.map((w) => w.replace("necesita mejora", "refuerzalo con 2-3 ejercicios guiados y ejemplos concretos"))
    : ["Revisa la documentacion oficial y practica ejemplos cortos."];

  const resumen = `Lo mejor: ${strengths[0] || "completaste la entrevista"}. A mejorar: ${weaknesses[0] || "profundizar con ejemplos"}.`; 

  return {
    fortalezas: strengths.length ? strengths : ["Mostraste motivacion y completaste todas las preguntas."],
    debilidades: weaknesses.length ? weaknesses : ["Profundiza en ejemplos practicos y terminos clave."],
    recomendaciones: recomendacionesCalc,
    resumen,
  };
}

// Construye feedback por pregunta cuando la IA no lo env?a cuando la IA no lo envía
function buildPerQuestionFeedback({ questions = [], answers = [] }) {
  const label = {
    correctness: "precisión",
    depth: "profundidad",
    clarity: "claridad",
    relevance: "relevancia",
    examples: "uso de ejemplos",
  };

  return questions.map((question, index) => {
    const entry = answers[index] || {};
    const metrics = entry.metrics || buildFallbackMetrics(entry.answer || "");

    const sorted = Object.entries(metrics)
      .sort((a, b) => a[1] - b[1])
      .slice(0, 2);

    const weakest = sorted.map(([k, v]) => `${label[k]} (${v})`).join(" y ");
    const razon =
      entry.reason ||
      entry.razon ||
      `Necesita mejorar ${weakest}; agrega detalles y ejemplos concretos.`;

    const descripcion = `Enfócate en ${weakest}; practica explicando el concepto y muestra un ejemplo corto.`;

    return {
      pregunta: question?.question_text || `Pregunta ${index + 1}`,
      puntaje: entry.score ?? entry.puntaje ?? 0,
      razon,
      descripcion,
      respuesta: entry.answer || "",
    };
  });
}

// Genera un paquete detallado local cuando n8n falla o responde vacío
function buildLocalDetailedFeedback({ session, summary }) {
  const scoreLabel = summary?.score ?? 0;
  const local = buildLocalInsights({ answers: session?.answers || [], scoreLabel });
  return {
    puntaje_final: scoreLabel,
    fortalezas: local.fortalezas,
    debilidades: local.debilidades,
    recomendaciones: local.recomendaciones,
    feedback: summary?.feedback || local.resumen,
    preguntas: buildPerQuestionFeedback({
      questions: session?.questions || [],
      answers: session?.answers || [],
    }),
  };
}

document.addEventListener("DOMContentLoaded", () => {
  const chatWorld = document.querySelector("#chatWorld");
  const roadmapWorld = document.querySelector("#roadmapWorld");
  const closeChatBtn = document.querySelector("#closeChatBtn");
  const chatMessages = document.querySelector("#chatMessages");
  const chatInput = document.querySelector("#chatInput");
  const sendBtn = document.querySelector("#chatSendBtn");
  const micBtn = document.querySelector("#chatMicBtn");
  const micStatus = document.querySelector("#chatMicStatus");
  const chatFeedback = document.querySelector("#chatFeedback");
  const audioModal = document.querySelector("#audioModal");
  const audioModalClose = document.querySelector("#audioModalClose");
  const audioRecordBtn = document.querySelector("#audioRecordBtn");
  const audioStopBtn = document.querySelector("#audioStopBtn");
  const audioSendBtn = document.querySelector("#audioSendBtn");
  const audioTimer = document.querySelector("#audioTimer");
  const audioStatus = document.querySelector("#audioStatus");
  const audioIndicator = document.querySelector("#audioIndicator");

  if (!chatWorld || !roadmapWorld || !closeChatBtn || !chatMessages || !chatInput || !sendBtn) {
    return;
  }

  applyTranslations(document);

  let chatClosingTimer = null;
  let session = null;
  let context = null;

  function openChat() {
    clearTimeout(chatClosingTimer);

    roadmapWorld.style.display = "none";
    chatWorld.style.display = "flex";
    chatWorld.classList.remove("closing");
    chatWorld.classList.add("entering");

    requestAnimationFrame(() => {
      chatInput.focus();
    });

    setTimeout(() => {
      chatWorld.classList.remove("entering");
    }, 320);
  }

  function closeChat() {
    clearTimeout(chatClosingTimer);

    chatWorld.classList.remove("entering");
    chatWorld.classList.add("closing");

    chatClosingTimer = setTimeout(() => {
      chatWorld.classList.remove("closing");
      chatWorld.style.display = "none";
      roadmapWorld.style.display = "block";
    }, 260);
  }

  function appendMessage(type, content) {
    const message = document.createElement("div");
    message.className = `chat-message ${type} message-in`;
    message.innerHTML = content;
    chatMessages.appendChild(message);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function setChatBusy(busy) {
    chatInput.disabled = busy;
    sendBtn.disabled = busy;
    if (micBtn) {
      micBtn.disabled = busy;
      micBtn.classList.toggle("is-busy", Boolean(busy));
    }
  }

  function openAudioModal() {
    if (!audioModal) return;
    audioModal.hidden = false;
  }

  function closeAudioModal() {
    if (!audioModal) return;
    audioModal.hidden = true;
  }

  if (audioModal) {
    audioModal.hidden = true;
    audioModal.addEventListener("click", (event) => {
      if (event.target === audioModal) {
        closeAudioModal();
      }
    });
  }

  audioModalClose?.addEventListener("click", closeAudioModal);

  function buildContext(nodeDetail) {
    const user = requireLoggedInUser("../index.html");
    if (!user) return null;
    const node = nodeDetail?.node;
    if (!node) return null;

    return {
      technology: nodeDetail.technology,
      topic: node.title,
      difficulty: node.difficulty || "basic",
      nodeId: Number(node.id),
      idUser: user.id_user,
      levelId: Number(user?.id_level || 1),
      languageId: getInterviewLanguagePreference(user),
      totalQuestions: 5,
    };
  }

  async function startInterview(nodeDetail) {
    const nextContext = buildContext(nodeDetail);
    if (!nextContext) {
      appendMessage(
        "assistant",
        `<strong>${t("interviewer.label")}:</strong> No hay sesion activa.`,
      );
      return;
    }

    context = nextContext;
    session = null;
    chatMessages.innerHTML = "";
    openChat();
    appendMessage(
      "assistant",
      `<strong>${t("interviewer.label")}:</strong> ${t("interviewer.start", { topic: context.topic })}`,
    );
    appendMessage("assistant", "<em>Cargando preguntas...</em>");

    try {
      clearInterviewSession();
      saveInterviewContext(context);
      const interviewSession = await createInterviewSession({ context, user: getLoggedInUser() });
      const questions = await fetchInterviewQuestions(context);
      session = {
        contextKey: `${context.technology}:${context.topic}:${context.difficulty}`,
        currentIndex: 0,
        questions,
        answers: [],
        sessionId: interviewSession?.id_session || null,
      };
      if (session.sessionId) {
        context.id_session = session.sessionId;
        context.sessionId = session.sessionId;
        saveInterviewContext(context);
      }
      saveInterviewSession(session);
      if (session.sessionId) {
        const savedInstances = await saveInterviewQuestionInstances({
          id_session: session.sessionId,
          questions,
        });
        if (savedInstances?.created || Array.isArray(savedInstances)) {
          session.questionInstances = savedInstances.created || savedInstances;
          saveInterviewSession(session);
        }
      }
      appendQuestion();
    } catch (error) {
      appendMessage(
        "assistant",
        `<strong>${t("interviewer.label")}:</strong> ${error.message || "No se pudo cargar la entrevista."}`,
      );
    }
  }

  function appendQuestion() {
    if (!session) return;
    const question = session.questions[session.currentIndex];
    if (!question) return;

    appendMessage(
      "assistant",
      `<strong>${t("interviewer.label")}:</strong> Q${session.currentIndex + 1}/${
        session.questions.length
      }: ${question.question_text}`,
    );
  }

  async function finishInterview() {
    if (!session || !context) return;

    const summary = await evaluateInterviewSession({
      questions: session.questions,
      answers: session.answers,
      context,
    });

    let detailed = null;
    let user = null;
    let id_session = null;
    try {
      user = getLoggedInUser();
      const ensured = await ensureInterviewSessionId({ context, user });
      id_session = ensured?.id_session || session?.sessionId || null;

      if (id_session) {
        const endedAt = new Date().toISOString();
        try {
          await endInterviewSession({ id_session, date_fin: endedAt });
        } catch (err) {
          console.warn("No se pudo registrar la hora de cierre de la entrevista:", err?.message || err);
        }

        const respuestas = extractAnswersAsKeyValuePairs({ session, context });

        const respuestasDetalladas = extractDetailedAnswers({ session, context }).map((item, index) => {
          const question = session.questions?.[index];
          const metrics = session.answers?.[index]?.metrics ?? null;
          const resolvedInstance =
            item.id_question_instance ||
            question?.id_question_instance ||
            session?.questionInstances?.find?.((qi) => qi.id_question === question?.id_question)?.id_question_instance ||
            session?.questionInstances?.find?.((qi) => qi.order_num === index + 1)?.id_question_instance ||
            null;

          return {
            ...item,
            id_question_instance: resolvedInstance,
            metrics: metrics || item.metrics || null,
          };
        });

        const scorePromedio =
          respuestasDetalladas.length > 0
            ? Math.round(
                respuestasDetalladas.reduce((acc, cur) => acc + (Number(cur.puntaje) || 0), 0) /
                  respuestasDetalladas.length,
              )
            : 0;

        const payload = {
          id_session,
          id_user: user?.id_user ?? null,
          is_final: true,
          language: context?.languageId ?? context?.language ?? 1,
          respuestas,
          respuestasDetalladas,
          technology: context?.technology ?? "",
          topic: context?.topic ?? "",
          difficulty: context?.difficulty ?? "",
          totalQuestions: session.questions.length,
          scorePromedio,
          nivelEstimado: summary?.estimatedLevel ?? "",
        };

        detailed = await sendN8nAnswer({ payload });
        // Si n8n no regresa datos útiles, genera feedback local para no dejar vacío
        const hasUseful =
          detailed &&
          (detailed.puntaje_final ||
            (Array.isArray(detailed?.fortalezas) && detailed.fortalezas.length) ||
            (Array.isArray(detailed?.preguntas) && detailed.preguntas.length));
        if (!hasUseful || detailed?.feedback === "Error al procesar") {
          detailed = buildLocalDetailedFeedback({ session, summary });
        }
      }
    } catch (error) {
      console.error("No se pudo obtener feedback detallado de n8n:", error);
      detailed = buildLocalDetailedFeedback({ session, summary });
    }

    // Procesar resultado de entrevista para desbloquear niveles
    try {
      const progressResponse = await fetch(`${API_BASE_URL}/users/process-interview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_user: user?.id_user,
          id_session
        })
      });
      const progressResult = await progressResponse.json();
      console.log('[Progress] Resultado del procesamiento:', progressResult);
      
      if (progressResult.unlockResult?.unlocked) {
        console.log(`🎉 Nivel desbloqueado: ${progressResult.unlockResult.level}`);
        // Actualizar gameState local
        if (typeof gameState !== 'undefined') {
          const tech = session?.contextKey?.split(':')[0] || 'python';
          const currentLevel = context?.nodeId || null;
          const nextLevel = progressResult.unlockResult.level;
          // tech viene en minúsculas como 'python', 'html', etc.
          gameState.updateProgress(tech, {
            unlockLevel: nextLevel,
            completeLevel: currentLevel,
          });
        }
      }
      if (progressResult.upgradeResult?.upgraded) {
        console.log(`⬆️ Usuario subido a nivel: ${progressResult.upgradeResult.new_level}`);
      }
    } catch (progressError) {
      console.warn('⚠️ Error al procesar progreso:', progressError);
    }

    renderDetailedInterviewSummary({ detailed, summary, session });
  }

  function renderDetailedInterviewSummary({ detailed, summary, session }) {
    if (!chatFeedback || !chatMessages) return;

    const chatContainer = document.querySelector(".chat-container");
    if (chatContainer) {
      chatContainer.classList.add("is-feedback");
    }

    const inputArea = document.querySelector(".chat-input-area");
    if (inputArea) inputArea.hidden = true;
    chatMessages.hidden = true;
    chatFeedback.hidden = false;

    const scoreLabel = detailed?.puntaje_final ?? summary?.score ?? 0;
    const fortalezas = Array.isArray(detailed?.fortalezas) ? detailed.fortalezas : [];
    const debilidades = Array.isArray(detailed?.debilidades) ? detailed.debilidades : [];
    const recomendaciones = Array.isArray(detailed?.recomendaciones) ? detailed.recomendaciones : [];
    let feedbackText = detailed?.feedback || summary?.feedback || "";
    const preguntas = Array.isArray(detailed?.preguntas) ? detailed.preguntas : [];

    if (!fortalezas.length || !debilidades.length || !recomendaciones.length) {
      const local = buildLocalInsights({ answers: session.answers, scoreLabel });
      if (!fortalezas.length) fortalezas.push(...local.fortalezas);
      if (!debilidades.length) debilidades.push(...local.debilidades);
      if (!recomendaciones.length) recomendaciones.push(...local.recomendaciones);
      if (!feedbackText && local.resumen) feedbackText = local.resumen;
    }

    const resolvedFeedback =
      feedbackText ||
      (scoreLabel >= 80
        ? "Buen desempeno general; sigue afinando con ejercicios mas complejos y ejemplos de produccion."
        : scoreLabel >= 60
          ? "Vas por buen camino; profundiza con ejemplos concretos y explica el por que de cada decision."
          : "Necesitas reforzar los fundamentos y practicar con ejercicios cortos diarios.");

    

    chatFeedback.innerHTML = `
      <h3 class="feedback-title">Feedback final de la entrevista</h3>
      <div class="feedback-summary">
        <div class="feedback-meta">
          <span>Resultado final: ${scoreLabel}/100</span>
          <span>Preguntas: ${session.questions.length}</span>
        </div>
        <p>${resolvedFeedback || "No fue posible obtener feedback detallado de IA. Se muestra resumen local."}</p>
      </div>
      <div class="feedback-actions">
        <button class="feedback-action-btn primary" id="feedbackRetryBtn">
          <i class="bi bi-arrow-repeat"></i>
          <span>Reintentar entrevista</span>
        </button>
        <button class="feedback-action-btn" id="feedbackBackBtn">
          <i class="bi bi-arrow-left"></i>
          <span>Volver al dashboard</span>
        </button>
      </div>
      <div class="feedback-block">
        <strong>Fortalezas</strong>
        ${fortalezas.length ? `<ul class="feedback-list">${fortalezas.map((f) => `<li>${f}</li>`).join("")}</ul>` : "<p>Sin fortalezas registradas.</p>"}
      </div>
      <div class="feedback-block">
        <strong>Debilidades</strong>
        ${debilidades.length ? `<ul class="feedback-list">${debilidades.map((d) => `<li>${d}</li>`).join("")}</ul>` : "<p>Sin debilidades registradas.</p>"}
      </div>
      <div class="feedback-block">
        <strong>Recomendaciones</strong>
        ${recomendaciones.length ? `<ul class="feedback-list">${recomendaciones.map((r) => `<li>${r}</li>`).join("")}</ul>` : "<p>Sin recomendaciones registradas.</p>"}
      </div>
    `;

    const retryBtn = document.getElementById("feedbackRetryBtn");
    const backBtn = document.getElementById("feedbackBackBtn");
    retryBtn?.addEventListener("click", () => {
      clearInterviewSession();
      window.location.reload();
    });
    backBtn?.addEventListener("click", () => {
      clearInterviewSession();
      closeChat();
    });
  }

  async function sendAnswer() {
    if (!session) return;

    const text = chatInput.value.trim();
    if (!text) return;

    chatInput.value = "";
    await submitAnswer({ answerText: text, audioBlob: null, skipRemote: false });
  }

  async function submitAnswer({ answerText, audioBlob, skipRemote = false }) {
    if (!session) return;

    setChatBusy(true);
    if (micStatus) {
      micStatus.textContent = audioBlob ? "Procesando audio..." : "Enviando respuesta...";
    }

    const currentQuestion = session.questions[session.currentIndex];
    const storedUser = getLoggedInUser();
    const fallbackUser = storedUser || {
      id_user: context?.idUser ?? context?.id_user ?? null,
    };
    const ensured = await ensureInterviewSessionId({ context, user: fallbackUser });
    const id_session = ensured?.id_session || session?.sessionId || null;
    const id_question_instance =
      currentQuestion?.id_question_instance ??
      session?.questionInstances?.find?.((qi) => qi.id_question === currentQuestion?.id_question)?.id_question_instance ??
      session?.questionInstances?.find?.((qi) => qi.order_num === session.currentIndex + 1)?.id_question_instance ??
      session?.questionInstances?.[session.currentIndex]?.id_question_instance ??
      null;
    const missing = [];
    if (!id_session) missing.push("id_session");
    if (!fallbackUser?.id_user) missing.push("id_user");
    if (!currentQuestion?.id_question) missing.push("id_question");
    if (!id_question_instance) missing.push("id_question_instance");
    if (missing.length) {
      appendMessage(
        "assistant",
        `<strong>${t("interviewer.label")}:</strong> Faltan campos obligatorios: ${missing.join(", ")}.`,
      );
      setChatBusy(false);
      return;
    }

    try {
      let resolvedText = answerText || "";

      if (!skipRemote || audioBlob) {
        const payload = buildN8nAnswerPayload({
          id_session,
          id_question_instance,
          id_user: fallbackUser?.id_user ?? null,
          order_num: session.currentIndex + 1,
          id_question: currentQuestion?.id_question ?? null,
          pregunta: currentQuestion?.question_text ?? "",
          texto: answerText || "",
          audio: null,
          mode: audioBlob ? "transcribe" : "evaluate",
        });

        console.log("[n8n] Enviando payload a n8n", {
          ...payload,
          hasAudio: Boolean(audioBlob),
          audioSize: audioBlob?.size || 0,
        });

        // Skip individual n8n calls - use local scoring
        console.log("[n8n] Skipping individual n8n call - using local scoring only");
        
        // Calculate local score
        let resolvedText = answerText || "";
        const fallbackMetrics = buildFallbackMetrics(resolvedText);
        const pesoLevel = mapDifficultyToPesoLevel(context?.difficulty);
        const weightedScore = calcularPuntaje(fallbackMetrics, pesoLevel);
        
        const response = { 
          texto: resolvedText, 
          puntaje: weightedScore.puntaje, 
          razon: weightedScore.nivel_respuesta, 
          metrics: fallbackMetrics 
        };

        console.log("[n8n] Respuesta recibida de n8n", response);
        resolvedText = response?.texto || answerText || "";
        let metrics = response?.metrics || null;
        if (!metrics || Object.values(metrics).every((v) => v === 0)) {
          metrics = buildFallbackMetrics(resolvedText);
        }
        const weighted = calcularPuntaje(metrics, pesoLevel);

        session.answers[session.currentIndex] = {
          questionId: currentQuestion.id_question,
          id_question_instance,
          answer: resolvedText,
          score: response?.puntaje ?? weighted.puntaje ?? 0,
          razon: response?.razon ?? response?.reason ?? null,
          reason: response?.razon ?? response?.reason ?? null,
          metrics,
          nivel_respuesta: weighted.nivel_respuesta,
          aprobado: weighted.aprobado,
        };
        saveInterviewSession(session);

        // persist answered question
        try {
          await saveQuestionAnswered({
            id_user: fallbackUser?.id_user ?? null,
            id_question_instance,
            answer: resolvedText,
            score: session.answers[session.currentIndex].score ?? 0,
            feedback: session.answers[session.currentIndex].razon ?? session.answers[session.currentIndex].reason ?? "Sin feedback",
            answered_at: new Date().toISOString(),
          });
        } catch (err) {
          console.warn("No se pudo guardar question_answered:", err?.message || err);
        }
      } else {
        // flujo local (skipRemote) sin IA
        const metrics = buildFallbackMetrics(resolvedText);
        const pesoLevel = mapDifficultyToPesoLevel(context?.difficulty);
        const weighted = calcularPuntaje(metrics, pesoLevel);

        session.answers[session.currentIndex] = {
          questionId: currentQuestion.id_question,
          id_question_instance,
          answer: resolvedText,
          score: weighted.puntaje ?? 0,
          razon: null,
          reason: null,
          metrics,
          nivel_respuesta: weighted.nivel_respuesta,
          aprobado: weighted.aprobado,
        };
        saveInterviewSession(session);

        try {
          await saveQuestionAnswered({
            id_user: fallbackUser?.id_user ?? null,
            id_question_instance,
            answer: resolvedText,
            score: session.answers[session.currentIndex].score ?? 0,
            feedback: "Sin feedback",
            answered_at: new Date().toISOString(),
          });
        } catch (err) {
          console.warn("No se pudo guardar question_answered (local):", err?.message || err);
        }
      }

      appendMessage("user", `<strong>${t("you.label")}:</strong> ${resolvedText}`);
    } catch (error) {
      appendMessage(
        "assistant",
        `<strong>${t("interviewer.label")}:</strong> ${error?.message || "No se pudo procesar tu respuesta."}`,
      );
      return;
    } finally {
      setChatBusy(false);
      if (micStatus) {
        micStatus.textContent = "Click para grabar tu respuesta";
      }
    }

    if (session.currentIndex < session.questions.length - 1) {
      session.currentIndex += 1;
      saveInterviewSession(session);
      setTimeout(() => {
        appendQuestion();
      }, 180);
      return;
    }

    await finishInterview();
  }

  closeChatBtn.addEventListener("click", closeChat);
  sendBtn.addEventListener("click", () => {
    void sendAnswer();
  });
  chatInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      void sendAnswer();
    }
  });

  if (micBtn && micStatus) {
    const hasSupport = Boolean(navigator.mediaDevices?.getUserMedia) && typeof MediaRecorder !== "undefined";
    if (!hasSupport) {
      micBtn.disabled = true;
      micStatus.textContent = "Grabación de audio no disponible en este navegador.";
    } else {
      micBtn.addEventListener("click", () => {
        openAudioModal();
      });

      let mediaRecorder = null;
      let chunks = [];
      let isRecording = false;
      let timerInterval = null;
      let elapsedSeconds = 0;

      const updateTimer = () => {
        const minutes = String(Math.floor(elapsedSeconds / 60)).padStart(2, "0");
        const seconds = String(elapsedSeconds % 60).padStart(2, "0");
        if (audioTimer) audioTimer.textContent = `${minutes}:${seconds}`;
      };

      const setMicUi = (state) => {
        if (state === "recording") {
          micBtn.classList.add("is-recording");
          micStatus.textContent = "Grabando... vuelve a presionar para detener";
        } else if (state === "processing") {
          micBtn.classList.remove("is-recording");
          micBtn.classList.add("is-busy");
          micStatus.textContent = "Procesando audio...";
        } else {
          micBtn.classList.remove("is-recording", "is-busy");
          micStatus.textContent = "Click para grabar tu respuesta";
        }
      };

      const startRecording = async () => {
        if (isRecording) {
          mediaRecorder?.stop();
          return;
        }

        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          chunks = [];
          mediaRecorder = new MediaRecorder(stream);
          elapsedSeconds = 0;
          updateTimer();
          if (audioIndicator) audioIndicator.classList.add("is-recording");
          if (audioStatus) audioStatus.textContent = "Grabando...";
          if (audioRecordBtn) audioRecordBtn.disabled = true;
          if (audioStopBtn) audioStopBtn.disabled = false;
          if (audioSendBtn) audioSendBtn.disabled = true;

          mediaRecorder.addEventListener("dataavailable", (event) => {
            if (event.data && event.data.size > 0) {
              chunks.push(event.data);
            }
          });

          mediaRecorder.addEventListener("stop", async () => {
            stream.getTracks().forEach((track) => track.stop());
            isRecording = false;
            if (timerInterval) clearInterval(timerInterval);
            if (audioIndicator) audioIndicator.classList.remove("is-recording");
            if (audioStatus) audioStatus.textContent = "Audio listo para enviar";
            if (audioRecordBtn) audioRecordBtn.disabled = false;
            if (audioStopBtn) audioStopBtn.disabled = true;
            if (audioSendBtn) audioSendBtn.disabled = false;
          });

          isRecording = true;
          mediaRecorder.start();
          timerInterval = setInterval(() => {
            elapsedSeconds += 1;
            updateTimer();
          }, 1000);
        } catch (error) {
          appendMessage(
            "assistant",
            `<strong>${t("interviewer.label")}:</strong> No se pudo acceder al micrófono.`,
          );
          closeAudioModal();
        }
      };

      const stopRecording = () => {
        if (!isRecording) return;
        mediaRecorder?.stop();
      };

      const sendRecording = async () => {
        if (!chunks.length) return;
        if (audioStatus) audioStatus.textContent = "Enviando audio...";
        if (audioSendBtn) audioSendBtn.disabled = true;
        const blob = new Blob(chunks, { type: mediaRecorder?.mimeType || "audio/webm" });
        await submitAnswer({ answerText: chatInput.value.trim(), audioBlob: blob, skipRemote: false });
        closeAudioModal();
      };

      audioRecordBtn?.addEventListener("click", startRecording);
      audioStopBtn?.addEventListener("click", stopRecording);
      audioSendBtn?.addEventListener("click", sendRecording);
    }
  }

  document.addEventListener("interview:start", (event) => {
    void startInterview(event.detail);
  });

  document.addEventListener("i18n:change", () => {
    applyTranslations(document);
  });
});
