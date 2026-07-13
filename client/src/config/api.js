import axios from 'axios';

let rawApiUrl = (process.env.REACT_APP_API_URL || 'http://localhost:5000/api').trim();
if (rawApiUrl.startsWith('REACT_APP_API_URL=')) {
  rawApiUrl = rawApiUrl.substring('REACT_APP_API_URL='.length).trim();
}
rawApiUrl = rawApiUrl.replace(/^['"`]|['"`]$/g, '').replace(/\/$/, '');

export const API_URL = rawApiUrl;
export const API_ORIGIN = API_URL.replace(/\/api$/, '');
export const SOCKET_URL = (
  process.env.REACT_APP_SOCKET_URL ||
  process.env.REACT_APP_SERVER_URL ||
  API_ORIGIN
).replace(/\/$/, '');

axios.defaults.baseURL = API_ORIGIN;

export default axios;
