import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";

export async function POST(req: NextRequest) {
  try {
    // Basic verification: Check if caller is super_admin OR provided the setup secret
    const authHeader = req.headers.get("Authorization");
    const setupSecret = req.headers.get("X-Setup-Secret");
    
    let isAuthorized = false;

    if (setupSecret && process.env.ADMIN_SETUP_SECRET && setupSecret === process.env.ADMIN_SETUP_SECRET) {
      isAuthorized = true;
    } else if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.split("Bearer ")[1];
      try {
        const decodedToken = await adminAuth.verifyIdToken(token);
        if (decodedToken.super_admin === true) {
          isAuthorized = true;
        }
      } catch (err) {
        console.error("Token verification failed", err);
      }
    }

    if (!isAuthorized) {
      return NextResponse.json(
        { error: "Acesso negado. Apenas super_admins podem realizar esta ação." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { email, uid } = body;

    if (!email && !uid) {
      return NextResponse.json(
        { error: "É necessário informar o email ou o uid do usuário." },
        { status: 400 }
      );
    }

    let user;
    if (uid) {
      user = await adminAuth.getUser(uid);
    } else {
      user = await adminAuth.getUserByEmail(email);
    }

    // Define a Custom Claim 'super_admin' como true
    await adminAuth.setCustomUserClaims(user.uid, {
      ...user.customClaims,
      super_admin: true,
    });

    return NextResponse.json({
      message: `Permissão de super_admin concedida com sucesso para ${user.email} (${user.uid})`,
      success: true,
    });
  } catch (error: any) {
    console.error("Erro ao definir super_admin:", error);
    return NextResponse.json(
      { error: "Falha ao definir permissão.", details: error.message },
      { status: 500 }
    );
  }
}
