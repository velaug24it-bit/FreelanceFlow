import axios from 'axios';

export const API_URL = (process.env.REACT_APP_API_URL || 'http://localhost:5000/api').replace(/\/$/, '');
export const API_ORIGIN = API_URL.replace(/\/api$/, '');
export const SOCKET_URL = (
  process.env.REACT_APP_SOCKET_URL ||
  process.env.REACT_APP_SERVER_URL ||
  API_ORIGIN
).replace(/\/$/, '');

axios.defaults.baseURL = API_ORIGIN;

export default axios;
