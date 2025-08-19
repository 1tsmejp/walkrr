import pkg from 'pg';
const { Pool } = pkg;

const {
  POSTGRES_USER = 'pupwalks',
  POSTGRES_PASSWORD = 'pupwalks',
  POSTGRES_DB = 'pupwalks',
  POSTGRES_HOST = 'db',
  POSTGRES_PORT = 5432
} = process.env;

export const pool = new Pool({
  user: POSTGRES_USER,
  password: POSTGRES_PASSWORD,
  database: POSTGRES_DB,
  host: POSTGRES_HOST,
  port: Number(POSTGRES_PORT)
});
