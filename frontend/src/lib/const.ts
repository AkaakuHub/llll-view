const rawBackendUrl = import.meta.env.VITE_BACKEND_URL;
const isHttpsContext =
	typeof window !== "undefined" && window.location.protocol === "https:";

export const VITE_BACKEND_URL =
	isHttpsContext && rawBackendUrl.startsWith("http://")
		? "/api"
		: rawBackendUrl;
