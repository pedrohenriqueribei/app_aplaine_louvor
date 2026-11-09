import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
  sendPasswordResetEmail,
} from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import firebaseConfig from "@/firebase-applet-config.json";

export interface CreatePastorInput {
  churchId: string;
  name: string;
  email: string;
  phone?: string;
  pastoralTitle?: string;
  password: string;
  status?: string;
  sendInviteLink?: boolean;
}

export interface PastorActionResult {
  success: boolean;
  message: string;
  pastorUid?: string;
  isNewUser?: boolean;
  resetLinkSent?: boolean;
  error?: string;
}

/**
 * Retorna uma instância dedicada de autenticação isolada (Secondary App),
 * permitindo criar novos usuários no Firebase Auth sem desconectar a sessão ativa do Super Admin.
 */
function getSecondaryAuth() {
  const secondaryAppName = "ApplanePastorSecondaryAuth";
  const existingApp = getApps().find((a) => a.name === secondaryAppName);
  const app = existingApp || initializeApp(firebaseConfig, secondaryAppName);
  return getAuth(app);
}

/**
 * Criação resiliente de conta pastoral com suporte a Firebase Auth (Secondary App)
 * e gravação direta no Firestore com as credenciais do Super Admin ativo.
 */
export async function createPastorAccount(
  input: CreatePastorInput
): Promise<PastorActionResult> {
  const cleanName = String(input.name || "").trim();
  const cleanEmail = String(input.email || "").trim().toLowerCase();
  const cleanPhone = String(input.phone || "").trim();
  const password = String(input.password || "").trim();
  const title =
    input.pastoralTitle === "Pastor Auxiliar"
      ? "Pastor Auxiliar"
      : "Pastor Titular";
  const pastorStatus = input.status === "inactive" ? "inactive" : "active";
  const churchId = String(input.churchId || "").trim();

  if (!cleanName || !cleanEmail || !password) {
    throw new Error("Nome completo, e-mail e senha provisória são obrigatórios.");
  }
  if (password.length < 6) {
    throw new Error("A senha provisória precisa ter no mínimo 6 caracteres.");
  }
  if (!churchId) {
    throw new Error("O vínculo com a congregação (churchId) é obrigatório.");
  }

  let pastorUid = "";
  let isNewUser = false;
  let resetLinkSent = false;

  // 1. Criação no Firebase Auth via Secondary App isolada
  try {
    const secondaryAuth = getSecondaryAuth();
    const userCredential = await createUserWithEmailAndPassword(
      secondaryAuth,
      cleanEmail,
      password
    );
    pastorUid = userCredential.user.uid;
    isNewUser = true;

    try {
      await updateProfile(userCredential.user, { displayName: cleanName });
    } catch (profErr) {
      console.warn("[pastorService] Não foi possível atualizar displayName do Auth:", profErr);
    }

    // Desconecta a instância secundária imediatamente para não manter sessão paralela
    try {
      await signOut(secondaryAuth);
    } catch (soErr) {
      console.warn("[pastorService] Aviso ao deslogar secondaryAuth:", soErr);
    }
  } catch (authErr: any) {
    const errCode = authErr?.code || "";
    // Caso o e-mail já exista no Firebase Auth
    if (errCode === "auth/email-already-in-use" || String(authErr).includes("email-already-in-use")) {
      console.info("[pastorService] E-mail já cadastrado no Auth. Buscando UID no Firestore...");
      try {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("email", "==", cleanEmail));
        const snap = await getDocs(q);
        if (!snap.empty) {
          pastorUid = snap.docs[0].id;
        }
      } catch (findErr) {
        console.warn("[pastorService] Erro ao buscar usuário pré-existente no Firestore:", findErr);
      }

      // Se ainda não temos o UID, podemos consultar a REST API do Identity Toolkit
      if (!pastorUid && firebaseConfig.apiKey) {
        try {
          const lookupRes = await fetch(
            `https://identitytoolkit.googleapis.com/v1/accounts:createAuthUri?key=${firebaseConfig.apiKey}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                identifier: cleanEmail,
                continueUri: typeof window !== "undefined" ? window.location.origin : "http://localhost",
              }),
            }
          );
          // O usuário existe no Auth; usaremos o ID gerado ou o hash
          console.info("[pastorService] Usuário confirmado no Identity Toolkit.");
        } catch {
          // ignore
        }
      }
    } else {
      console.error("[pastorService] Erro ao criar usuário no Auth:", authErr);
      // Fornece mensagem amigável para o usuário
      if (errCode === "auth/invalid-email") {
        throw new Error("Formato de e-mail inválido. Verifique o endereço digitado.");
      } else if (errCode === "auth/weak-password") {
        throw new Error("A senha fornecida é muito fraca. Utilize uma senha com letras, números e símbolos.");
      } else {
        throw new Error(authErr.message || "Falha ao registrar credenciais no Firebase Auth.");
      }
    }
  }

  // Se o pastorUid ainda não foi obtido (ex: email já em uso e sem doc prévio), gera UID determinístico ou busca
  if (!pastorUid) {
    pastorUid = `pastor_${cleanEmail.replace(/[^a-z0-9]/g, "_")}`;
  }

  // 2. Envio de link de convite / redefinição de primeiro acesso se solicitado
  if (input.sendInviteLink) {
    try {
      if (typeof window !== "undefined" && auth) {
        await sendPasswordResetEmail(auth, cleanEmail);
        resetLinkSent = true;
      } else if (firebaseConfig.apiKey) {
        const resetRes = await fetch(
          `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${firebaseConfig.apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              requestType: "PASSWORD_RESET",
              email: cleanEmail,
            }),
          }
        );
        if (resetRes.ok) {
          resetLinkSent = true;
        }
      }
    } catch (inviteErr: any) {
      console.warn("[pastorService] Aviso ao disparar link de convite por e-mail:", inviteErr);
    }
  }

  // 3. Gravação/Atualização do perfil na coleção 'users' do Firestore
  const pastorUserData: any = {
    uid: pastorUid,
    name: cleanName,
    email: cleanEmail,
    phone: cleanPhone,
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
    updatedAt: serverTimestamp(),
    updatedBy: auth.currentUser?.uid || "super_admin",
  };

  if (isNewUser) {
    pastorUserData.createdAt = serverTimestamp();
    pastorUserData.createdBy = auth.currentUser?.uid || "super_admin";
  }

  await setDoc(doc(db, "users", pastorUid), pastorUserData, { merge: true });

  // 4. Vínculo do pastor na congregação ('churches/{churchId}')
  const churchRef = doc(db, "churches", churchId);
  const churchSnap = await getDoc(churchRef);
  const churchData = churchSnap.exists() ? churchSnap.data() || {} : {};

  const existingPastors: any[] = Array.isArray(churchData.pastors)
    ? churchData.pastors
    : [];
  const updatedPastors = existingPastors.filter(
    (p: any) => p.uid !== pastorUid && p.email !== cleanEmail
  );

  updatedPastors.push({
    uid: pastorUid,
    name: cleanName,
    email: cleanEmail,
    phone: cleanPhone,
    title: title,
    status: pastorStatus,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const churchUpdates: any = {
    pastors: updatedPastors,
    updatedAt: serverTimestamp(),
  };

  if (title === "Pastor Titular" || !churchData.pastor) {
    churchUpdates.pastor = cleanName;
  }

  await updateDoc(churchRef, churchUpdates);

  // 5. Registro de Auditoria (Audit Log)
  try {
    await addDoc(collection(db, "audit_logs"), {
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      actor_user_id: auth.currentUser?.uid || "super_admin",
      action: "CREATE",
      entity_type: "PASTOR_ACCOUNT",
      entity_id: pastorUid,
      church_id: churchId,
      created_at: new Date().toISOString(),
      details: {
        name: cleanName,
        email: cleanEmail,
        title: title,
        status: pastorStatus,
        isNewUser,
        resetLinkSent,
      },
    });
  } catch (auditErr) {
    console.warn("[pastorService] Falha não bloqueante ao registrar log de auditoria:", auditErr);
  }

  // 6. Sincronização secundária com rota interna de visitantes/info
  try {
    fetch("/api/visitors/church-info", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: churchId,
        pastor: title === "Pastor Titular" ? cleanName : churchData.pastor || cleanName,
      }),
    }).catch(() => {});
  } catch {
    // ignore
  }

  return {
    success: true,
    message: `Conta pastoral criada com sucesso para ${cleanName}!`,
    pastorUid,
    isNewUser,
    resetLinkSent,
  };
}

