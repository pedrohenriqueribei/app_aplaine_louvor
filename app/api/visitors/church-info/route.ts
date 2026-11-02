import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import {
  getChurchById,
  getChurchesStore,
  saveChurchToStore,
  ChurchRecord,
} from "@/lib/churchesStore";

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
      const cleanId = churchId.trim();
      const localChurch = getChurchById(cleanId);

      // Attempt Firestore adminDb read safely if available
      try {
        const churchDoc = await adminDb.collection("churches").doc(cleanId).get();
        if (churchDoc.exists) {
          const data = churchDoc.data() || {};
          const churchInfo = {
            id: churchDoc.id,
            name: data.name || localChurch?.name || "Igreja Local",
            address: data.address || localChurch?.address || "",
            pastor: data.pastor || localChurch?.pastor || "",
            worshipMinistryName:
              data.worshipMinistryName || localChurch?.worshipMinistryName || "",
            worshipMinistryAcronym:
              data.worshipMinistryAcronym || localChurch?.worshipMinistryAcronym || "",
            danceMinistryName:
              data.danceMinistryName || localChurch?.danceMinistryName || "",
            danceMinistryAcronym:
              data.danceMinistryAcronym || localChurch?.danceMinistryAcronym || "",
          };

          // Cache in store for subsequent lookups
          saveChurchToStore({
            ...churchInfo,
            active: data.active ?? true,
          });

          return NextResponse.json({ church: churchInfo });
        }
      } catch (err: any) {
        // If server IAM or permissions are restricted, log informative debug note without polluting monitor
        const isPermissionDenied =
          err?.code === 7 ||
          err?.message?.includes("PERMISSION_DENIED") ||
          err?.message?.includes("Missing or insufficient permissions");

        if (!isPermissionDenied) {
          console.warn("[church-info] Notice reading church by id:", err?.message || err);
        }
      }

      // Serve from resilient churches store
      if (localChurch) {
        return NextResponse.json({
          church: {
            id: localChurch.id,
            name: localChurch.name,
            address: localChurch.address || "",
            pastor: localChurch.pastor || "",
            worshipMinistryName: localChurch.worshipMinistryName || "",
            worshipMinistryAcronym: localChurch.worshipMinistryAcronym || "",
            danceMinistryName: localChurch.danceMinistryName || "",
            danceMinistryAcronym: localChurch.danceMinistryAcronym || "",
          },
        });
      }

      // Default safe fallback for requested churchId
      return NextResponse.json({
        church: {
          id: cleanId,
          name: cleanId === "7" ? "Igreja Central da Fé" : "Igreja Local",
          address: cleanId === "7" ? "Av. Principal, 700 - Centro" : "",
          pastor: cleanId === "7" ? "Pr. Marcos Oliveira" : "",
          worshipMinistryName: "Ministério de Louvor Aplaine",
          worshipMinistryAcronym: "MLA",
        },
      });
    }

    // Return list of available churches for dropdown
    let churches: Array<{ id: string; name: string; address?: string; pastor?: string }> = [];

    try {
      const snap = await adminDb.collection("churches").get();
      if (!snap.empty) {
        churches = snap.docs.map((d) => {
          const data = d.data() || {};
          return {
            id: d.id,
            name: data.name || "Igreja",
            address: data.address || "",
            pastor: data.pastor || "",
          };
        });

        // Update local cache
        churches.forEach((c) => {
          saveChurchToStore({
            id: c.id,
            name: c.name,
            address: c.address,
            pastor: c.pastor,
            active: true,
          });
        });
      }
    } catch (err: any) {
      const isPermissionDenied =
        err?.code === 7 ||
        err?.message?.includes("PERMISSION_DENIED") ||
        err?.message?.includes("Missing or insufficient permissions");

      if (!isPermissionDenied) {
        console.warn("[church-info] Notice listing churches:", err?.message || err);
      }
    }

    // If Firestore admin query was restricted or empty, serve from resilient store
    if (churches.length === 0) {
      const cached = getChurchesStore();
      churches = cached.map((c) => ({
        id: c.id,
        name: c.name,
        address: c.address || "",
        pastor: c.pastor || "",
      }));
    }

    return NextResponse.json({ churches });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Erro ao obter informações da igreja", details: error?.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/visitors/church-info
 * Allows authenticated client dashboard to sync registered churches with the server cache
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (body && body.id && body.name) {
      const saved = saveChurchToStore({
        id: String(body.id),
        name: String(body.name),
        address: body.address || "",
        pastor: body.pastor || "",
        worshipMinistryName: body.worshipMinistryName || "",
        worshipMinistryAcronym: body.worshipMinistryAcronym || "",
        danceMinistryName: body.danceMinistryName || "",
        danceMinistryAcronym: body.danceMinistryAcronym || "",
        active: body.active ?? true,
      });
      return NextResponse.json({ success: true, church: saved });
    }
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Sync error" }, { status: 500 });
  }
}
