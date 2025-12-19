/// <reference types="vite/client" />

// Declaração de tipo para importar workers via Vite
declare module '*?worker' {
  const WorkerFactory: new () => Worker;
  export default WorkerFactory;
}
