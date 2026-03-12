import {
  consultationQuestion as consultationQuestionRepo,
  createQuestion as createQuestionRepo,
  getInterviewQuestions as getInterviewQuestionsRepo,
  updateQuestion as updateQuestionRepo,
  getQuestionByLevel as getQuestionByLevelRepo,
  newInterviewQuestion as newInterviewQuestionRepo,
  newQuestionAnswered as newQuestionAnsweredRepo
} from './question.repository.js'

export const consultationQuestion = async () => consultationQuestionRepo()

export const createQuestion = async (payload) => createQuestionRepo(payload)

export const getInterviewQuestions = async (filters) => getInterviewQuestionsRepo(filters)

export const updateQuestion = async (id_question, id_topic, id_level, translations) => {
  return updateQuestionRepo(id_question, id_topic, id_level, translations)}

export const getQuestionByLevel = async (id_level, id_topic, id_language) =>
  getQuestionByLevelRepo(id_level, id_topic, id_language)

export const newInterviewQuestion = async (id_session, id_question) =>{
  return newInterviewQuestionRepo(id_session, id_question)
}

export const newQuestionAnswered = async(id_user, answer, score, feedback, answered_at) => {
  return newQuestionAnsweredRepo(id_user, answer, score, feedback, answered_at)
}