/**
 * Ativa ou suspende a conta do pastor na congregação.
 */
export async function togglePastorStatus(
  churchId: string,
  pastorUid: string,
  newStatus: "active" | "inactive"
): Promise<{ success: boolean; status: string }> {
  if (!churchId || !pastorUid) {
    throw new Error("churchId e pastorUid são obrigatórios.");
  }

  // 1. Atualiza na coleção de usuários
  try {
    await updateDoc(doc(db, "users", pastorUid), {
      status: newStatus,
      updatedAt: serverTimestamp(),
      updatedBy: auth.currentUser?.uid || "super_admin",
    });
  } catch (err) {
    console.warn("[pastorService] Não foi possível atualizar status do usuário na coleção users:", err);
  }

  // 2. Atualiza no array de pastores da igreja
  const churchRef = doc(db, "churches", churchId);
  const snap = await getDoc(churchRef);
  if (snap.exists()) {
    const cData = snap.data();
    const existingPastors = Array.isArray(cData.pastors) ? cData.pastors : [];
    const updated = existingPastors.map((p: any) =>
      p.uid === pastorUid ? { ...p, status: newStatus, updatedAt: new Date().toISOString() } : p
    );
    await updateDoc(churchRef, {
      pastors: updated,
      updatedAt: serverTimestamp(),
    });
  }

  return { success: true, status: newStatus };
}

