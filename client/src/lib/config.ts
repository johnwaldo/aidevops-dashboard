export const API_BASE = import.meta.env.VITE_API_BASE ?? "";
export const WS_URL = import.meta.env.VITE_WS_URL ?? `ws://${window.location.host}/ws`;
export const USE_MOCK = import.meta.env.VITE_USE_MOCK === "true";
