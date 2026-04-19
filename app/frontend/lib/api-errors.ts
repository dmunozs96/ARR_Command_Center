import axios from "axios";

export function getAPIErrorMessage(error: unknown, fallback = "Ha ocurrido un error inesperado."): string {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail;
    if (typeof detail === "string" && detail.trim()) {
      return detail;
    }
    if (Array.isArray(detail)) {
      const firstMessage = detail
        .map((item) => (typeof item?.msg === "string" ? item.msg : ""))
        .find(Boolean);
      if (firstMessage) {
        return firstMessage;
      }
    }
    if (typeof error.message === "string" && error.message.trim()) {
      return error.message;
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
}

export function getSyncErrorMessage(error: unknown): string {
  const message = getAPIErrorMessage(error, "No se pudo sincronizar con Salesforce.");

  if (message.includes("Missing Salesforce configuration")) {
    return "Falta configurar Salesforce en .env antes de lanzar la sync real.";
  }

  if (message.toLowerCase().includes("timeout")) {
    return "Salesforce no respondio a tiempo. Intenta de nuevo en unos minutos.";
  }

  return message;
}
