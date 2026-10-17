import { NextRequest, NextResponse } from "next/server";
import {
  getVerificationRecord,
  updateVerificationRecord,
  markUserVerifiedServer,
} from "@/lib/verificationCodesStore";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, code } = body;

    if (!userId || !code) {
      return NextResponse.json(
        { error: "Identificador do usuário e código de 6 dígitos são obrigatórios." },
        { status: 400 }
      );
    }

    const cleanUserId = String(userId).trim();
    const cleanCode = String(code).trim();
    if (cleanCode.length !== 6 || !/^\d{6}$/.test(cleanCode)) {
      return NextResponse.json(
        { error: "O código deve conter exatamente 6 dígitos numéricos." },
        { status: 400 }
      );
    }

    const codeData = await getVerificationRecord(cleanUserId);

    if (!codeData) {
      return NextResponse.json(
        { error: "Nenhum código de validação ativo encontrado. Solicite um novo código." },
        { status: 404 }
      );
    }

    const now = Date.now();

    if (codeData.used === true) {
      return NextResponse.json(
        { error: "Este código já foi utilizado. Solicite um novo código se necessário." },
        { status: 400 }
      );
    }

    // Check expiration (10 minutes)
    if (codeData.expiresAt && now > codeData.expiresAt) {
      return NextResponse.json(
        { error: "O código informado expirou. Os códigos são válidos por 10 minutos. Solicite um novo código." },
        { status: 400 }
      );
    }

    // Check code match
    if (codeData.code !== cleanCode) {
      const currentAttempts = (codeData.attempts || 0) + 1;
      await updateVerificationRecord(cleanUserId, { attempts: currentAttempts });

      if (currentAttempts >= 5) {
        await updateVerificationRecord(cleanUserId, { used: true });
        return NextResponse.json(
          { error: "Limite de tentativas excedido para este código. Por favor, solicite um novo código." },
          { status: 429 }
        );
      }

      return NextResponse.json(
        { error: `Código incorreto. Verifique os 6 dígitos digitados (${5 - currentAttempts} tentativas restantes).` },
        { status: 400 }
      );
    }

    // Code verified successfully!
    // 1. Update verification record as used
    await updateVerificationRecord(cleanUserId, {
      used: true,
      verifiedAt: now,
    });

    // 2. Mark user as verified in server databases (gracefully handling any IAM limitations)
    await markUserVerifiedServer(cleanUserId);

    console.log(`[APPLANE] E-mail verificado com sucesso para usuário: ${cleanUserId}`);

    return NextResponse.json({
      success: true,
      message: "E-mail confirmado com sucesso!",
    });
  } catch (error: any) {
    console.error("Erro ao validar código de e-mail:", error);
    return NextResponse.json(
      { error: "Erro interno ao validar código de e-mail." },
      { status: 500 }
    );
  }
}
