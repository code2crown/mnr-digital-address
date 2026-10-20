import API from "./api";

export function setAuthToken(token, user = null) {
  if (token) {
    API.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    localStorage.setItem("accessToken", token);
    if (user) {
      localStorage.setItem("user", JSON.stringify(user));
    }
  } else {
    delete API.defaults.headers.common["Authorization"];
    localStorage.removeItem("accessToken");
    localStorage.removeItem("user");
  }
}

export function getCurrentUser() {
  try {
    const u = localStorage.getItem("user");
    return u ? JSON.parse(u) : null;
  } catch {
    return null;
  }
}

// Page refresh hone par token auto-attach karne ke liye
const savedToken = localStorage.getItem("accessToken");
if (savedToken) {
  API.defaults.headers.common["Authorization"] = `Bearer ${savedToken}`;
}