// lib/api/client.ts
const RAW_API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

function getCsrfToken(): string | null {
  if (typeof document !== "undefined") {
    const cookies = document.cookie.split(";")
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split("=")
      if (name === "csrftoken") {
        return value
      }
    }
  }
  return null
}

export async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const baseUrl = (RAW_API_BASE_URL || "").replace(/\/+$/, "")
  const normalizedEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`
  // If baseUrl does not end in /api and endpoint does not start with /api, include /api
  const apiPrefix = baseUrl.endsWith("/api") || normalizedEndpoint.startsWith("/api/") ? "" : "/api"
  const url = `${baseUrl}${apiPrefix}${normalizedEndpoint}`

  const config: RequestInit = {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  }

  const csrfToken = getCsrfToken()
  if (csrfToken && ["POST", "PUT", "PATCH", "DELETE"].includes(config.method?.toUpperCase() || "")) {
    config.headers = {
      ...config.headers,
      "X-CSRFToken": csrfToken,
    }
  }

  try {
    const response = await fetch(url, config)

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({ detail: `HTTP error! status: ${response.status}` }));
      throw new Error(errorBody.detail || `HTTP error! status: ${response.status}`);
    }

    if (response.status === 204) {
      return null as T;
    }

    return await response.json()
  } catch (error) {
    console.error("API request failed:", error)
    throw error
  }
}