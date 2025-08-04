import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

import mysql from 'mysql2/promise';

export const lambdaHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {

        const query = 'SELECT * FROM vs_t_log_autorizaciones LIMIT 5';
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            port: parseInt(process.env.DB_PORT || '3307'),
            user: process.env.DB_USER,
            password: process.env.DB_PASS,
            database: process.env.DB_NAME,
            
        });
        
        const [rows] = await connection.execute(query);
        console.log('Resultados de la consulta:', rows);
        await connection.end();
        return {
            statusCode: 200,
            body: JSON.stringify({
                succes: true,
                message: rows
            }),

        };
    } catch (err) {
        console.log(err);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'some error happened',
            }),
        };
    }
};
