import API from "./api";
import { setAuthToken } from "./authHelper";

API.interceptors.response.use(
  (res) => res,
  async (err) => {
    const originalRequest = err.config;

    if (err.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshRes = await API.post("/auth/refresh");
        const { accessToken } = refreshRes.data;
        setAuthToken(accessToken);

        originalRequest.headers["Authorization"] = `Bearer ${accessToken}`;
        return API(originalRequest);
      } catch (refreshError) {
        setAuthToken(null);
        window.location.href = "/admin-login";
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(err);
  }
);