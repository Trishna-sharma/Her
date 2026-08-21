export function buildWhatsAppUrl(message) {
  const WHATSAPP_NUMBER = '8801853314954';
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

