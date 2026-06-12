import { NextRequest, NextResponse } from "next/server";
import postgres from "postgres";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      return NextResponse.json({ error: "DATABASE_URL not configured" }, { status: 500 });
    }

    const sql = postgres(databaseUrl, { max: 1, prepare: false });
    const action = request.nextUrl.searchParams.get("action");

    if (action === "locks") {
      const locks = await sql`
        SELECT
          blocked_locks.pid     AS blocked_pid,
          blocked_activity.query    AS blocked_statement,
          blocking_locks.pid    AS blocking_pid,
          blocking_activity.query   AS blocking_statement
        FROM pg_catalog.pg_locks         blocked_locks
        JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
        JOIN pg_catalog.pg_locks         blocking_locks 
            ON blocking_locks.locktype = blocked_locks.locktype
            AND blocking_locks.database IS NOT DISTINCT FROM blocked_locks.database
            AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation
            AND blocking_locks.page IS NOT DISTINCT FROM blocked_locks.page
            AND blocking_locks.tuple IS NOT DISTINCT FROM blocked_locks.tuple
            AND blocking_locks.virtualxid IS NOT DISTINCT FROM blocked_locks.virtualxid
            AND blocking_locks.transactionid IS NOT DISTINCT FROM blocked_locks.transactionid
            AND blocking_locks.classid IS NOT DISTINCT FROM blocked_locks.classid
            AND blocking_locks.objid IS NOT DISTINCT FROM blocked_locks.objid
            AND blocking_locks.objsubid IS NOT DISTINCT FROM blocked_locks.objsubid
            AND blocking_locks.pid != blocked_locks.pid
        JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
        WHERE NOT blocked_locks.granted
      `;
      await sql.end();
      return NextResponse.json({ locks });
    }

    if (action === "bootstrap") {
      try {
        const supabase = createSupabaseAdminClient();
        
        // 1. Check if the user already exists in auth.users
        const [existingAuth] = await sql`
          SELECT id FROM auth.users WHERE email = 'superadmin@damaan.com' LIMIT 1
        `;

        let userId = existingAuth?.id;

        if (!userId) {
          console.log("Creating auth user for superadmin@damaan.com...");
          const { data, error } = await supabase.auth.admin.createUser({
            email: "superadmin@damaan.com",
            password: "Admin@123",
            email_confirm: true,
            user_metadata: { full_name: "Super Admin" }
          });
          if (error) {
            return NextResponse.json({ error: `Failed to create auth user: ${error.message}` }, { status: 500 });
          }
          userId = data.user.id;
        } else {
          console.log("Resetting password for existing user...");
          const { error } = await supabase.auth.admin.updateUserById(userId, {
            password: "Admin@123",
            email_confirm: true
          });
          if (error) {
            return NextResponse.json({ error: `Failed to update auth user: ${error.message}` }, { status: 500 });
          }
        }

        // 2. Ensure profile exists in public.profiles
        await sql`
          INSERT INTO public.profiles (id, full_name)
          VALUES (${userId}, 'Super Admin')
          ON CONFLICT (id) DO UPDATE SET full_name = 'Super Admin'
        `;

        // 3. Ensure role assignment exists in public.user_role_assignments
        await sql`
          INSERT INTO public.user_role_assignments (user_id, role, is_active)
          VALUES (${userId}, 'super_admin', true)
          ON CONFLICT DO NOTHING
        `;

        await sql.end();
        return NextResponse.json({ success: true, message: "Super Admin bootstrapped successfully.", userId });
      } catch (err: any) {
        return NextResponse.json({ success: false, error: err.message });
      }
    }

    if (action === "cleanup") {
      console.log("Starting database cleanup via API...");
      const logs: string[] = [];

      try {
        // Disable default branch pointers in countries before deleting branches
        await sql`UPDATE public.countries SET default_country_branch_id = NULL`;
        logs.push("Disable country branch pointers: SUCCESS");

        // Transactional tables to truncate/clear
        const transactionalTables = [
          "ledger_transaction_audit_trail",
          "inter_branch_ledger_transfers",
          "purchase_loading_records",
          "shipping_bl_records",
          "purchase_order_payments",
          "purchase_orders",
          "sales_order_payments",
          "sales_orders",
          "shipping_line_records",
          "shipment_documents",
          "roznamcha_reversals",
          "ledger_entries",
          "journal_lines",
          "journal_entries",
          "ledger_balances",
          "ledger_posting_lines",
          "roznamcha_lines",
          "roznamcha_entries",
          "enterprise_ledger_reversals",
          "ledger_opening_balances",
          "ledger_posting_batches",
          "enterprise_account_history",
          "daily_usd_rates",
          "usd_purchase_sales",
          "exchange_rate_history",
          "approval_status_history",
          "approval_request_items",
          "approval_requests",
          "record_locks",
          "record_change_history",
          "soft_delete_logs",
          "attachments",
          "audit_logs",
          "erp_activity_events",
          "erp_record_transfers",
          "erp_pdf_email_jobs",
          "erp_assignments",
          "product_inventory_balances",
          "customer_contacts",
          "customer_registrations",
          "customers",
          "ledgers",
          "accounts",
          "enterprise_accounts",
          "banks"
        ];

        // Find which tables exist
        const existingTablesResult = await sql`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
            AND table_name IN ${sql(transactionalTables)}
        `;
        const existingTableNames = existingTablesResult.map(r => r.table_name);

        if (existingTableNames.length > 0) {
          const truncateList = existingTableNames.map(name => `public."${name}"`).join(", ");
          await sql.unsafe(`TRUNCATE TABLE ${truncateList} RESTART IDENTITY CASCADE`);
          logs.push(`Truncated ${existingTableNames.length} tables: SUCCESS`);
        } else {
          logs.push("No transactional tables found to truncate");
        }

        // Delete all city branches
        await sql`TRUNCATE TABLE public.city_branches RESTART IDENTITY CASCADE`;
        logs.push("Truncate city branches: SUCCESS");

        // Identify users to delete (keep only users with role 'super_admin')
        const profilesList = await sql`
          SELECT p.id, p.full_name, ura.role
          FROM public.profiles p
          LEFT JOIN public.user_role_assignments ura ON ura.user_id = p.id
        `;
        logs.push("Fetch profiles: SUCCESS");

        const superAdminUserIds = new Set(
          profilesList
            .filter(p => p.role === "super_admin")
            .map(p => p.id)
        );

        const toDeleteUsers = profilesList.filter(p => !superAdminUserIds.has(p.id));
        const deletedUserIds = toDeleteUsers.map(u => u.id);

        if (deletedUserIds.length > 0) {
          const fkRefs = await sql`
            SELECT 
              tc.table_name, 
              kcu.column_name
            FROM 
              information_schema.table_constraints AS tc 
              JOIN information_schema.key_column_usage AS kcu
                ON tc.constraint_name = kcu.constraint_name
                AND tc.table_schema = kcu.table_schema
              JOIN information_schema.constraint_column_usage AS ccu
                ON ccu.constraint_name = tc.constraint_name
                AND ccu.table_schema = tc.table_schema
            WHERE 
              tc.constraint_type = 'FOREIGN KEY' 
              AND ccu.table_schema = 'public'
              AND ccu.table_name = 'profiles'
              AND ccu.column_name = 'id'
              AND tc.table_name NOT IN ('user_role_assignments', 'user_permission_sets', 'profiles')
          `;

          for (const ref of fkRefs) {
            try {
              await sql.unsafe(`
                UPDATE public."${ref.table_name}" 
                SET "${ref.column_name}" = NULL 
                WHERE "${ref.column_name}" IN (${deletedUserIds.map(id => `'${id}'::uuid`).join(",")})
              `);
            } catch (err: any) {
              console.error(`Failed to dynamically nullify ${ref.table_name}.${ref.column_name}:`, err.message);
            }
          }
          logs.push(`Dynamically cleared profile references in ${fkRefs.length} referencing columns: SUCCESS`);

          const [permExists] = await sql`SELECT to_regclass('public.user_permission_sets') as tbl`;
          if (permExists && permExists.tbl) {
            await sql`DELETE FROM public.user_permission_sets WHERE user_id IN ${sql(deletedUserIds)}`;
          }
          await sql`DELETE FROM public.user_role_assignments WHERE user_id IN ${sql(deletedUserIds)}`;
          await sql`DELETE FROM public.profiles WHERE id IN ${sql(deletedUserIds)}`;
          logs.push(`Deleted ${deletedUserIds.length} profiles: SUCCESS`);

          // Delete from Supabase Auth with a timeout
          try {
            const supabase = createSupabaseAdminClient();
            const deletePromises = toDeleteUsers.map(async (user) => {
              const deletePromise = supabase.auth.admin.deleteUser(user.id);
              const timeoutPromise = new Promise<any>((_, reject) => setTimeout(() => reject(new Error("Timeout")), 1000));
              return Promise.race([deletePromise, timeoutPromise]).catch(err => {
                console.error(`Failed/timed out deleting auth user ${user.id}:`, err);
              });
            });
            await Promise.all(deletePromises);
            logs.push("Delete from Supabase Auth: DONE/TIMEOUT");
          } catch (authError: any) {
            logs.push(`Delete from Supabase Auth: FAILED - ${authError.message}`);
          }
        } else {
          logs.push("No non-admin users to delete");
        }
      } catch (err: any) {
        logs.push(`CRITICAL ERROR: ${err.message}`);
        console.error("Cleanup critical error:", err);
      }

      await sql.end();
      return NextResponse.json({ success: true, logs });
    }

    // Default GET inspect data (existing code)
    const profiles = await sql`
      SELECT * FROM public.profiles
    `;
    const roleAssignments = await sql`
      SELECT * FROM public.user_role_assignments
    `;
    const authUsers = await sql`
      SELECT id, email, raw_user_meta_data FROM auth.users
    `;

    const countryBranches = await sql`
      SELECT cb.id, cb.name, cb.code, cb.local_currency, c.name as country_name
      FROM public.country_branches cb
      JOIN public.countries c ON c.id = cb.country_id
      WHERE cb.deleted_at IS NULL
    `;

    const cityBranches = await sql`
      SELECT cb.id, cb.name, cb.code, cb.local_currency, cb.city_name, c.name as country_name
      FROM public.city_branches cb
      JOIN public.countries c ON c.id = cb.country_id
      WHERE cb.deleted_at IS NULL
    `;

    const accountsCount = await sql`SELECT count(*)::int as count FROM public.accounts`;
    const enterpriseAccountsCount = await sql`SELECT count(*)::int as count FROM public.enterprise_accounts`;
    const entriesCount = await sql`SELECT count(*)::int as count FROM public.roznamcha_entries`;

    await sql.end();

    return NextResponse.json({
      profiles,
      roleAssignments,
      authUsers,
      countryBranches,
      cityBranches,
      counts: {
        accounts: accountsCount[0].count,
        enterpriseAccounts: enterpriseAccountsCount[0].count,
        entries: entriesCount[0].count
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message, stack: error.stack }, { status: 200 });
  }
}
