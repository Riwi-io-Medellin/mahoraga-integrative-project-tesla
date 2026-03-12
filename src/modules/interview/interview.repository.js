import { pool } from "../../config/db.config.js";


export const createInterview = async (id_user, id_topic, id_level, session_status, date_ini) => {
    const query = `
    INSERT INTO interview_session (id_user, id_topic, id_level, session_status, date_ini)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *`;
    const values = [id_user, id_topic, id_level, session_status, date_ini];

    try {
        const response = await pool.query(query, values);
        return response.rows[0];
    } catch (error) {
        console.error(`error: interview not created: ${error}`);
        throw error;
    }
}

export const endInterview = async (id_session, date_fin) => {
    const query = `
    UPDATE interview_session
    SET date_fin = $2
    WHERE id_session = $1
    RETURNING *;
    `
    const values = [id_session, date_fin]

    try {
        const res = await pool.query(query, values);
        return res.rows[0];
    }catch (error) {
        console.error(`Error, date not update: ${error}` );
        throw error;
    }
}
