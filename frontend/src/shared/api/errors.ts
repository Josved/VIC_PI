import axios from 'axios';

type ApiErrorBody = {
  detail?: string;
  message?: string;
};

export function getApiErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError<ApiErrorBody>(error)) {
    const apiMessage = error.response?.data?.detail ?? error.response?.data?.message;
    if (apiMessage) {
      return apiMessage;
    }

    if (error.response?.status) {
      return `Error ${error.response.status}. ${fallback}`;
    }

    if (error.request) {
      return 'No se pudo conectar con el backend. Revisa que FastAPI siga corriendo en http://127.0.0.1:8000.';
    }

    return error.message || fallback;
  }

  return fallback;
}
