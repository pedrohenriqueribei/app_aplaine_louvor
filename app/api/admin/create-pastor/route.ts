import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import firebaseConfig from "@/firebase-applet-config.json";
import { getChurchById, saveChurchToStore } from "@/lib/churchesStore";

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

        // ONLY Super Admin is authorized to create/manage pastors
        if (
          decodedToken.super_admin === true ||
          decodedToken.email === "pedrohenriqueribei@gmail.com"
        ) {
          isAuthorized = true;
        } else {
          try {
            // Check caller's role in database to confirm super_admin
            const callerDoc = await adminDb.collection("users").doc(callerUid).get();
            if (callerDoc.exists) {
              const callerData = callerDoc.data();
              if (callerData?.role === "super_admin" || callerData?.super_admin === true) {
                isAuthorized = true;
              }
            }
          } catch {
            // If adminDb lacks server permissions, authorize trusted admin email
            if (decodedToken.email === "pedrohenriqueribei@gmail.com") {
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
        { error: "Acesso negado. Apenas o Administrador Geral (Super Admin) possui autorização para cadastrar ou gerenciar pastores." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { action, name, email, password, phone, churchId, pastoralTitle, status, pastorUid: targetUid, sendInviteLink } = body;

    if (!churchId) {
      return NextResponse.json(
        { error: "O vínculo com a igreja (church_id) é estritamente obrigatório." },
        { status: 400 }
      );
    }

    // Verify church exists
    let churchData: any = {};
    let churchRef: any = null;
    try {
      churchRef = adminDb.collection("churches").doc(churchId);
      const churchSnap = await churchRef.get();
      if (churchSnap.exists) {
        churchData = churchSnap.data() || {};
      } else {
        const fallback = getChurchById(churchId);
        if (fallback) {
          churchData = fallback;
        } else {
          return NextResponse.json(
            { error: `Igreja com ID ${churchId} não encontrada.` },
            { status: 404 }
          );
        }
      }
    } catch {
      const fallback = getChurchById(churchId);
      if (fallback) {
        churchData = fallback;
      }
    }

    // Action: Generate password reset / invite link for existing pastor
    if (action === "generate-link") {
      if (!email) {
        return NextResponse.json({ error: "E-mail é obrigatório para gerar link." }, { status: 400 });
      }
      const cleanEmail = String(email).trim().toLowerCase();
      try {
        const link = await adminAuth.generatePasswordResetLink(cleanEmail);
        return NextResponse.json({ success: true, resetLink: link });
      } catch (linkErr: any) {
        // Fallback via Identity Toolkit REST
        if (firebaseConfig.apiKey) {
          try {
            await fetch(
              `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${firebaseConfig.apiKey}`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ requestType: "PASSWORD_RESET", email: cleanEmail }),
              }
            );
            return NextResponse.json({
              success: true,
              message: `Link de redefinição enviado diretamente para ${cleanEmail}`,
            });
          } catch {}
        }
        return NextResponse.json(
          { error: "Erro ao gerar link de redefinição", details: linkErr.message || String(linkErr) },
          { status: 500 }
        );
      }
    }

    // Action: Toggle status (active/inactive)
    if (action === "toggle-status") {
      if (!targetUid) {
        return NextResponse.json({ error: "ID do pastor é obrigatório." }, { status: 400 });
      }
      const newStatus = status === "inactive" ? "inactive" : "active";
      try {
        await adminDb.collection("users").doc(targetUid).update({
          status: newStatus,
          updatedAt: new Date().toISOString(),
          updatedBy: callerUid || "super_admin",
        });
      } catch (err) {
        console.warn("[create-pastor] Non-fatal adminDb update error:", err);
      }

      const existingPastors = Array.isArray(churchData.pastors) ? churchData.pastors : [];
      const updatedPastors = existingPastors.map((p: any) =>
        p.uid === targetUid ? { ...p, status: newStatus, updatedAt: new Date().toISOString() } : p
      );
      if (churchRef) {
        try {
          await churchRef.update({ pastors: updatedPastors, updatedAt: new Date().toISOString() });
        } catch {}
      }
      saveChurchToStore({ ...churchData, id: churchId, pastors: updatedPastors });

      return NextResponse.json({ success: true, status: newStatus });
    }

    // Action: Remove / unlink pastor from this church
    if (action === "remove") {
      if (!targetUid) {
        return NextResponse.json({ error: "ID do pastor é obrigatório." }, { status: 400 });
      }
      const existingPastors = Array.isArray(churchData.pastors) ? churchData.pastors : [];
      const updatedPastors = existingPastors.filter((p: any) => p.uid !== targetUid);

      const churchUpdates: any = {
        pastors: updatedPastors,
        updatedAt: new Date().toISOString(),
      };
      if (churchData.pastor && churchData.pastor === name) {
        churchUpdates.pastor = updatedPastors[0]?.name || "";
      }
      if (churchRef) {
        try {
          await churchRef.update(churchUpdates);
        } catch {}
      }
      saveChurchToStore({ ...churchData, id: churchId, pastors: updatedPastors, pastor: churchUpdates.pastor || churchData.pastor });

      try {
        await adminDb.collection("users").doc(targetUid).update({
          churchId: "",
          updatedAt: new Date().toISOString(),
          updatedBy: callerUid || "super_admin",
        });
      } catch {}

      return NextResponse.json({ success: true, message: "Pastor desvinculado com sucesso." });
    }

    // Standard action: Create / Register Pastor
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Nome completo, e-mail e senha são obrigatórios para cadastrar o pastor." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "A senha provisória precisa ter no mínimo 6 caracteres." },
        { status: 400 }
      );
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanName = String(name).trim();
    const title = pastoralTitle === "Pastor Auxiliar" ? "Pastor Auxiliar" : "Pastor Titular";
    const pastorStatus = status === "inactive" ? "inactive" : "active";

    // 1. Check if user already exists or create via Firebase Auth
    let pastorUid = "";
    let isNewUser = false;

    try {
      const authUser = await adminAuth.getUserByEmail(cleanEmail);
      pastorUid = authUser.uid;
      try {
        await adminAuth.updateUser(pastorUid, {
          displayName: cleanName,
          password: password,
          emailVerified: true,
        });
      } catch {}
    } catch (e: any) {
      if (e.code === "auth/user-not-found") {
        isNewUser = true;
        try {
          const newUser = await adminAuth.createUser({
            email: cleanEmail,
            password: password,
            displayName: cleanName,
            emailVerified: true,
          });
          pastorUid = newUser.uid;
        } catch (createErr: any) {
          // If Identity Toolkit API service disabled on server host, use REST API with apiKey
          if (firebaseConfig.apiKey) {
            const signUpRes = await fetch(
              `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${firebaseConfig.apiKey}`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  email: cleanEmail,
                  password: password,
                  displayName: cleanName,
                  returnSecureToken: true,
                }),
              }
            );
            const signUpData = await signUpRes.json();
            if (signUpData.localId) {
              pastorUid = signUpData.localId;
              isNewUser = true;
            } else if (signUpData.error?.message === "EMAIL_EXISTS") {
              pastorUid = `pastor_${cleanEmail.replace(/[^a-z0-9]/g, "_")}`;
            } else {
              throw new Error(signUpData.error?.message || createErr.message);
            }
          } else {
            throw createErr;
          }
        }
      } else {
        // Fallback to REST API with apiKey if adminAuth service disabled
        if (firebaseConfig.apiKey) {
          const signUpRes = await fetch(
            `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${firebaseConfig.apiKey}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                email: cleanEmail,
                password: password,
                displayName: cleanName,
                returnSecureToken: true,
              }),
            }
          );
          const signUpData = await signUpRes.json();
          if (signUpData.localId) {
            pastorUid = signUpData.localId;
            isNewUser = true;
          } else {
            pastorUid = `pastor_${cleanEmail.replace(/[^a-z0-9]/g, "_")}`;
          }
        } else {
          pastorUid = `pastor_${cleanEmail.replace(/[^a-z0-9]/g, "_")}`;
        }
      }
    }

    if (!pastorUid) {
      pastorUid = `pastor_${cleanEmail.replace(/[^a-z0-9]/g, "_")}`;
    }

    // 2. Set custom claims if supported
    try {
      await adminAuth.setCustomUserClaims(pastorUid, {
        role: "pastor",
        churchId: churchId,
        pastoralTitle: title,
      });
    } catch {}

    // 3. Create or update user profile in Firestore
    const pastorUserData = {
      uid: pastorUid,
      name: cleanName,
      email: cleanEmail,
      phone: phone ? String(phone).trim() : "",
      churchId: churchId,
      role: "pastor",
      pastoralTitle: title,
      status: pastorStatus,
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
      createdBy: callerUid || "super_admin",
      updatedBy: callerUid || "super_admin",
    };

    try {
      await adminDb.collection("users").doc(pastorUid).set(pastorUserData, { merge: true });
    } catch (dbErr) {
      console.warn("[create-pastor] adminDb users write non-fatal notice:", dbErr);
    }

    // 4. Link pastor to church document
    const existingPastors = Array.isArray(churchData.pastors) ? churchData.pastors : [];
    const updatedPastors = existingPastors.filter(
      (p: any) => p.uid !== pastorUid && p.email !== cleanEmail
    );

    updatedPastors.push({
      uid: pastorUid,
      name: cleanName,
      email: cleanEmail,
      phone: phone ? String(phone).trim() : "",
      title: title,
      status: pastorStatus,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const churchUpdates: any = {
      pastors: updatedPastors,
      updatedAt: new Date().toISOString(),
    };

    if (title === "Pastor Titular" || !churchData.pastor) {
      churchUpdates.pastor = cleanName;
    }

    if (churchRef) {
      try {
        await churchRef.update(churchUpdates);
      } catch (chErr) {
        console.warn("[create-pastor] adminDb church update non-fatal notice:", chErr);
      }
    }
    saveChurchToStore({
      ...churchData,
      id: churchId,
      pastor: churchUpdates.pastor || churchData.pastor,
      pastors: updatedPastors,
    });

    // 5. Generate password reset / invite link if requested
    let resetLink = "";
    if (sendInviteLink) {
      try {
        resetLink = await adminAuth.generatePasswordResetLink(cleanEmail);
      } catch {
        if (firebaseConfig.apiKey) {
          try {
            await fetch(
              `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${firebaseConfig.apiKey}`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ requestType: "PASSWORD_RESET", email: cleanEmail }),
              }
            );
            resetLink = `Convite enviado diretamente para o e-mail ${cleanEmail}`;
          } catch {}
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Conta pastoral criada com sucesso para ${cleanName}!`,
      pastor: {
        uid: pastorUid,
        name: cleanName,
        email: cleanEmail,
        phone: phone || "",
        pastoralTitle: title,
        status: pastorStatus,
        churchId: churchId,
        isNewUser,
      },
      resetLink,
    });
  } catch (error: any) {
    console.error("[create-pastor] Erro ao criar conta de pastor:", error);
    return NextResponse.json(
      { error: "Falha ao criar conta pastoral.", details: error.message || String(error) },
      { status: 500 }
    );
  }
}
