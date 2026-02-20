/**
 * ESM shim — exposes the host app's axios to dynamic widgets.
 */
const axios = window.__SHARED_AXIOS__;
export default axios;
export const { get, post, put, patch, delete: del, request, create, isAxiosError } = axios || {};
