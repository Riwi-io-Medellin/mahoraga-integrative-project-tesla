import { applyTranslations, t } from "./services/i18n.js";
import {
  clearInterviewSession,
  createInterviewSession,
  evaluateInterviewSession,
  fetchInterviewQuestions,
  saveInterviewQuestionInstances,
  saveInterviewContext,
  saveInterviewSession,
} from "./services/interviewService.js";
import {
  getInterviewLanguagePreference,
  getLoggedInUser,
  requireLoggedInUser,
} from "./services/sessionService.js";
import { buildN8nAnswerPayload, ensureInterviewSessionId, sendN8nAnswer } from "./services/n8nBridge.js";

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
      saveInterviewSession(session);
      if (session.sessionId) {
        await saveInterviewQuestionInstances({
          id_session: session.sessionId,
          questions,
        });
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
    try {
      const user = getLoggedInUser();
      const ensured = await ensureInterviewSessionId({ context, user });
      const id_session = ensured?.id_session || session?.sessionId || null;

      if (id_session) {
        const respuestas = session.questions.map((question, index) => {
          const entry = session.answers[index] || {};
          return {
            pregunta: question?.question_text ?? "",
            respuesta: entry.answer ?? "",
            puntaje: entry.score ?? entry.puntaje ?? 0,
            razon: entry.reason ?? entry.razon ?? "",
          };
        });

        const payload = {
          id_session,
          id_user: user?.id_user ?? null,
          is_final: true,
          respuestas,
        };

        detailed = await sendN8nAnswer({ payload });
      }
    } catch (error) {
      console.error("No se pudo obtener feedback detallado de n8n:", error);
    }

    renderDetailedInterviewSummary({ detailed, summary, session });
    return;

    appendMessage(
      "assistant",
      `<strong>${t("interviewer.label")}:</strong> Resultado: ${summary.score} pts • ${summary.estimatedLevel}.`,
    );
    appendMessage("assistant", summary.feedback);
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
    const feedbackText = detailed?.feedback || summary?.feedback || "";
    const preguntas = Array.isArray(detailed?.preguntas) ? detailed.preguntas : [];

    const preguntasHtml = preguntas.length
      ? preguntas
          .map(
            (item, index) => `
            <div class="feedback-question">
              <strong>${item?.pregunta || `Pregunta ${index + 1}`}</strong>
              <div>Puntaje: ${item?.puntaje ?? 0}/1</div>
              <div>Razón: ${item?.razon || "Sin detalle."}</div>
              <div>${item?.descripcion || "Sin descripción adicional."}</div>
            </div>
          `,
          )
          .join("")
      : session.questions
          .map((question, index) => {
            const entry = session.answers[index] || {};
            return `
              <div class="feedback-question">
                <strong>${question?.question_text || `Pregunta ${index + 1}`}</strong>
                <div>Puntaje: ${entry?.score ?? 0}/1</div>
                <div>Razón: ${entry?.reason || "Sin detalle."}</div>
                <div>Respuesta: ${entry?.answer || ""}</div>
              </div>
            `;
          })
          .join("");

    chatFeedback.innerHTML = `
      <h3 class="feedback-title">Feedback final de la entrevista</h3>
      <div class="feedback-summary">
        <div class="feedback-meta">
          <span>Resultado final: ${scoreLabel}/100</span>
          <span>Preguntas: ${session.questions.length}</span>
        </div>
        <p>${feedbackText || "No fue posible obtener feedback detallado de IA. Se muestra resumen local."}</p>
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
      <div class="feedback-block">
        <strong>Detalle por pregunta</strong>
        ${preguntasHtml}
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
    await submitAnswer({ answerText: text, audioBlob: null, skipRemote: true });
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
      session?.questionInstances?.[session.currentIndex]?.id_question_instance ??
      session.currentIndex + 1;
    const missing = [];
    if (!id_session) missing.push("id_session");
    if (!fallbackUser?.id_user) missing.push("id_user");
    if (!currentQuestion?.id_question) missing.push("id_question");
    if (!(session.currentIndex + 1)) missing.push("order_num");
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

        const response = await sendN8nAnswer({ payload, audioBlob });
        resolvedText = response?.texto || answerText || "";
      }

      appendMessage("user", `<strong>${t("you.label")}:</strong> ${resolvedText}`);

      session.answers[session.currentIndex] = {
        questionId: currentQuestion.id_question,
        answer: resolvedText,
      };
      saveInterviewSession(session);
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
