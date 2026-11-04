import { NextRequest, NextResponse } from "next/server";
import {
  getAllContactMessages,
  saveContactMessage,
  updateContactMessage,
  deleteContactMessage,
  ContactCategory,
} from "@/lib/contactStore";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      name,
      email,
      phone,
      churchName,
      category,
      subject,
      message,
      userId,
      id,
    } = body;

    // Validate required fields
    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { error: "Por favor, informe seu nome completo." },
        { status: 400 }
      );
    }

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json(
        { error: "Por favor, informe um endereço de e-mail válido." },
        { status: 400 }
      );
    }

    if (!subject || typeof subject !== "string" || !subject.trim()) {
      return NextResponse.json(
        { error: "Por favor, preencha o assunto da mensagem." },
        { status: 400 }
      );
    }

    if (!message || typeof message !== "string" || message.trim().length < 5) {
      return NextResponse.json(
        { error: "Por favor, detalhe sua mensagem com pelo menos 5 caracteres." },
        { status: 400 }
      );
    }

    const cleanCategory: ContactCategory = [
      "duvida",
      "suporte",
      "sugestao",
      "elogio",
      "parceria",
      "outro",
    ].includes(category)
      ? category
      : "outro";

    const record = saveContactMessage({
      id: id || undefined,
      name: name.trim().slice(0, 150),
      email: email.trim().toLowerCase().slice(0, 200),
      phone: phone ? String(phone).trim().slice(0, 50) : undefined,
      churchName: churchName ? String(churchName).trim().slice(0, 150) : undefined,
      category: cleanCategory,
      subject: subject.trim().slice(0, 250),
      message: message.trim().slice(0, 5000),
      userId: userId ? String(userId).slice(0, 128) : undefined,
    });

    return NextResponse.json({
      success: true,
      message: "Sua mensagem foi enviada com sucesso para a administração do Applane!",
      data: record,
    });
  } catch (err: any) {
    console.error("[API Contact POST] Error saving contact message:", err);
    return NextResponse.json(
      { error: "Erro interno ao processar sua mensagem. Tente novamente mais tarde." },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const category = searchParams.get("category");
    const search = searchParams.get("search")?.toLowerCase().trim();

    let list = getAllContactMessages();

    if (status && status !== "all") {
      list = list.filter((m) => m.status === status);
    }

    if (category && category !== "all") {
      list = list.filter((m) => m.category === category);
    }

    if (search) {
      list = list.filter(
        (m) =>
          m.name.toLowerCase().includes(search) ||
          m.email.toLowerCase().includes(search) ||
          m.subject.toLowerCase().includes(search) ||
          m.message.toLowerCase().includes(search) ||
          (m.churchName && m.churchName.toLowerCase().includes(search))
      );
    }

    const unreadCount = getAllContactMessages().filter((m) => m.status === "new").length;

    return NextResponse.json({
      success: true,
      messages: list,
      total: list.length,
      unreadCount,
    });
  } catch (err: any) {
    console.error("[API Contact GET] Error fetching contact messages:", err);
    return NextResponse.json(
      { error: "Erro ao buscar mensagens de contato." },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, status, adminNotes } = body;

    if (!id) {
      return NextResponse.json(
        { error: "ID da mensagem não informado." },
        { status: 400 }
      );
    }

    const updated = updateContactMessage(id, {
      ...(status ? { status } : {}),
      ...(adminNotes !== undefined ? { adminNotes } : {}),
    });

    if (!updated) {
      return NextResponse.json(
        { error: "Mensagem não encontrada." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Mensagem atualizada com sucesso.",
      data: updated,
    });
  } catch (err: any) {
    console.error("[API Contact PATCH] Error updating contact message:", err);
    return NextResponse.json(
      { error: "Erro ao atualizar mensagem." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "ID da mensagem não informado." },
        { status: 400 }
      );
    }

    const deleted = deleteContactMessage(id);
    if (!deleted) {
      return NextResponse.json(
        { error: "Mensagem não encontrada ou já excluída." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Mensagem excluída com sucesso.",
    });
  } catch (err: any) {
    console.error("[API Contact DELETE] Error deleting contact message:", err);
    return NextResponse.json(
      { error: "Erro ao excluir mensagem." },
      { status: 500 }
    );
  }
}
