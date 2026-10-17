import { NextRequest, NextResponse } from 'next/server';
import { extractClientIp, resolveIpLocation } from '@/lib/geo-ip';

export const dynamic = 'force-dynamic';

/**
 * GET /api/audit/geo
 * Returns client IP and approximate geolocation metadata for audit logging.
 */
export async function GET(req: NextRequest) {
  try {
    const ip = extractClientIp(req.headers);
    const { location, geoSummary } = await resolveIpLocation(ip, req.headers);

    return NextResponse.json({
      success: true,
      ip,
      location,
      geoSummary,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        ip: null,
        location: null,
        geoSummary: 'Localização Desconhecida',
      },
      { status: 200 }
    );
  }
}
