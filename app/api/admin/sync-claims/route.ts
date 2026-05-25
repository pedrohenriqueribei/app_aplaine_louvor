import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Acesso negado. Token não fornecido." }, { status: 403 });
    }

    const token = authHeader.split("Bearer ")[1];
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(token);
    } catch (err: any) {
      return NextResponse.json({ error: "Acesso negado. Token inválido." }, { status: 403 });
    }

    // Permite se for super_admin ou o email principal
    if (decodedToken.super_admin !== true && decodedToken.email !== 'pedrohenriqueribei@gmail.com') {
      return NextResponse.json({ error: "Acesso negado. Apenas super administradores podem executar esta ação." }, { status: 403 });
    }

    let pageToken;
    const fixedUsers = [];
    
    // Lista todos os usuários. Em produção, se houver muitos usuários, usar paginação.
    do {
      const listUsersResult = await adminAuth.listUsers(1000, pageToken);
      pageToken = listUsersResult.pageToken;

      for (const userRecord of listUsersResult.users) {
        const userDocRef = adminDb.collection("users").doc(userRecord.uid);
        const userDoc = await userDocRef.get();
        const userData = userDoc.exists ? userDoc.data() : null;

        const isSuperAdminEmail = userRecord.email === 'pedrohenriqueribei@gmail.com';
        const hasFirestoreSuperAdminRole = userData?.role === 'super_admin';
        const isSuperAdminInFirestore = hasFirestoreSuperAdminRole || isSuperAdminEmail;
        const hasAuthSuperAdminClaim = userRecord.customClaims?.super_admin === true;

        // Se deveria ser super_admin (email do dono ou role na coleção users) e não tem a claim
        if (isSuperAdminInFirestore && !hasAuthSuperAdminClaim) {
          await adminAuth.setCustomUserClaims(userRecord.uid, {
            ...userRecord.customClaims,
            super_admin: true,
          });

          if (userData && userData.role !== 'super_admin') {
            await userDocRef.update({ role: 'super_admin' });
          }

          fixedUsers.push({ email: userRecord.email, uid: userRecord.uid, action: 'granted' });
        } 
        // Se NÃO deveria ser super admin (nenhuma das condições acima aplica) mas TEM a claim
        else if (!isSuperAdminInFirestore && hasAuthSuperAdminClaim) {
          const newClaims = { ...userRecord.customClaims };
          delete newClaims.super_admin;
          // Se as claims ficarem vazias, enviamos null para remover todas, ou o objeto vazio
          await adminAuth.setCustomUserClaims(userRecord.uid, newClaims);
          
          if (userData && userData.role === 'super_admin') {
            await userDocRef.update({ role: 'member' });
          }

          fixedUsers.push({ email: userRecord.email, uid: userRecord.uid, action: 'revoked' });
        }
      }
    } while (pageToken);

    return NextResponse.json({
      message: "Verificação e correção de Custom Claims concluída.",
      details: fixedUsers,
      totalFixes: fixedUsers.length
    });

  } catch (error: any) {
    console.error("Erro ao sincronizar claims:", error);
    return NextResponse.json(
      { error: "Ocorreu um erro ao sincronizar as claims.", details: error.message },
      { status: 500 }
    );
  }
}
