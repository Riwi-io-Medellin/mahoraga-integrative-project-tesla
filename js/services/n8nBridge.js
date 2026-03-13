import { API_BASE_URL } from "./apiConfig.js";
import { getLoggedInUser } from "./sessionService.js";
import { getInterviewContext, getInterviewSession } from "./interviewService.js";

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
