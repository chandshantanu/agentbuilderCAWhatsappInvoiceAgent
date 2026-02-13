/**
 * API client for the agent dashboard.
 *
 * All calls go to the same origin (nginx proxies to runtime at 127.0.0.1:8080).
 * Auth token is injected from AuthContext.
 */

import axios from 'axios';

const apiClient = axios.create({
  baseURL: '',
  headers: { 'Content-Type': 'application/json' },
});

let _authToken: string | null = null;

export function setAuthToken(token: string | null) {
  _authToken = token;
  if (token) {
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete apiClient.defaults.headers.common['Authorization'];
  }
}

export function getAuthToken(): string | null {
  return _authToken;
}

export { apiClient };
