export interface AppConfig {
  PORT: number;
  LOG_LEVEL: string;
  NODE_ENV: 'development' | 'test' | 'production' | string;
  DATA_STORE?: string;
  DATABASE_URL?: string;
  PGUSER?: string;
  PGHOST?: string;
  PGPASSWORD?: string;
  PGDATABASE?: string;
  PGPORT?: number;
  PG_APP_TABLE_NAME?: string;
  PG_POPULATE_DATABASE?: boolean;
  REDIS_URL?: string;
}

const config: AppConfig = {
  PORT: parseInt(process.env.PORT || '', 10) || 3001,
  NODE_ENV: process.env.NODE_ENV || 'development',
  LOG_LEVEL: process.env.LOG_LEVEL || 'silly',
  DATA_STORE: process.env.DATA_STORE || 'postgres',
  DATABASE_URL: process.env.DATABASE_URL,
  PGUSER: process.env.PGUSER || 'johnjohnson',
  PGHOST: process.env.PGHOST || 'localhost',
  PGPASSWORD: process.env.PGPASSWORD,
  PGDATABASE: 'jot',
  PG_APP_TABLE_NAME: 'app',
  PGPORT: parseInt(process.env.PGPORT || '', 10) || 5432,
  REDIS_URL: process.env.REDIS_URL,
};

export default config;
