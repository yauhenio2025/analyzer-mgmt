/**
 * Runtime configuration — the single place where backend URLs are resolved.
 *
 * NEXT_PUBLIC_* variables are inlined at build time by Next.js, so changing
 * them on the hosting service requires a rebuild (Render: redeploy).
 *
 * - ANALYZER_V2_URL: "The Analyst" service (fork of analyzer-v2, same 27 route
 *   families). Every definition, plan, run, event and presenter call goes here.
 * - API_BASE: legacy analyzer-mgmt-api (paradigms, pipelines, grids, rhetoric,
 *   consumers registry, changes). Unchanged.
 */
export const ANALYZER_V2_URL =
  process.env.NEXT_PUBLIC_ANALYZER_V2_URL || 'https://the-analyst-kcuc.onrender.com';

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';
