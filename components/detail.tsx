"use client";
import { useState } from "react";
import {
  ArrowLeft,
  Edit3,
  Trash2,
  Copy,
  Archive,
  ArrowRight,
  Plus,
  Phone,
  Mail,
  MessageCircle,
  CalendarDays,
  FileText,
  Check,
  Download,
  ExternalLink,
  Printer,
  MapPin,
  Users,
  Wallet,
  Package,
} from "lucide-react";
import { definitions, labels, money } from "@/lib/config";
import { Section, Badge, Avatar, Empty } from "./ui";
export default function Detail({
  entity,
  record: r,
  data,
  settings,
  onBack,
  onEdit,
  onDelete,
  onAction,
  onNew,
  onOpen,
  onSave,
  onUpload,
}: any) {
  const [tab, setTab] = useState("Overview");
  const currency = settings.currency;
  const org = data.organizations.find((o: any) => o.id === r.organizationId);
  const relation =
    entity === "organizations"
      ? "organizationId"
      : entity === "leads"
        ? "leadId"
        : entity === "deals"
          ? "dealId"
          : entity === "events"
            ? "eventId"
            : null;
  const linked = (name: string) =>
    (data[name] || []).filter(
      (x: any) =>
        (relation && x[relation] === r.id) ||
        (entity === "proposals" &&
          name === "activities" &&
          x.versionSnapshot?.id === r.id) ||
        (entity === "leads" &&
          ((name === "contacts" && x.id === r.contactId) ||
            (name === "organizations" && x.id === r.organizationId))),
    );
  const tabs =
    entity === "events"
      ? [
          "Overview",
          "Planning",
          "Participants",
          "Equipment",
          "Staff",
          "Financials",
          "Documents",
          "Results",
        ]
      : ["Overview", "Timeline", "Related records", "Notes", "Documents"];
  const checks = linked("checklists");
  const paid = data.payments
    .filter((p: any) => p.eventId === r.id && p.status === "Received")
    .reduce((s: number, p: any) => s + p.value, 0);
  const costs = data.expenses
    .filter((p: any) => p.eventId === r.id && p.status === "Paid")
    .reduce((s: number, p: any) => s + p.value, 0);
  const defaults = relation
    ? {
        [relation]: r.id,
        ...(r.organizationId ? { organizationId: r.organizationId } : {}),
      }
    : {};
  const relatedList = (name: string) => (
    <Section
      key={name}
      title={definitions[name]?.title || name}
      action={
        <button className="text-button" onClick={() => onNew(name, defaults)}>
          <Plus size={14} />
          Add
        </button>
      }
    >
      {linked(name).length ? (
        <div className="linked-list">
          {linked(name).map((x: any) => (
            <button key={x.id} onClick={() => onOpen(name, x)}>
              <span>
                <strong>{x.name}</strong>
                <small>{x.dueDate || x.type || ""}</small>
              </span>
              <Badge>{x.status}</Badge>
              <ArrowRight size={14} />
            </button>
          ))}
        </div>
      ) : (
        <p className="quiet-empty">
          No linked {definitions[name]?.title.toLowerCase()} yet.
        </p>
      )}
    </Section>
  );
  return (
    <>
      <button className="back-button" onClick={onBack}>
        <ArrowLeft size={16} />
        Back to {definitions[entity].title.toLowerCase()}
      </button>
      <div className="detail-header">
        <Avatar name={r.name} />
        <div>
          <span className="eyebrow">
            {definitions[entity].singular.toUpperCase()}
            {r.demo ? " · FICTIONAL DEMO" : ""}
          </span>
          <h1>{r.name}</h1>
          <div className="row">
            <Badge>{r.status}</Badge>
            <span className="muted">{org?.name || r.city || r.type}</span>
          </div>
        </div>
        <div className="push-right row">
          <button className="button" onClick={() => onEdit(entity, r)}>
            <Edit3 size={15} />
            Edit
          </button>
          <button
            className="icon-button danger"
            title="Delete record"
            aria-label="Delete record"
            onClick={() => onDelete(entity, r)}
          >
            <Trash2 size={17} />
          </button>
        </div>
      </div>
      <div className="detail-actions">
        {entity === "organizations" && (
          <button className="button primary" onClick={() => onAction("convertOrganization", entity, r)}>
            <ArrowRight size={15} />
            Convert to lead
          </button>
        )}
        {entity === "leads" && (
          <>
            {r.status !== "Converted" && (
              <button
                className="button primary"
                onClick={() => onAction("convert", entity, r)}
              >
                <ArrowRight size={15} />
                Convert lead
              </button>
            )}
            <button
              className="button"
              onClick={() =>
                onNew("activities", {
                  ...defaults,
                  type: "Phone Call",
                  name: `Call with ${r.contactPerson || r.name}`,
                  status: "Completed",
                  quickLog: true,
                })
              }
            >
              <Phone size={15} />
              Log call
            </button>
            <button
              className="button"
              onClick={() =>
                onNew("activities", {
                  ...defaults,
                  type: "Email",
                  name: `Email interaction · ${r.name}`,
                  status: "Completed",
                  quickLog: true,
                })
              }
            >
              <Mail size={15} />
              Log email
            </button>
            <button
              className="button"
              onClick={() =>
                onNew("activities", {
                  ...defaults,
                  type: "Text Message",
                  name: `Text message · ${r.name}`,
                  status: "Completed",
                  quickLog: true,
                })
              }
            >
              <MessageCircle size={15} />
              Log message
            </button>
            <button
              className="button"
              onClick={() =>
                onNew("tasks", { ...defaults, name: `Follow up · ${r.name}` })
              }
            >
              <Plus size={15} />
              Create task
            </button>
            <button
              className="button"
              onClick={() =>
                onNew(entity, {
                  ...r,
                  id: undefined,
                  name: r.name + " (copy)",
                  email: "",
                  phone: "",
                  status: "New",
                })
              }
            >
              <Copy size={15} />
              Duplicate
            </button>
            <button
              className="button"
              onClick={() => onSave(entity, { ...r, status: "Archived" })}
            >
              <Archive size={15} />
              Archive
            </button>
          </>
        )}
        {entity === "deals" && (
          <>
            <button
              className="button primary"
              onClick={() =>
                onSave(entity, { ...r, status: "Closed Won", probability: 100 })
              }
            >
              <Check size={15} />
              Mark won
            </button>
            {r.status === "Closed Won" && (
              <button
                className="button primary"
                onClick={() => onAction("eventFromDeal", entity, r)}
              >
                <CalendarDays size={15} />
                Create linked event
              </button>
            )}
            <button
              className="button"
              onClick={() =>
                onNew("proposals", {
                  ...defaults,
                  name: `Quotation · ${r.name}`,
                })
              }
            >
              <FileText size={15} />
              New proposal
            </button>
          </>
        )}
        {entity === "proposals" && (
          <>
            <button className="button primary" onClick={() => window.print()}>
              <Printer size={15} />
              Print / save PDF
            </button>
            <button
              className="button"
              onClick={() =>
                onNew("proposals", {
                  ...r,
                  id: undefined,
                  name: r.name + " (copy)",
                  status: "Draft",
                })
              }
            >
              <Copy size={15} />
              Duplicate quotation
            </button>
          </>
        )}
        {entity === "events" && (
          <>
            <button
              className="button primary"
              onClick={() => onNew("participants", defaults)}
            >
              <Plus size={15} />
              Register participant
            </button>
            <button
              className="button"
              onClick={() =>
                onNew("allocations", {
                  ...defaults,
                  name: `Equipment · ${r.name}`,
                })
              }
            >
              <Package size={15} />
              Allocate equipment
            </button>
            <button
              className="button"
              onClick={() =>
                onNew("payments", { ...defaults, name: `Payment · ${r.name}` })
              }
            >
              <Wallet size={15} />
              Record payment
            </button>
          </>
        )}
      </div>
      <div className="detail-tabs">
        {tabs.map((t) => (
          <button
            className={t === tab ? "active" : ""}
            key={t}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === "Overview" && (
        <>
          <div className="detail-grid">
            <Section title="Record overview">
              <dl className="record-fields">
                {definitions[entity].fields
                  .filter(
                    (f: string) =>
                      ![
                        "name",
                        "notes",
                        "items",
                        "terms",
                        "staff",
                        "results",
                      ].includes(f) &&
                      r[f] != null &&
                      r[f] !== "",
                  )
                  .map((f: string) => (
                    <div key={f}>
                      <dt>{labels[f] || f.replace(/([A-Z])/g, " $1")}</dt>
                      <dd>
                        {f.endsWith("Id") ? (
                          <button
                            className="text-button"
                            onClick={() =>
                              onOpen(
                                (
                                  {
                                    organizationId: "organizations",
                                    contactId: "contacts",
                                    leadId: "leads",
                                    dealId: "deals",
                                    eventId: "events",
                                    inventoryId: "inventory",
                                  } as any
                                )[f],
                                data[
                                  (
                                    {
                                      organizationId: "organizations",
                                      contactId: "contacts",
                                      leadId: "leads",
                                      dealId: "deals",
                                      eventId: "events",
                                      inventoryId: "inventory",
                                    } as any
                                  )[f]
                                ].find((x: any) => x.id === r[f]),
                              )
                            }
                          >
                            {data[
                              (
                                {
                                  organizationId: "organizations",
                                  contactId: "contacts",
                                  leadId: "leads",
                                  dealId: "deals",
                                  eventId: "events",
                                  inventoryId: "inventory",
                                } as any
                              )[f]
                            ]?.find((x: any) => x.id === r[f])?.name ||
                              "Linked record"}
                            <ArrowRight size={12} />
                          </button>
                        ) : f === "value" || f === "budget" ? (
                          money(r[f], currency)
                        ) : (
                          String(r[f])
                        )}
                      </dd>
                    </div>
                  ))}
                {Object.entries(r.custom || {}).map(([k, v]) => (
                  <div key={k}>
                    <dt>{k}</dt>
                    <dd>{String(v)}</dd>
                  </div>
                ))}
              </dl>
            </Section>
            <div>
              <Section
                title="Notes"
                action={
                  <button
                    className="text-button"
                    onClick={() => onEdit(entity, r)}
                  >
                    Edit
                  </button>
                }
              >
                <p className="notes-text">
                  {r.notes ||
                    "Add context, next steps, and details worth remembering."}
                </p>
              </Section>
              {entity === "events" ? (
                <Section title="Event readiness">
                  <div className="readiness">
                    <strong>
                      {checks.length
                        ? Math.round(
                            (checks.filter((c: any) => c.status === "Completed")
                              .length /
                              checks.length) *
                              100,
                          )
                        : 0}
                      %
                    </strong>
                    <p>
                      {
                        checks.filter((c: any) => c.status === "Completed")
                          .length
                      }{" "}
                      of {checks.length} preparation items completed
                    </p>
                    <div className="progress">
                      <i
                        style={{
                          width: `${checks.length ? (checks.filter((c: any) => c.status === "Completed").length / checks.length) * 100 : 0}%`,
                        }}
                      />
                    </div>
                    <button
                      className="button"
                      onClick={() => setTab("Planning")}
                    >
                      Open preparation checklist
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </Section>
              ) : (
                relatedList("tasks")
              )}
            </div>
          </div>
          {entity === "proposals" && (
            <div className="quotation-print">
              <div className="quotation-brand">
                <span className="chess-mark">♞</span>
                <div>
                  <h2>{settings.brand}</h2>
                  <p>{settings.tagline}</p>
                </div>
                <div className="push-right">
                  <h2>QUOTATION</h2>
                  <p>{r.name}</p>
                </div>
              </div>
              <div className="row-between">
                <div>
                  <small>PREPARED FOR</small>
                  <h3>{org?.name || "Customer"}</h3>
                  <p>
                    {org?.city} {org?.email}
                  </p>
                </div>
                <div>
                  <p>Valid until: {r.dueDate || "Not specified"}</p>
                  <p>Status: {r.status}</p>
                </div>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Service</th>
                    <th>Quantity</th>
                    <th>Unit price</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(r.items || []).map((item: any, i: number) => (
                    <tr key={i}>
                      <td>{item.name}</td>
                      <td>{item.quantity}</td>
                      <td>{money(item.price, currency)}</td>
                      <td>{money(item.price * item.quantity, currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="quote-total">
                <p>Discount: {money(r.discount, currency)}</p>
                <h2>Total: {money(r.value, currency)}</h2>
              </div>
              <h4>Terms & conditions</h4>
              <p className="notes-text">
                {r.terms || "Terms to be agreed with the customer."}
              </p>
            </div>
          )}
          {entity === "organizations" && (
            <div className="detail-related">
              {["contacts", "leads", "deals", "events", "proposals"].map(
                relatedList,
              )}
            </div>
          )}
        </>
      )}
      {(tab === "Timeline" || tab === "Notes") && (
        <Section
          title={
            tab === "Notes" ? "Notes & conversations" : "Activity timeline"
          }
          action={
            <button
              className="button primary"
              onClick={() =>
                onNew("activities", {
                  ...defaults,
                  type: tab === "Notes" ? "Note" : "Phone Call",
                  status: "Completed",
                  name: "",
                })
              }
            >
              <Plus size={15} />
              Add {tab === "Notes" ? "note" : "activity"}
            </button>
          }
        >
          <div className="timeline">
            {linked("activities")
              .filter((a: any) => tab !== "Notes" || a.type === "Note")
              .map((a: any) => (
                <article key={a.id}>
                  <i />
                  <div className="row-between">
                    <h4>{a.name}</h4>
                    <small>{new Date(a.createdAt).toLocaleString()}</small>
                  </div>
                  <Badge>{a.type}</Badge>
                  <p className="notes-text">
                    {a.notes}
                    {a.versionSnapshot &&
                      `Previous version: ${a.versionSnapshot.status} · ${money(a.versionSnapshot.value, currency)} · ${(a.versionSnapshot.items || []).map((i: any) => i.name).join(", ")}`}
                  </p>
                  <button
                    className="text-button"
                    onClick={() => onEdit("activities", a)}
                  >
                    Edit
                  </button>
                </article>
              ))}
            {data.auditLogs
              .filter((a: any) => a.recordId === r.id && tab === "Timeline")
              .map((a: any) => (
                <article key={a.id}>
                  <i />
                  <h4>{a.name}</h4>
                  <small>
                    {a.actor} · {new Date(a.createdAt).toLocaleString()}
                  </small>
                </article>
              ))}
          </div>
        </Section>
      )}
      {tab === "Related records" && (
        <div className="detail-related">
          {[
            "organizations",
            "contacts",
            "deals",
            "events",
            "tasks",
            "proposals",
          ]
            .filter((x) => x !== entity)
            .map(relatedList)}
        </div>
      )}
      {tab === "Planning" && (
        <Section
          title="Event preparation"
          subtitle={`${checks.filter((c: any) => c.status === "Completed").length} of ${checks.length} complete`}
          action={
            <div className="row">
              <button
                className="button"
                onClick={() => onAction("template", entity, r)}
              >
                Apply checklist template
              </button>
              <button
                className="button primary"
                onClick={() => onNew("checklists", defaults)}
              >
                <Plus size={15} />
                Add item
              </button>
            </div>
          }
        >
          <div className="checklist">
            {checks.map((c: any) => (
              <label key={c.id}>
                <input
                  type="checkbox"
                  checked={c.status === "Completed"}
                  onChange={(e) =>
                    onSave("checklists", {
                      ...c,
                      status: e.target.checked ? "Completed" : "To Do",
                    })
                  }
                />
                <span className={c.status === "Completed" ? "done" : ""}>
                  {c.name}
                </span>
                <small>{c.dueDate}</small>
                <button
                  className="text-button"
                  onClick={() => onEdit("checklists", c)}
                >
                  Edit
                </button>
              </label>
            ))}
          </div>
          {relatedList("tasks")}
        </Section>
      )}
      {tab === "Participants" && (
        <Section
          title="Registration & attendance"
          subtitle="Only collect information necessary for this event."
          action={
            <button
              className="button primary"
              onClick={() => onNew("participants", defaults)}
            >
              <Plus size={15} />
              Register participant
            </button>
          }
        >
          <div className="linked-list">
            {linked("participants").map((p: any) => (
              <div className="participant-row" key={p.id}>
                <span>
                  <strong>{p.name}</strong>
                  <small>{p.grade || "No grade recorded"}</small>
                </span>
                <select
                  aria-label={`Attendance of ${p.name}`}
                  value={p.status}
                  onChange={(e) =>
                    onSave("participants", { ...p, status: e.target.value })
                  }
                >
                  {definitions.participants.statuses.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
                <button
                  className="text-button"
                  onClick={() => onEdit("participants", p)}
                >
                  Edit / results
                </button>
              </div>
            ))}
          </div>
        </Section>
      )}
      {tab === "Equipment" && (
        <Section
          title="Equipment reservations"
          subtitle="Availability is checked against overlapping event dates."
          action={
            <button
              className="button primary"
              onClick={() =>
                onNew("allocations", {
                  ...defaults,
                  name: `Equipment · ${r.name}`,
                })
              }
            >
              <Plus size={15} />
              Reserve equipment
            </button>
          }
        >
          <div className="linked-list">
            {linked("allocations").map((a: any) => (
              <div className="participant-row" key={a.id}>
                <span>
                  <strong>
                    {
                      data.inventory.find((i: any) => i.id === a.inventoryId)
                        ?.name
                    }
                  </strong>
                  <small>{a.quantity} units reserved</small>
                </span>
                <Badge>{a.status}</Badge>
                <button
                  className="text-button"
                  onClick={() => onEdit("allocations", a)}
                >
                  Record return / damage
                </button>
              </div>
            ))}
          </div>
        </Section>
      )}
      {tab === "Staff" && (
        <Section
          title="Staff & responsibilities"
          action={
            <button className="button" onClick={() => onEdit(entity, r)}>
              Edit assignments
            </button>
          }
        >
          <p className="notes-text">
            {r.staff ||
              "Add organizer names and responsibilities in the event’s staff field."}
          </p>
        </Section>
      )}
      {tab === "Financials" && (
        <>
          <div className="kpi-grid">
            {[
              ["Agreed revenue", r.value],
              ["Amount received", paid],
              ["Actual expenses", costs],
              ["Cash profit", paid - costs],
            ].map(([l, v]: any) => (
              <div className="kpi-card" key={l}>
                <span>{l}</span>
                <strong>{money(v, currency)}</strong>
              </div>
            ))}
          </div>
          <p className="notice">
            Outstanding balance:{" "}
            <b>{money(Math.max(0, r.value - paid), currency)}</b> ·{" "}
            {paid >= r.value ? "Paid" : paid > 0 ? "Partially paid" : "Unpaid"}.
            Cash profit uses received payments less paid expenses.
          </p>
          <div className="detail-related">
            {["payments", "expenses"].map(relatedList)}
          </div>
        </>
      )}
      {tab === "Documents" && (
        <Section
          title="Attached documents"
          action={
            <button
              className="button primary"
              onClick={() => onUpload(defaults)}
            >
              <Plus size={15} />
              Upload file
            </button>
          }
        >
          <div className="linked-list">
            {linked("documents").map((d: any) => (
              <div className="participant-row" key={d.id}>
                <FileText size={20} />
                <span>
                  <strong>{d.name}</strong>
                  <small>{Math.ceil(d.size / 1024)} KB</small>
                </span>
                <a
                  className="button small"
                  href={`/api/documents?id=${d.id}&preview=1`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Preview
                </a>
                <a className="button small" href={`/api/documents?id=${d.id}`}>
                  Download
                </a>
                <button
                  className="icon-button danger"
                  aria-label="Delete document"
                  onClick={() => onDelete("documents", d)}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        </Section>
      )}
      {tab === "Results" && (
        <Section
          title="Event outcomes"
          action={
            <button className="button" onClick={() => onEdit(entity, r)}>
              Edit report
            </button>
          }
        >
          <p className="notes-text">
            {r.results ||
              "Record outcomes, feedback, winners, and improvements for the next event."}
          </p>
        </Section>
      )}
    </>
  );
}
