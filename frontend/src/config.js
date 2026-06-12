
export const API_URL = import.meta.env.VITE_API_URL || '';
export const WS_URL = import.meta.env.VITE_WS_URL || '';


export const getApiUrl = (endpoint) => {

  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  
  if (API_URL) {

    const baseUrl = API_URL.endsWith('/') ? API_URL.slice(0, -1) : API_URL;
    return `${baseUrl}/${cleanEndpoint}`;
  }
  

  return `/${endpoint}`;
};


export const getWebSocketUrl = (endpoint) => {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  
  if (WS_URL) {
    const baseUrl = WS_URL.endsWith('/') ? WS_URL.slice(0, -1) : WS_URL;
    return `${baseUrl}/${cleanEndpoint}`;
  }
  

  return `ws://${window.location.hostname}:8000/${cleanEndpoint}`;
};

