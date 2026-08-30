/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_XIANYU_MEMBERSHIP_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
