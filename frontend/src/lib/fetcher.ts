import { VITE_BACKEND_URL } from "./const";

// 本物のfetchと同じように使える、エンドポイントだけは既定
// 何も方式していないならGET、それ以外はmethodを指定してfetchする
export function fetcher(
	endpoint: string,
	init?: RequestInit,
): Promise<Response> {
	return fetch(`${VITE_BACKEND_URL}${endpoint}`, {
		headers: {
			"Content-Type": "application/json",
			...init?.headers,
		},
		...init,
	});
}

// Typed fetcher for JSON responses
export async function fetcherTyped<T>(
	endpoint: string,
	init?: RequestInit,
): Promise<T> {
	const response = await fetcher(endpoint, init);

	if (!response.ok) {
		throw new Error(`HTTP error! status: ${response.status}`);
	}

	return response.json();
}
