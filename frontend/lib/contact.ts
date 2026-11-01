export const PHONE_DISPLAY = "+53 50667554";
export const PHONE_TEL = "+5350667554";
export const WHATSAPP_NUMBER = "5350667554";
export const ADDRESS = "Calle 3ra entre 24 y 26, Miramar";
export const INSTAGRAM_HANDLE = "@origen_cuba";
export const INSTAGRAM_URL = "https://www.instagram.com/origen_cuba/";

export function whatsappUrl(message: string): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}
