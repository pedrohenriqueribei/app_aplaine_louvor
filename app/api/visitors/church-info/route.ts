import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

/**
 * GET /api/visitors/church-info?churchId=...
 * Returns public metadata for a church so the visitor registration form can display
 * the church's welcoming banner, name, address, and pastor without exposing sensitive data.
 * If churchId is omitted, returns the list of active churches so the visitor can select.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const churchId = searchParams.get("churchId");

    if (churchId) {
      try {
        const churchDoc = await adminDb.collection("churches").doc(churchId).get();
        if (churchDoc.exists) {
          const data = churchDoc.data() || {};
          return NextResponse.json({
            church: {
              id: churchDoc.id,
              name: data.name || "Igreja Local",
              address: data.address || "",
              pastor: data.pastor || "",
              worshipMinistryName: data.worshipMinistryName || "",
              worshipMinistryAcronym: data.worshipMinistryAcronym || "",
            },
          });
        }
      } catch (err: any) {
        console.warn("[church-info] Error reading church by id:", err?.message || err);
      }

      return NextResponse.json({
        church: {
          id: churchId,
          name: "Igreja Local",
          address: "",
          pastor: "",
        },
      });
    }

    // Return list of available churches for dropdown
    try {
      const snap = await adminDb.collection("churches").get();
      const churches = snap.docs.map((d) => {
        const data = d.data() || {};
        return {
          id: d.id,
          name: data.name || "Igreja",
          address: data.address || "",
          pastor: data.pastor || "",
        };
      });
      return NextResponse.json({ churches });
    } catch (err: any) {
      console.warn("[church-info] Error listing churches:", err?.message || err);
      return NextResponse.json({ churches: [] });
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: "Erro ao obter informações da igreja", details: error?.message },
      { status: 500 }
    );
  }
}
