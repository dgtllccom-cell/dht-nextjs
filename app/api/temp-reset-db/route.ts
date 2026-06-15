import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({
      status: "error",
      message: "Supabase environment variables are missing."
    }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false }
  });

  try {
    const { data: profiles, error: pError } = await supabase
      .from("profiles")
      .select("id, full_name, created_at, deleted_at");

    if (pError) throw pError;

    const { data: userRoles, error: rError } = await supabase
      .from("user_role_assignments")
      .select("id, user_id, role, country_id, country_branch_id, city_branch_id, is_active, deleted_at");

    if (rError) throw rError;

    const { data: countryBranches, error: cbError } = await supabase
      .from("country_branches")
      .select("id, country_id, name, code, status, is_main, deleted_at");

    if (cbError) throw cbError;

    const { data: cityBranches, error: ctyError } = await supabase
      .from("city_branches")
      .select("id, country_id, country_branch_id, city_name, name, code, status, deleted_at");

    if (ctyError) throw ctyError;

    const { data: countries, error: cnError } = await supabase
      .from("countries")
      .select("id, name, iso2, is_active, deleted_at");

    if (cnError) throw cnError;

    return NextResponse.json({
      status: "success",
      profiles,
      userRoles,
      countryBranches,
      cityBranches,
      countries
    });

  } catch (error: any) {
    return NextResponse.json(
      {
        status: "error",
        message: error.message || String(error)
      },
      { status: 500 }
    );
  }
}
