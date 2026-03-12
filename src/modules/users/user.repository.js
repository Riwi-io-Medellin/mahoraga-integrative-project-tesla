import { pool } from '../../config/db.config.js'


export const getUsers = async () =>{
    const query = `
    select * from "user"`
    try {
        const response = await pool.query(query);
        return response.rows
    }catch(error){
        console.log(`Error, data could not be found`)
        throw error
    }
}


export const createUsers = async (user_name, email, password, user_status, id_language, id_level) => {
    const query = `
    INSERT INTO "user"
    (User_name, email, password, user_status, id_language, id_level)
    VALUES ($1, $2, crypt($3, gen_salt('bf')), $4, $5, $6)
    RETURNING *`;
    const values = [user_name, email, password, user_status, id_language, id_level];

    const insertProgressQuery = `
    INSERT INTO user_topic_progress (
        id_user,
        id_topic,
        id_asinated_level,
        is_unlocked,
        is_completed,
        score_best,
        attempt_count
    )
    SELECT
        $1,
        t.id_topic,
        l.id_asinated_level,
        CASE WHEN l.id_asinated_level = 1 THEN true ELSE false END,
        false,
        0,
        0
    FROM topic t
    JOIN asinated_level l ON l.id_asinated_level = 1`;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const response = await client.query(query, values);
        const newUser = response.rows[0];
        await client.query(insertProgressQuery, [newUser.id_user]);
        await client.query('COMMIT');
        return newUser;
    } catch (error) {
        await client.query('ROLLBACK');
        console.error(`error: user not created: ${error}`);
        throw error;
    } finally {
        client.release();
    }
}


export const loginUserQuery = async (l_login, l_password)=>{
    const query = `
    SELECT id_user, user_name, email, user_status, id_language, id_level
    FROM "user"
    WHERE (LOWER(email) = LOWER($1) OR LOWER(user_name) = LOWER($1))
      AND (
        (password LIKE '$2%' AND password = crypt($2, password))
        OR (password NOT LIKE '$2%' AND password = $2)
      )
    LIMIT 1
    `
    const values = [l_login, l_password]

    try {
        const response = await pool.query(query, values)
        return response.rows[0] ?? null
    }catch (error){
        console.error(`error, data cannot be accessed`);
        throw error;
    }
}
