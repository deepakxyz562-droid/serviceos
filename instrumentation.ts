export async function register() {
  // Fix DATABASE_URL for PostgreSQL migration
  // This runs before any other server code
  if (process.env.DATABASE_URL?.startsWith('file:')) {
    process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/serviceos';
    console.log('[instrumentation] Fixed DATABASE_URL to PostgreSQL');
  }
}
