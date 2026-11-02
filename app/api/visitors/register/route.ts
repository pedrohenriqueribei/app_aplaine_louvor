import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      name,
      phone,
      email = "",
      churchId,
      firstVisit,
      howMet = "",
      invitedBy = "",
      ageGroup = "",
      maritalStatus = "",
      hasChildren = "",
      prayerRequest = "",
      notes = "",
      acceptedJesus = false,
      reconciliation = false,
      wantsVisit = false,
      cep = "",
      logradouro = "",
      numero = "",
      complemento = "",
      bairro = "",
      cidade = "",
      uf = "",
    } = body;

    // Basic validation
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Por favor, preencha o seu nome completo." },
        { status: 400 }
      );
    }

    if (!phone || typeof phone !== "string" || phone.trim().length < 8) {
      return NextResponse.json(
        { error: "Por favor, informe um número de telefone ou WhatsApp válido." },
        { status: 400 }
      );
    }

    if (!churchId || typeof churchId !== "string" || churchId.trim().length === 0) {
      return NextResponse.json(
        { error: "Identificador da igreja não informado." },
        { status: 400 }
      );
    }

    const trimmedName = name.trim().slice(0, 100);
    const trimmedPhone = phone.trim().slice(0, 40);
    const trimmedEmail = email ? email.trim().slice(0, 100) : "";
    const isAcceptedJesus = Boolean(acceptedJesus);
    const isReconciliation = Boolean(reconciliation);
    const isWantsVisit = Boolean(wantsVisit);
    const trimmedCep = cep ? String(cep).trim().slice(0, 12) : "";
    const trimmedLogradouro = logradouro ? String(logradouro).trim().slice(0, 150) : "";
    const trimmedNumero = numero ? String(numero).trim().slice(0, 30) : "";
    const trimmedComplemento = complemento ? String(complemento).trim().slice(0, 60) : "";
    const trimmedBairro = bairro ? String(bairro).trim().slice(0, 100) : "";
    const trimmedCidade = cidade ? String(cidade).trim().slice(0, 100) : "";
    const trimmedUf = uf ? String(uf).trim().slice(0, 10) : "";

    const visitDate =
      firstVisit && typeof firstVisit === "string"
        ? firstVisit
        : new Date().toISOString().split("T")[0];

    // Combine notes with prayer request & invitation source if present
    const assembledNotesList: string[] = [];
    if (isAcceptedJesus) {
      assembledNotesList.push(`[Decisão de Fé]: Aceitou Jesus ✨`);
    }
    if (isReconciliation) {
      assembledNotesList.push(`[Decisão Espiritual]: Reconciliação com Cristo 🕊️`);
    }
    if (isWantsVisit) {
      assembledNotesList.push(
        `[Deseja Visita]: Sim 🏠 | Endereço: ${trimmedLogradouro}, ${trimmedNumero}${trimmedComplemento ? ` (${trimmedComplemento})` : ""} - ${trimmedBairro}, ${trimmedCidade}/${trimmedUf} - CEP: ${trimmedCep}`
      );
    }
    if (prayerRequest && prayerRequest.trim()) {
      assembledNotesList.push(`[Pedido de Oração]: ${prayerRequest.trim()}`);
    }
    if (howMet && howMet.trim()) {
      assembledNotesList.push(`[Como conheceu]: ${howMet.trim()}`);
    }
    if (invitedBy && invitedBy.trim()) {
      assembledNotesList.push(`[Convidado por]: ${invitedBy.trim()}`);
    }
    if (ageGroup && ageGroup.trim()) {
      assembledNotesList.push(`[Faixa Etária]: ${ageGroup.trim()}`);
    }
    if (maritalStatus && maritalStatus.trim()) {
      assembledNotesList.push(`[Estado Civil]: ${maritalStatus.trim()}`);
    }
    if (notes && notes.trim()) {
      assembledNotesList.push(`[Obs]: ${notes.trim()}`);
    }

    const fullNotes = assembledNotesList.join(" | ");

    const visitorId = `visitor_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const newVisitorRecord = {
      id: visitorId,
      name: trimmedName,
      phone: trimmedPhone,
      email: trimmedEmail,
      churchId: churchId.trim(),
      firstVisit: visitDate,
      followupStatus: "pending", // Always starts as Pending in reception funnel
      source: "public_form",
      acceptedJesus: isAcceptedJesus,
      reconciliation: isReconciliation,
      wantsVisit: isWantsVisit,
      cep: trimmedCep,
      logradouro: trimmedLogradouro,
      numero: trimmedNumero,
      complemento: trimmedComplemento,
      bairro: trimmedBairro,
      cidade: trimmedCidade,
      uf: trimmedUf,
      howMet: howMet ? howMet.trim().slice(0, 100) : "",
      invitedBy: invitedBy ? invitedBy.trim().slice(0, 100) : "",
      ageGroup: ageGroup ? ageGroup.trim().slice(0, 50) : "",
      maritalStatus: maritalStatus ? maritalStatus.trim().slice(0, 50) : "",
      hasChildren: hasChildren ? hasChildren.trim().slice(0, 20) : "",
      prayerRequest: prayerRequest ? prayerRequest.trim().slice(0, 1000) : "",
      notes: fullNotes.slice(0, 2000),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      createdBy: "public_visitor_form",
    };

    await adminDb.collection("visitors").doc(visitorId).set(newVisitorRecord);

    // Also register an audit record if audit_logs collection is active
    try {
      const auditId = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      await adminDb.collection("audit_logs").doc(auditId).set({
        id: auditId,
        actor_user_id: "public_visitor",
        actor_name: trimmedName,
        actor_email: trimmedEmail || "visitante@publico.applane",
        actor_role: "visitante",
        action: "CREATE",
        entity_type: "Visitor",
        entity_id: visitorId,
        entity_label: trimmedName,
        church_id: churchId.trim(),
        department_id: "secretariat",
        created_at: new Date().toISOString(),
        source: "web_app",
        new_values: {
          name: trimmedName,
          phone: trimmedPhone,
          followupStatus: "pending",
          source: "public_form",
        },
      });
    } catch (auditErr) {
      console.warn("[Register Visitor] Audit log silently skipped:", auditErr);
    }

    return NextResponse.json({
      success: true,
      id: visitorId,
      message: "Cadastro realizado com sucesso! Seja muito bem-vindo(a)!",
    });
  } catch (error: any) {
    console.error("[Register Visitor API Error]:", error);
    return NextResponse.json(
      { error: "Erro interno ao cadastrar visitante. Tente novamente.", details: error?.message },
      { status: 500 }
    );
  }
}
