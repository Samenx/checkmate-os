import { del } from "@vercel/blob";
import {
  identity,
  allowed,
  rows,
  settings,
  db,
  tableNames,
  HttpError,
  writeRecord,
  getRecord,
  base,
  insert,
  audit,
  runAutomations,
} from "@/lib/server";
import { seed } from "@/lib/seed";
import { defaultSettings } from "@/lib/config";
export const dynamic = "force-dynamic";
function failure(e: any) {
  console.error(e);
  return Response.json(
    {
      error:
        e instanceof HttpError
          ? e.message
          : String(e.message).includes("FOREIGN KEY")
            ? "This record has linked history. Archive it instead."
            : "Unable to complete the request. " +
              (String(e.message).includes("Demo data")
                ? e.message
                : "Please try again."),
    },
    { status: e.status || 400 },
  );
}
export async function GET() {
  try {
    const user = await identity();
    const initialized = await db()
      .prepare("SELECT id FROM settings WHERE workspace=?")
      .bind(user.workspace)
      .first();
    if (!initialized && user.role === "Owner") {
      const existing = await rows("organizations", user.workspace);
      if (!existing.length) await seed(user);
      await db()
        .prepare(
          "INSERT OR IGNORE INTO settings(id,workspace,data) VALUES(?,?,?)",
        )
        .bind(user.workspace, user.workspace, JSON.stringify(defaultSettings))
        .run();
    }
    await runAutomations(user);
    const data: any = {};
    for (const entity of Object.keys(tableNames)) {
      if (allowed(user, entity))
        data[entity] = (await rows(entity, user.workspace)).filter((r: any) =>
          allowed(user, entity, r),
        );
      else data[entity] = [];
    }
    return Response.json({
      user,
      data,
      settings: await settings(user.workspace),
    });
  } catch (e) {
    return failure(e);
  }
}
export async function POST(request: Request) {
  try {
    const origin = request.headers.get("origin");
    if (origin && origin !== new URL(request.url).origin)
      throw new HttpError(403, "Cross-origin requests are not permitted.");
    const user = await identity();
    const body: any = await request.json();
    const { action, entity, recordId } = body;
    if (action === "save") {
      const old = recordId
        ? await getRecord(entity, recordId, user.workspace)
        : undefined;
      const record = await writeRecord(user, entity, body.record, old);
      return Response.json({ record });
    }
    if (action === "delete") {
      const r = await getRecord(entity, recordId, user.workspace);
      if (!allowed(user, entity, r, true))
        throw new HttpError(403, "You cannot delete this record.");
      if (
        ["payments", "expenses", "auditLogs", "automationLogs"].includes(entity)
      )
        throw new HttpError(
          400,
          "Financial and audit history cannot be deleted. Edit the status or record a correction.",
        );
      if (
        entity === "stages" &&
        (await rows("deals", user.workspace)).some(
          (d: any) => d.status === r.name,
        )
      )
        throw new HttpError(
          400,
          "Move deals out of this stage before deleting it.",
        );
      if (entity === "leads" && r.status === "Converted")
        throw new HttpError(
          400,
          "Converted leads retain their history. Archive this lead instead.",
        );
      await db().batch([
        db()
          .prepare(
            `DELETE FROM ${tableNames[entity]} WHERE id=? AND workspace=?`,
          )
          .bind(recordId, user.workspace),
        audit(user, "Deleted", entity, r),
      ]);
      if (entity === "documents" && process.env.BLOB_READ_WRITE_TOKEN) await del(r.key);
      return Response.json({ ok: true });
    }
    if (action === "convert") {
      const lead = await getRecord("leads", recordId, user.workspace);
      if (!allowed(user, "leads", lead, true))
        throw new HttpError(403, "Not permitted");
      if (lead.status === "Converted")
        throw new HttpError(409, "Lead already converted.");
      const normal = (v: any) =>
        String(v || "")
          .toLowerCase()
          .replace(/[^\p{L}\p{N}]/gu, "");
      const matchedOrg = (await rows("organizations", user.workspace)).find(
        (o: any) =>
          normal(o.name) === normal(lead.name) ||
          (lead.email && o.email === lead.email),
      );
      const org = lead.organizationId
        ? await getRecord("organizations", lead.organizationId, user.workspace)
        : matchedOrg ||
          base(user.workspace, lead.name, "Prospect", {
            type: lead.type,
            city: lead.city,
            email: lead.email,
            phone: lead.phone,
            owner: user.email,
            demo: lead.demo,
          });
      const matchedContact = (await rows("contacts", user.workspace)).find(
        (c: any) =>
          c.organizationId === org.id &&
          ((lead.email && c.email === lead.email) ||
            (lead.contactPerson &&
              normal(c.name) === normal(lead.contactPerson))),
      );
      const contact = lead.contactId
        ? await getRecord("contacts", lead.contactId, user.workspace)
        : matchedContact ||
          base(user.workspace, lead.contactPerson || lead.name, "Active", {
            organizationId: org.id,
            email: lead.email,
            phone: lead.phone,
            owner: user.email,
            demo: lead.demo,
          });
      const deal = base(
        user.workspace,
        body.name || `${lead.name} · Chess event`,
        "Qualification",
        {
          id: lead.id + "-conversion",
          organizationId: org.id,
          contactId: contact.id,
          leadId: lead.id,
          value: lead.value,
          probability: 10,
          owner: user.email,
          demo: lead.demo,
          dueDate: lead.dueDate,
        },
      );
      const batch = [];
      if (!lead.organizationId && !matchedOrg)
        batch.push(insert("organizations", org));
      if (!lead.contactId && !matchedContact)
        batch.push(insert("contacts", contact));
      batch.push(
        insert("deals", deal),
        db()
          .prepare(
            "UPDATE leads SET status='Converted',organization_id=?,contact_id=?,updated_at=? WHERE id=? AND workspace=? AND status!='Converted'",
          )
          .bind(
            org.id,
            contact.id,
            new Date().toISOString(),
            lead.id,
            user.workspace,
          ),
        audit(user, "Converted", "leads", lead),
      );
      await db().batch(batch);
      return Response.json({ record: deal });
    }
    if (action === "convertOrganization") {
      const org = await getRecord("organizations", recordId, user.workspace);
      if (
        !allowed(user, "leads", undefined, true) ||
        !allowed(user, "organizations", org, true)
      )
        throw new HttpError(403, "Not permitted");
      const existing = (await rows("leads", user.workspace)).find(
        (l: any) => l.organizationId === org.id,
      );
      if (existing) return Response.json({ record: existing });
      const lead = await writeRecord(user, "leads", {
        name: org.name,
        type: org.type || "Private School",
        status: "New",
        source: "Organization",
        organizationId: org.id,
        email: org.email,
        phone: org.phone,
        city: org.city,
        website: org.website,
        address: org.address,
        custom: org.custom,
      });
      return Response.json({ record: lead });
    }
    if (action === "eventFromDeal") {
      const deal = await getRecord("deals", recordId, user.workspace);
      if (!allowed(user, "events", undefined, true))
        throw new HttpError(403, "Not permitted");
      if (deal.status !== "Closed Won")
        throw new HttpError(400, "Mark the deal Closed Won first.");
      const existing = (await rows("events", user.workspace)).find(
        (e: any) => e.dealId === deal.id,
      );
      if (existing) return Response.json({ record: existing });
      const event = base(user.workspace, deal.name, "Planning", {
        id: deal.id + "-event",
        organizationId: deal.organizationId,
        dealId: deal.id,
        value: deal.value,
        dueDate: deal.expectedEventDate || null,
        owner: user.email,
        demo: deal.demo,
      });
      await db().batch([
        insert("events", event),
        audit(user, "Created from deal", "events", event),
      ]);
      return Response.json({ record: event });
    }
    if (action === "template") {
      const event = await getRecord("events", recordId, user.workspace);
      if (!allowed(user, "checklists", event, true))
        throw new HttpError(403, "Not permitted");
      const existing = await rows("checklists", user.workspace);
      const names = [
        "Confirm school approval",
        "Agree on event date",
        "Confirm venue",
        "Confirm participant count",
        "Prepare chess boards",
        "Prepare chess clocks",
        "Arrange transportation",
        "Confirm staff",
        "Prepare registration sheets",
        "Complete final school confirmation",
        "Run the event",
        "Collect feedback",
        "Record event financials",
      ];
      const statements = names
        .filter(
          (n) =>
            !existing.some((c: any) => c.eventId === event.id && c.name === n),
        )
        .map((n) =>
          insert(
            "checklists",
            base(user.workspace, n, "To Do", {
              eventId: event.id,
              dueDate: event.dueDate,
              owner: event.owner,
              demo: event.demo,
            }),
          ),
        );
      if (statements.length) await db().batch(statements);
      return Response.json({ ok: true });
    }
    if (action === "readNotifications") {
      const list = (await rows("notifications", user.workspace)).filter(
        (r: any) => allowed(user, "notifications", r),
      );
      const batch = list
        .filter((r: any) => !recordId || r.id === recordId)
        .map((r: any) =>
          db()
            .prepare(
              "UPDATE notifications SET status='Read' WHERE id=? AND workspace=?",
            )
            .bind(r.id, user.workspace),
        );
      if (batch.length) await db().batch(batch);
      return Response.json({ ok: true });
    }
    if (action === "seed") {
      if (user.role !== "Owner")
        throw new HttpError(403, "Owner access required.");
      await seed(user);
      return Response.json({ ok: true });
    }
    if (action === "removeDemo") {
      if (user.role !== "Owner")
        throw new HttpError(403, "Owner access required.");
      const tables = [
        "quotation_items",
        "allocations",
        "payments",
        "expenses",
        "documents",
        "participants",
        "checklists",
        "tasks",
        "activities",
        "proposals",
        "events",
        "deals",
        "leads",
        "contacts",
        "organizations",
        "inventory",
        "automation_logs",
        "automations",
        "notifications",
        "goals",
        "campaigns",
        "stages",
      ];
      await db().batch(
        tables.map((t) =>
          db()
            .prepare(`DELETE FROM ${t} WHERE workspace=? AND demo=1`)
            .bind(user.workspace),
        ),
      );
      return Response.json({ ok: true });
    }
    if (action === "settings") {
      if (user.role !== "Owner")
        throw new HttpError(403, "Owner access required.");
      const old = await settings(user.workspace);
      const cfg = { ...old, ...body.settings };
      if (!Array.isArray(cfg.leadStatuses) || !cfg.leadStatuses.length)
        throw new HttpError(400, "Provide at least one lead status.");
      if (
        !Number.isFinite(Number(cfg.inactiveDays)) ||
        Number(cfg.inactiveDays) < 1
      )
        throw new HttpError(400, "Inactive days must be positive.");
      if (!/^[A-Z]{3}$/.test(cfg.currency))
        throw new HttpError(400, "Use a three-letter currency code.");
      await db()
        .prepare(
          "INSERT INTO settings(id,workspace,data) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data",
        )
        .bind(user.workspace, user.workspace, JSON.stringify(cfg))
        .run();
      return Response.json({ ok: true });
    }
    if (action === "invite") {
      if (user.role !== "Owner")
        throw new HttpError(403, "Owner access required");
      const email = String(body.email || "")
        .trim()
        .toLowerCase();
      if (
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
        !["Manager", "Sales", "Event Staff"].includes(body.role)
      )
        throw new HttpError(400, "Provide a valid email and role.");
      const found = await db()
        .prepare("SELECT id FROM users WHERE lower(email)=?")
        .bind(email)
        .first();
      if (found) throw new HttpError(409, "This email is already registered.");
      await db()
        .prepare(
          "INSERT INTO users(id,workspace,email,name,role) VALUES(?,?,?,?,?)",
        )
        .bind(crypto.randomUUID(), user.workspace, email, email, body.role)
        .run();
      return Response.json({ ok: true });
    }
    if (action === "runAutomations") {
      if (!["Owner", "Manager"].includes(user.role))
        throw new HttpError(403, "Not permitted");
      await runAutomations(user);
      return Response.json({ ok: true });
    }
    if (action === "export") {
      if (user.role !== "Owner")
        throw new HttpError(403, "Owner access required.");
      const data: any = {};
      for (const entity of Object.keys(tableNames))
        data[entity] = await rows(entity, user.workspace);
      data.settings = await settings(user.workspace);
      return Response.json({ exportedAt: new Date().toISOString(), ...data });
    }
    if (action === "import") {
      if (
        ![
          "leads",
          "organizations",
          "contacts",
          "inventory",
          "participants",
        ].includes(entity) ||
        !Array.isArray(body.records) ||
        body.records.length > 500
      )
        throw new HttpError(400, "Import up to 500 records at a time.");
      const result = { imported: 0, errors: [] as any[] };
      for (const [i, record] of body.records.entries()) {
        try {
          await writeRecord(user, entity, record);
          result.imported++;
        } catch (e: any) {
          result.errors.push({ row: i + 2, error: e.message });
        }
      }
      return Response.json(result);
    }
    throw new HttpError(400, "Unknown action");
  } catch (e) {
    return failure(e);
  }
}
