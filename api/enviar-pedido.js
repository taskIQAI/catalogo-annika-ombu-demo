const DESTINATION_EMAIL = "adm@annika.com.ar";
const DEFAULT_FROM_EMAIL = "Annika Catálogo <onboarding@resend.dev>";

module.exports = async function handler(request, response) {
  if (request.method !== "POST") {
    return response.status(405).json({ error: "Método no permitido." });
  }
  if (!process.env.RESEND_API_KEY) {
    return response.status(500).json({ error: "Falta configurar RESEND_API_KEY en Vercel." });
  }

  try {
    const { dealerName, contactName, buyerPhone, buyerEmail, notes, message } = request.body || {};
    if (!dealerName || !contactName || !buyerPhone || !message) {
      return response.status(400).json({ error: "Completá empresa, contacto y WhatsApp." });
    }
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
        text: `${message}\n\nEl logo del concesionario se envía manualmente por WhatsApp cuando corresponda.`,
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
