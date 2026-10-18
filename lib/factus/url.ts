// Validación de la URL de Factus. Sin dependencias de la base de datos para poder probarla en unitarias.

/**
 * Solo se aceptan direcciones https de factus.com.co: las credenciales se envían a esta URL,
 * así que un valor equivocado (o malicioso) no debe poder redirigirlas a otro servidor.
 */
export function normalizeFactusUrl(input: string): string {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    throw new Error('La URL no es válida');
  }
  if (url.protocol !== 'https:') throw new Error('La URL debe empezar por https://');
  if (url.hostname !== 'factus.com.co' && !url.hostname.endsWith('.factus.com.co')) {
    throw new Error('Solo se permiten direcciones de factus.com.co');
  }
  if (url.username || url.password || url.search || url.hash || (url.pathname !== '/' && url.pathname !== '')) {
    throw new Error('Escribe solo la dirección base, por ejemplo https://api-sandbox.factus.com.co');
  }
  return url.origin;
}

export function isSandboxUrl(url: string): boolean {
  return url.includes('sandbox');
}
