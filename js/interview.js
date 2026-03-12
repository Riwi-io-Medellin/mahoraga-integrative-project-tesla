import { applyTranslations, t } from "./services/i18n.js";
import {
  clearInterviewSession,
  evaluateInterviewSession,
  fetchInterviewQuestions,
  saveInterviewContext,
  saveInterviewSession,
} from "./services/interviewService.js";
import {
  getInterviewLanguagePreference,
  getLoggedInUser,
  requireLoggedInUser,
} from "./services/sessionService.js";

document.addEventListener("DOMContentLoaded", () => {
  const chatWorld = document.querySelector("#chatWorld");
  const roadmapWorld = document.querySelector("#roadmapWorld");
  const closeChatBtn = document.querySelector("#closeChatBtn");
  const chatMessages = document.querySelector("#chatMessages");
  const chatInput = document.querySelector("#chatInput");
  const sendBtn = document.querySelector("#chatSendBtn");

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
      const questions = await fetchInterviewQuestions(context);
      session = {
        contextKey: `${context.technology}:${context.topic}:${context.difficulty}`,
        currentIndex: 0,
        questions,
        answers: [],
      };
      saveInterviewSession(session);
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

    appendMessage(
      "assistant",
      `<strong>${t("interviewer.label")}:</strong> Resultado: ${summary.score} pts • ${summary.estimatedLevel}.`,
    );
    appendMessage("assistant", summary.feedback);
  }

  async function sendAnswer() {
    if (!session) return;

    const text = chatInput.value.trim();
    if (!text) return;

    appendMessage("user", `<strong>${t("you.label")}:</strong> ${text}`);

    const currentQuestion = session.questions[session.currentIndex];
    session.answers[session.currentIndex] = {
      questionId: currentQuestion.id_question,
      answer: text,
    };
    saveInterviewSession(session);

    chatInput.value = "";

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

  document.addEventListener("interview:start", (event) => {
    void startInterview(event.detail);
  });

  document.addEventListener("i18n:change", () => {
    applyTranslations(document);
  });
});
