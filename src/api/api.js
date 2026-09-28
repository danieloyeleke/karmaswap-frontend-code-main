// import axios from 'axios';

// const api = axios.create({
//   baseURL: 'https://karmaswap.ng/api',
// });

// api.interceptors.request.use((config) => {
//   const token = localStorage.getItem('token');
//   if (token) {
//     config.headers.Authorization = `Bearer ${token}`;
//   }
//   return config;
// });

// export default api;


import axios from 'axios';

// Fallback to production URL, but allow local override via standard React/Vite/Next env variables
const API_BASE_URL = process.env.REACT_APP_API_URL || 
                     process.env.NEXT_PUBLIC_API_URL || 
                     import.meta.env?.VITE_API_URL || 
                     'https://karmaswap.ng/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
