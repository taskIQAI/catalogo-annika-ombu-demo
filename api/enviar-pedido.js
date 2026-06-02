// Destino temporal de prueba. Cambiar a adm@annika.com.ar cuando el dominio quede verificado en Resend.
const DESTINATION_EMAIL = "processia.us@gmail.com";
const DEFAULT_FROM_EMAIL = "Annika Catálogo <onboarding@resend.dev>";
const MAX_LOGO_BYTES = 4 * 1024 * 1024;

function parseLogo(dataUrl) {
  if (!dataUrl) return null;
  const match = dataUrl.match(/^data:(image\/(?:png|jpeg|jpg|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!match) throw new Error("El logo debe ser una imagen PNG, JPG o WEBP.");
  const extension = match[1].includes("png") ? "png" : match[1].includes("webp") ? "webp" : "jpg";
  const content = match[2];
  if (Buffer.byteLength(content, "base64") > MAX_LOGO_BYTES) {
    throw new Error("El logo supera el máximo permitido de 4 MB.");
  }
  return { content, filename: `logo-empresa.${extension}` };
}

module.exports = async function handler(request, response) {
  if (request.method !== "POST") {
    return response.status(405).json({ error: "Método no permitido." });
  }
  if (!process.env.RESEND_API_KEY) {
    return response.status(500).json({ error: "Falta configurar RESEND_API_KEY en Vercel." });
  }

  try {
    const { dealerName, contactName, buyerPhone, buyerEmail, notes, logo, message } = request.body || {};
    if (!dealerName || !contactName || !buyerPhone || !message) {
      return response.status(400).json({ error: "Completá empresa, contacto y WhatsApp." });
    }
    const attachment = parseLogo(logo);
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL || DEFAULT_FROM_EMAIL,
        to: [DESTINATION_EMAIL],
        reply_to: buyerEmail || undefined,
        subject: `Pedido catálogo Ombú - ${dealerName}`,
        text: `${message}\n\nLogo adjunto: ${attachment ? "Sí" : "No"}`,
        attachments: attachment ? [attachment] : undefined,
        headers: { "X-Annika-Catalogo": "ombu" }
      })
    });
    const result = await resendResponse.json().catch(() => ({}));
    if (!resendResponse.ok) {
      return response.status(502).json({ error: result.message || "Resend rechazó el envío." });
    }
    return response.status(200).json({ ok: true, id: result.id, notes: notes || "" });
  } catch (error) {
    return response.status(400).json({ error: error.message || "No se pudo enviar el pedido." });
  }
};

