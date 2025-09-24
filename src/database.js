// Importa a biblioteca necessária.
import pg from 'pg';

// Configura o pool de conexões com o PostgreSQL.
const pool = new pg.Pool({
    connectionString: 'postgresql://postgres.ncabatizzzpxctqsbxpd:Be@chSp0t680@aws-1-sa-east-1.pooler.supabase.com:6543/postgres'
});

// Exporta o pool para ser usado em outros arquivos.
export default pool;
