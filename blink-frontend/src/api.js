// Thin fetch wrapper around the Blink backend (see ../blink-server).
// Every function here returns parsed JSON or throws an Error with a
// human-readable message pulled from the API's { error } field.

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    signal: options.signal || AbortSignal.timeout(8000),
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    // Some endpoints (e.g. DELETE) return no body — that's fine.
  }

  if (!res.ok) {
    const err = new Error((data && data.error) || `Request failed (${res.status})`);
    if (data) err.data = data;
    throw err;
  }
  return data;
}

export function fetchCourses(params = {}) {
  const query = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== ""))
  ).toString();
  return request(`/api/courses${query ? `?${query}` : ""}`);
}

export function fetchPopularCourses() {
  return request("/api/courses/popular");
}

export function trackCourseClick(courseId, token = null) {
  if (!courseId) return Promise.resolve();
  const headers = { "Content-Type": "application/json" };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return request(`/api/courses/${encodeURIComponent(courseId)}/click`, {
    method: "POST",
    headers,
  }).catch((err) => {
    console.warn("Click tracking note:", err.message);
  });
}

export function signup({ name, email, password }) {
  return request("/api/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password }),
  });
}

export function login({ email, password }) {
  return request("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
}

export function googleAuth(payload) {
  return request("/api/auth/google", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function fetchProfile(token) {
  return request("/api/profile", {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function updateProfile(token, updates) {
  return request("/api/profile", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(updates),
  });
}

export function sendChatMessage(message, history = []) {
  return request("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, history }),
    signal: AbortSignal.timeout(25000),
  });
}

export function fetchChatStatus() {
  return request("/api/chat/status");
}

export function fetchDomains() {
  return request("/api/domains");
}

export function fetchDomain(slug) {
  return request(`/api/domains/${encodeURIComponent(slug)}`);
}