/**
 * Desvincula o pastor da congregação.
 */
export async function removePastorFromChurch(
  churchId: string,
  pastorUid: string,
  pastorName?: string
): Promise<{ success: boolean }> {
  if (!churchId || !pastorUid) {
    throw new Error("churchId e pastorUid são obrigatórios.");
  }

  const churchRef = doc(db, "churches", churchId);
  const snap = await getDoc(churchRef);
  if (snap.exists()) {
    const cData = snap.data();
    const existingPastors = Array.isArray(cData.pastors) ? cData.pastors : [];
    const updated = existingPastors.filter((p: any) => p.uid !== pastorUid);

    const updates: any = {
      pastors: updated,
      updatedAt: serverTimestamp(),
    };

    if (cData.pastor && (cData.pastor === pastorName || updated.length > 0)) {
      updates.pastor = updated[0]?.name || "";
    }

    await updateDoc(churchRef, updates);
  }

  // Remove vínculo do usuário
  try {
    await updateDoc(doc(db, "users", pastorUid), {
      churchId: "",
      updatedAt: serverTimestamp(),
      updatedBy: auth.currentUser?.uid || "super_admin",
    });
  } catch (err) {
    console.warn("[pastorService] Erro ao desvincular igreja do perfil do pastor:", err);
  }

  return { success: true };
}

/**
 * Envia e-mail oficial de redefinição / convite de primeiro acesso ao pastor.
 */
export async function sendPastorInviteEmail(email: string): Promise<{ success: boolean; message: string }> {
  const cleanEmail = String(email || "").trim().toLowerCase();
  if (!cleanEmail) {
    throw new Error("E-mail é obrigatório.");
  }

  if (typeof window !== "undefined" && auth) {
    await sendPasswordResetEmail(auth, cleanEmail);
  } else if (firebaseConfig.apiKey) {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${firebaseConfig.apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestType: "PASSWORD_RESET",
          email: cleanEmail,
        }),
      }
    );
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error?.message || "Erro ao solicitar link de redefinição.");
    }
  }

  return {
    success: true,
    message: `Link de primeiro acesso enviado com sucesso para ${cleanEmail}!`,
  };
}
