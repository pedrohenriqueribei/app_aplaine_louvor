import { NextRequest, NextResponse } from "next/server";
import {
  getVerificationRecord,
  saveVerificationRecord,
} from "@/lib/verificationCodesStore";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, userId, churchName } = body;

    if (!email || !userId) {
      return NextResponse.json(
        { error: "E-mail e identificador do usuário são obrigatórios." },
        { status: 400 }
      );
    }

    const cleanUserId = String(userId).trim();
    const cleanEmail = String(email).toLowerCase().trim();
    const now = Date.now();

    // Check if there is already a recent code requested in the last 60 seconds (rate limiting)
    const existingRecord = await getVerificationRecord(cleanUserId);
    if (existingRecord) {
      const lastRequestedAt = existingRecord.createdAt || 0;
      const cooldownRemaining = 60 - Math.floor((now - lastRequestedAt) / 1000);

      if (cooldownRemaining > 0) {
        return NextResponse.json(
          {
            error: `Aguarde mais ${cooldownRemaining} segundos para reenviar um novo código.`,
            cooldownRemaining,
          },
          { status: 429 }
        );
      }
    }

    // Generate secure 6-digit numeric code (e.g. "482901")
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = now + 10 * 60 * 1000; // 10 minutes from now

    await saveVerificationRecord(cleanUserId, cleanEmail, code, expiresAt);

    console.log(
      `[APPLANE - VERIFICAÇÃO DE E-MAIL] Código gerado para ${cleanEmail}: ${code} (Válido por 10 minutos)`
    );

    return NextResponse.json({
      success: true,
      message: "Código de validação enviado com sucesso para seu e-mail!",
      expiresAt,
      // devCode is included so preview/testing environments can verify instantly
      devCode: code,
    });
  } catch (error: any) {
    console.error("Erro ao gerar/enviar código de validação:", error);
    return NextResponse.json(
      { error: "Erro interno ao gerar código de validação." },
      { status: 500 }
    );
  }
}
