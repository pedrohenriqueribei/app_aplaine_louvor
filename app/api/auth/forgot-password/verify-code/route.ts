import { NextRequest, NextResponse } from "next/server";
import { getResetRecord, updateResetRecord } from "@/lib/passwordResetStore";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, code } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Endereço de e-mail é obrigatório." },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = String(code || "").trim();

    if (cleanCode.length !== 6 || !/^\d{6}$/.test(cleanCode)) {
      return NextResponse.json(
        { error: "O código deve conter exatamente 6 dígitos numéricos." },
        { status: 400 }
      );
    }

    const resetData = await getResetRecord(cleanEmail);

    if (!resetData) {
      return NextResponse.json(
        { error: "Nenhum código de recuperação ativo encontrado. Solicite um novo código." },
        { status: 404 }
      );
    }

    const now = Date.now();

    // Check if already used
    if (resetData.used === true) {
      return NextResponse.json(
        { error: "Este código já foi utilizado para redefinir uma senha. Solicite um novo código." },
        { status: 400 }
      );
    }

    // Check expiration (15 minutes)
    if (resetData.expiresAt && now > resetData.expiresAt) {
      return NextResponse.json(
        { error: "O código de recuperação expirou (validade de 15 minutos). Por favor, solicite um novo código." },
        { status: 400 }
      );
    }

    // Check code match
    if (resetData.code !== cleanCode) {
      const currentAttempts = (resetData.attempts || 0) + 1;
      await updateResetRecord(cleanEmail, { attempts: currentAttempts });

      if (currentAttempts >= 5) {
        await updateResetRecord(cleanEmail, { used: true });
        return NextResponse.json(
          { error: "Limite de tentativas excedido (5 tentativas). Por segurança, solicite um novo código de recuperação." },
          { status: 429 }
        );
      }

      const remainingAttempts = 5 - currentAttempts;
      return NextResponse.json(
        {
          error: `Código incorreto. Verifique os 6 dígitos digitados (${remainingAttempts} tentativa${remainingAttempts === 1 ? "" : "s"} restante${remainingAttempts === 1 ? "" : "s"}).`,
          remainingAttempts,
        },
        { status: 400 }
      );
    }

    // Code is valid! Issue single-use reset authorization token
    const resetToken = crypto.randomUUID();
    const resetTokenExpiresAt = now + 10 * 60 * 1000; // 10 minutes to complete password creation

    await updateResetRecord(cleanEmail, {
      verified: true,
      resetToken,
      resetTokenExpiresAt,
    });

    console.log(
      `[APPLANE - RECUPERAÇÃO DE SENHA] Código validado com sucesso para ${cleanEmail}`
    );

    return NextResponse.json({
      success: true,
      message: "Código validado com sucesso! Prossiga para criar sua nova senha.",
      resetToken,
    });
  } catch (error: any) {
    console.error("Erro ao validar código de redefinição de senha:", error);
    return NextResponse.json(
      { error: "Erro interno no servidor ao validar o código." },
      { status: 500 }
    );
  }
}
