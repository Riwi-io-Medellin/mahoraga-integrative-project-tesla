import {
    createInterview as createInterviewRepo,
    endInterview as endInterviewRepo
} from "./interview.repository.js";

export const createInterview = async (id_user, id_topic, id_level, session_status, date_ini) => {
    return createInterviewRepo(id_user, id_topic, id_level, session_status, date_ini)
}

export const endInterview = async (id_session, date_fin) => {
    return endInterviewRepo(id_session, date_fin)
}
