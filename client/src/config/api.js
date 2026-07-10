import axios from 'axios';

export const API_URL = (process.env.REACT_APP_API_URL || 'http://localhost:5000/api').replace(/\/$/, '');
const getApiOrigin = () => {
  let origin = API_URL.replace(/\/api$/, '');
  const isLocal = (host) => {
    return (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host.startsWith('192.168.') ||
      host.startsWith('10.') ||
      host.startsWith('172.') ||
      host.endsWith('.local')
    );
  };
  if (origin.includes('localhost') && typeof window !== 'undefined' && window.location.hostname !== 'localhost' && isLocal(window.location.hostname)) {
    origin = origin.replace('localhost', window.location.hostname);
  }
  return origin;
};
export const API_ORIGIN = getApiOrigin();
export const SOCKET_URL = (
  process.env.REACT_APP_SOCKET_URL ||
  process.env.REACT_APP_SERVER_URL ||
  API_ORIGIN
).replace(/\/$/, '');

axios.defaults.baseURL = API_ORIGIN;

export default axios;
