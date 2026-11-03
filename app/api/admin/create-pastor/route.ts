import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization");
    let callerUid: string | null = null;
    let isAuthorized = false;

    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.split("Bearer ")[1];
      try {
        const decodedToken = await adminAuth.verifyIdToken(token);
        callerUid = decodedToken.uid;

        if (
          decodedToken.super_admin === true ||
          decodedToken.email === "pedrohenriqueribei@gmail.com"
        ) {
          isAuthorized = true;
        } else {
          // Check caller's role in database
          const callerDoc = await adminDb.collection("users").doc(callerUid).get();
          if (callerDoc.exists) {
            const callerData = callerDoc.data();
            if (
              callerData?.role === "super_admin" ||
              callerData?.role === "pastor" ||
              callerData?.role === "pastor_titular" ||
              callerData?.role === "líder" ||
              callerData?.super_admin === true
            ) {
              isAuthorized = true;
            }
          }
        }
      } catch (tokenErr) {
        console.warn("[create-pastor] Token verification warning:", tokenErr);
      }
    }

    // Also support setup secret for bootstrapping if provided
    const setupSecret = req.headers.get("X-Setup-Secret");
    if (setupSecret && process.env.ADMIN_SETUP_SECRET && setupSecret === process.env.ADMIN_SETUP_SECRET) {
      isAuthorized = true;
    }

    if (!isAuthorized) {
      return NextResponse.json(
        { error: "Acesso não autorizado. Apenas administradores ou liderança pastoral podem cadastrar contas de pastores." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { name, email, password, phone, churchId, pastoralTitle } = body;

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Nome, e-mail e senha são obrigatórios para criar a conta pastoral." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "A senha precisa ter no mínimo 6 caracteres." },
        { status: 400 }
      );
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanName = String(name).trim();
    const title = String(pastoralTitle || "Pastor Titular").trim();

    // 1. Check if user already exists in Firebase Auth
    let authUser;
    try {
      authUser = await adminAuth.getUserByEmail(cleanEmail);
      // If user exists, update password
      await adminAuth.updateUser(authUser.uid, {
        displayName: cleanName,
        password: password,
        emailVerified: true,
      });
    } catch (e: any) {
      if (e.code === "auth/user-not-found") {
        // Create brand new auth user with email & password
        authUser = await adminAuth.createUser({
          email: cleanEmail,
          password: password,
          displayName: cleanName,
          emailVerified: true,
        });
      } else {
        throw e;
      }
    }

    const pastorUid = authUser.uid;

    // 2. Set custom claims so pastor has elevated leadership privileges in their church
    await adminAuth.setCustomUserClaims(pastorUid, {
      role: "pastor",
      churchId: churchId || "",
    });

    // 3. Create or update user profile in Firestore
    const pastorUserData = {
      uid: pastorUid,
      name: cleanName,
      email: cleanEmail,
      phone: phone ? String(phone).trim() : "",
      churchId: churchId || "",
      role: "pastor",
      pastoralTitle: title,
      status: "active",
      emailVerified: true,
      email_verified: true,
      roles: {
        worship: ["leader"],
        multimedia: ["leader"],
        dance: ["leader", "dance_leader"],
        secretariat: ["leader", "admin"],
        biblico: ["leader"],
        acolhimento: ["leader"],
        intercessao: ["leader"],
        evangelismo: ["leader"],
        tesouraria: ["leader"],
        patrimonio: ["leader"],
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: callerUid || "system",
      updatedBy: callerUid || "system",
    };

    await adminDb.collection("users").doc(pastorUid).set(pastorUserData, { merge: true });

    // 4. If churchId is supplied, link pastor to church document
    if (churchId) {
      const churchRef = adminDb.collection("churches").doc(churchId);
      const churchSnap = await churchRef.get();
      if (churchSnap.exists) {
        const churchData = churchSnap.data() || {};
        const existingPastors = Array.isArray(churchData.pastors) ? churchData.pastors : [];
        
        // Filter out any existing entry with same uid or email
        const updatedPastors = existingPastors.filter(
          (p: any) => p.uid !== pastorUid && p.email !== cleanEmail
        );

        updatedPastors.push({
          uid: pastorUid,
          name: cleanName,
          email: cleanEmail,
          phone: phone || "",
          title: title,
          createdAt: new Date().toISOString(),
        });

        const churchUpdates: any = {
          pastors: updatedPastors,
          updatedAt: new Date().toISOString(),
        };

        // If it is Pastor Titular or church doesn't have a pastor, update primary pastor field
        if (title.toLowerCase().includes("titular") || !churchData.pastor) {
          churchUpdates.pastor = cleanName;
        }

        await churchRef.update(churchUpdates);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Conta pastoral criada com sucesso para ${cleanName}!`,
      pastor: {
        uid: pastorUid,
        name: cleanName,
        email: cleanEmail,
        pastoralTitle: title,
        churchId: churchId || "",
      },
    });
  } catch (error: any) {
    console.error("[create-pastor] Erro ao criar conta de pastor:", error);
    return NextResponse.json(
      { error: "Falha ao criar conta pastoral.", details: error.message || String(error) },
      { status: 500 }
    );
  }
}
