// Declarações TypeScript para Ghostscript WASM

export interface EmscriptenFS {
  writeFile(path: string, data: Uint8Array | string): void;
  readFile(path: string): Uint8Array;
  readdir(path: string): string[];
  mkdir(path: string): void;
  unlink(path: string): void;
  rmdir(path: string): void;
}

export interface GhostscriptModule {
  FS: EmscriptenFS;
  callMain(args: string[]): number;
}

export interface ModuleConfig {
  locateFile?: (path: string) => string;
  print?: (text: string) => void;
  printErr?: (text: string) => void;
}

export type ModuleFactory = (config?: ModuleConfig) => Promise<GhostscriptModule>;

// Extensão do Window para o Module global
declare global {
  interface Window {
    Module: ModuleFactory;
  }
}

// Opções de conversão
export interface ConvertToImageOptions {
  dpi: 72 | 150 | 300 | 600;
  grayscale?: boolean;
  onProgress?: (current: number, total: number) => void;
}

export interface ConversionResult {
  images: Uint8Array[];
  totalPages: number;
}
