import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

import { createClient } from 'npm:@supabase/supabase-js@2';
import * as jose from 'jsr:@panva/jose@6';

type NagerHoliday = {
  date: string;
  localName: string;
  name: string;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization') ?? req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const accessToken = authHeader.slice('Bearer '.length).trim();

    const url = new URL(req.url);
    const now = new Date();
    const defaultYear = now.getFullYear();
    let bodyYear: string | null = null;
    if (req.method === 'POST') {
      try {
        const body = await req.clone().json() as { year?: number | string };
        if (body.year !== undefined && body.year !== null) {
          bodyYear = `${body.year}`;
        }
      } catch {
        bodyYear = null;
      }
    }
    const yearText = bodyYear ?? url.searchParams.get('year') ?? `${defaultYear}`;
    const year = Number(yearText);

    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      return new Response(JSON.stringify({ error: 'year must be between 2000 and 2100' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: 'missing Supabase service credentials' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const issuer = `${supabaseUrl}/auth/v1`;
    const jwks = jose.createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`));
    let claims: jose.JWTPayload;
    try {
      const verified = await jose.jwtVerify(accessToken, jwks, { issuer });
      claims = verified.payload;
    } catch (error) {
      return new Response(JSON.stringify({
        error: error instanceof Error ? `invalid jwt: ${error.message}` : 'invalid jwt',
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = typeof claims.sub === 'string' ? claims.sub : null;
    if (!userId) {
      return new Response(JSON.stringify({ error: 'invalid jwt: missing subject' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const roleResult = await admin
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (roleResult.error) {
      return new Response(JSON.stringify({ error: roleResult.error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const role = roleResult.data?.role;
    if (role !== 'admin' && role !== 'super_admin') {
      return new Response(JSON.stringify({ error: 'forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiRes = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/KR`);
    if (!apiRes.ok) {
      const message = await apiRes.text();
      return new Response(JSON.stringify({ error: 'failed to fetch holidays', message }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const holidays = (await apiRes.json()) as NagerHoliday[];

    const startOfYear = `${year}-01-01T00:00:00+09:00`;
    const endOfYear = `${year}-12-31T23:59:59+09:00`;

    const deleteResult = await admin
      .from('calendar_events')
      .delete()
      .eq('event_type', 'holiday')
      .eq('source_type', 'holiday_sync')
      .gte('start_at', startOfYear)
      .lte('start_at', endOfYear);

    if (deleteResult.error) {
      throw deleteResult.error;
    }

    const rows = holidays.map((holiday) => ({
      event_type: 'holiday',
      title: holiday.localName || holiday.name,
      description: holiday.name && holiday.name !== holiday.localName ? holiday.name : null,
      start_at: `${holiday.date}T00:00:00+09:00`,
      end_at: `${holiday.date}T23:59:00+09:00`,
      is_all_day: true,
      source_type: 'holiday_sync',
      created_by: null,
      season_id: null,
      location_floor: null,
      linked_match_id: null,
    }));

    if (rows.length > 0) {
      const insertResult = await admin.from('calendar_events').insert(rows);
      if (insertResult.error) {
        throw insertResult.error;
      }
    }

    return new Response(
      JSON.stringify({
        year,
        deleted: true,
        inserted: rows.length,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'unexpected error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
