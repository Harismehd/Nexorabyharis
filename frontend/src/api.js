import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
});

api.interceptors.request.use(config => {
  const gymKey = localStorage.getItem('gymKey');
  if (gymKey) {
    config.headers['x-gym-key'] = gymKey;
  }
  return config;
});

export default api;
