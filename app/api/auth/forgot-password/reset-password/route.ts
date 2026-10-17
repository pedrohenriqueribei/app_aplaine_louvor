import { NextRequest, NextResponse } from "next/server";
import { getResetRecord, updateResetRecord, applyPasswordUpdate } from "@/lib/passwordResetStore";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, resetToken, newPassword, confirmPassword } = body;

    if (!email || !resetToken || !newPassword || !confirmPassword) {
      return NextResponse.json(
        { error: "Todos os campos são obrigatórios." },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();

    // 1. Password confirmation check
    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { error: "A confirmação da senha não coincide com a nova senha digitada." },
        { status: 400 }
      );
    }

    // 2. Password security requirements: min 8 characters, letters and numbers
    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: "A nova senha deve ter no mínimo 8 caracteres." },
        { status: 400 }
      );
    }

    const hasLetter = /[a-zA-Z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);

    if (!hasLetter || !hasNumber) {
      return NextResponse.json(
        { error: "A senha deve conter uma combinação de letras e números para sua segurança." },
        { status: 400 }
      );
    }

    // 3. Locate reset record
    const resetData = await getResetRecord(cleanEmail);

    if (!resetData) {
      return NextResponse.json(
        { error: "Solicitação de redefinição não encontrada. Inicie o processo novamente." },
        { status: 400 }
      );
    }

    const now = Date.now();

    if (resetData.used === true) {
      return NextResponse.json(
        { error: "Este código ou autorização já foi utilizado. Solicite um novo código." },
        { status: 400 }
      );
    }

    if (resetData.verified !== true) {
      return NextResponse.json(
        { error: "O código numérico ainda não foi validado. Por favor, valide o código de 6 dígitos primeiro." },
        { status: 403 }
      );
    }

    if (!resetData.resetToken || resetData.resetToken !== resetToken) {
      return NextResponse.json(
        { error: "Token de autorização inválido ou expirado. Inicie uma nova recuperação." },
        { status: 403 }
      );
    }

    if (resetData.resetTokenExpiresAt && now > resetData.resetTokenExpiresAt) {
      return NextResponse.json(
        { error: "O tempo para definir a nova senha expirou (10 minutos após validação). Solicite um novo código." },
        { status: 400 }
      );
    }

    // 4. Apply password update (hashes with bcrypt, updates Firebase Auth and Firestore user doc)
    await applyPasswordUpdate(cleanEmail, newPassword, resetData.userId);

    // 5. Invalidate the reset record permanently
    await updateResetRecord(cleanEmail, {
      used: true,
      resetToken: null,
      usedAt: now,
    });

    console.log(
      `[APPLANE - RECUPERAÇÃO DE SENHA] Senha alterada com sucesso com hash bcrypt seguro para ${cleanEmail}`
    );

    return NextResponse.json({
      success: true,
      message: "Senha alterada com sucesso! Faça login com sua nova senha.",
    });
  } catch (error: any) {
    console.error("Erro ao redefinir nova senha:", error);
    return NextResponse.json(
      { error: "Erro interno no servidor ao atualizar a senha." },
      { status: 500 }
    );
  }
}
