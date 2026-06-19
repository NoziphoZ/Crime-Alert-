// Temporary ambient declarations for development when packages can't be installed
declare module 'drizzle-orm/postgres-js' {
  export function drizzle(client: any): any
  export type Drizzle = any
}

declare module 'postgres' {
  function postgres(dsn?: string, options?: any): any
  namespace postgres {}
  export default postgres
}
