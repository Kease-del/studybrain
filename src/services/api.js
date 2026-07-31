const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api"

async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`

  const config = {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  }

  const response = await fetch(url, config)
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`)
  }
  return await response.json()
}

export const api = {
  get: (endpoint) => request(endpoint, { method: "GET" }),
  post: (endpoint, data) =>
    request(endpoint, { method: "POST", body: JSON.stringify(data) }),
  put: (endpoint, data) =>
    request(endpoint, { method: "PUT", body: JSON.stringify(data) }),
  delete: (endpoint) => request(endpoint, { method: "DELETE" }),
}
