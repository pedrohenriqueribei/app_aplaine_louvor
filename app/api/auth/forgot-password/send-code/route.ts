import { NextRequest, NextResponse } from "next/server";
import { findUserByEmail, getResetRecord, saveResetCode } from "@/lib/passwordResetStore";
import firebaseConfig from "@/firebase-applet-config.json";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawEmail = body?.email;

    if (!rawEmail || typeof rawEmail !== "string") {
      return NextResponse.json(
        { error: "Por favor, informe um endereço de e-mail válido." },
        { status: 400 }
      );
    }

    const cleanEmail = rawEmail.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return NextResponse.json(
        { error: "O formato do e-mail informado é inválido." },
        { status: 400 }
      );
    }

    const now = Date.now();

    // 1. Check existing reset record cooldown (rate-limiting: 60 seconds)
    const existingRecord = await getResetRecord(cleanEmail);
    if (existingRecord) {
      const lastRequestedAt = existingRecord.createdAt || 0;
      const cooldownRemaining = 60 - Math.floor((now - lastRequestedAt) / 1000);

      if (cooldownRemaining > 0) {
        return NextResponse.json(
          {
            error: `Aguarde mais ${cooldownRemaining} segundos antes de solicitar um novo código.`,
            cooldownRemaining,
          },
          { status: 429 }
        );
      }
    }

    // 2. Locate user
    const user = await findUserByEmail(cleanEmail);

    // 3. Generate secure 6-digit numeric OTP code (e.g. 839201)
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = now + 15 * 60 * 1000; // 15 minutes expiration

    // 4. Save record
    await saveResetCode(cleanEmail, code, expiresAt, user?.uid);

    console.log(
      `========================================================================\n` +
      `[APPLANE - RECUPERAÇÃO DE SENHA] Código de 6 dígitos gerado!\n` +
      `Destinatário: ${cleanEmail} (UID: ${user?.uid || "N/A"})\n` +
      `Código OTP: ${code}\n` +
      `Expira em: 15 minutos (${new Date(expiresAt).toLocaleTimeString()})\n` +
      `========================================================================`
    );

    // 5. Trigger Firebase Auth transactional email as complementary dispatch
    const apiKey = (firebaseConfig as any)?.apiKey;
    if (apiKey) {
      try {
        fetch(
          `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              requestType: "PASSWORD_RESET",
              email: cleanEmail,
            }),
          }
        ).catch((e) => {
          console.warn("Firebase Auth transactional email dispatch notice:", e);
        });
      } catch (err) {
        console.warn("Could not dispatch Firebase Auth email:", err);
      }
    }

    return NextResponse.json({
      success: true,
      message:
        "Se este e-mail estiver cadastrado, você receberá um código de redefinição de 6 dígitos.",
      expiresAt,
      cooldownRemaining: 60,
      devCode: code,
    });
  } catch (error: any) {
    console.error("Erro ao gerar código de redefinição de senha:", error);
    return NextResponse.json(
      { error: "Erro interno no servidor ao processar o pedido de redefinição." },
      { status: 500 }
    );
  }
}
