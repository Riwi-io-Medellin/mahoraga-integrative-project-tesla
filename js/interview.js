import { applyTranslations, t } from "./services/i18n.js";

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

  function openChat(nodeDetail) {
    clearTimeout(chatClosingTimer);

    const topic = nodeDetail?.node?.title || "Topic";
    chatMessages.innerHTML = `
      <div class="chat-message assistant message-in">
        <strong>${t("interviewer.label")}:</strong> ${t("interviewer.start", { topic })}
      </div>
    `;

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

  function sendAnswer() {
    const text = chatInput.value.trim();
    if (!text) return;

    const userMessage = document.createElement("div");
    userMessage.className = "chat-message user message-in";
    userMessage.innerHTML = `<strong>${t("you.label")}:</strong> ${text}`;
    chatMessages.appendChild(userMessage);

    setTimeout(() => {
      const botMessage = document.createElement("div");
      botMessage.className = "chat-message assistant message-in";
      botMessage.innerHTML =
        `<strong>${t("interviewer.label")}:</strong> ${t("interviewer.next")}`;
      chatMessages.appendChild(botMessage);
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }, 180);

    chatInput.value = "";
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  closeChatBtn.addEventListener("click", closeChat);
  sendBtn.addEventListener("click", sendAnswer);
  chatInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      sendAnswer();
    }
  });

  document.addEventListener("interview:start", (event) => {
    openChat(event.detail);
  });

  document.addEventListener("i18n:change", () => {
    applyTranslations(document);
  });
});
