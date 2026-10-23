"use client";
import { useState, useMemo, useEffect } from "react";
import {
  Table2,
  LayoutGrid,
  Columns3,
  CalendarDays,
  List,
  Plus,
  Download,
  Upload,
  SlidersHorizontal,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Save,
  Archive,
  Tag,
  Check,
  ArrowUpRight,
  TrendingUp,
  X,
} from "lucide-react";
import { definitions, labels, money, today } from "@/lib/config";
import { download, csv } from "@/lib/client";
import { Badge, Avatar, Empty, SearchInput, Modal, IconButton } from "./ui";
export function CalendarView({
  items,
  onOpen,
  onCreate,
  onReschedule,
  mode = "month",
}: any) {
  const [month, setMonth] = useState(new Date());
  const [view, setView] = useState(mode);
  const start = new Date(month.getFullYear(), month.getMonth(), 1);
  const gridStart = new Date(start);
  gridStart.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  const days = Array.from(
    { length: view === "week" ? 7 : view === "day" ? 1 : 42 },
    (_, i) => {
      const d = new Date(view === "month" ? gridStart : month);
      d.setDate(d.getDate() + i);
      return d;
    },
  );
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return (
    <div className="calendar">
      <div className="calendar-toolbar">
        <div className="row">
          <IconButton
            icon={ChevronLeft}
            label="Previous"
            onClick={() =>
              setMonth(
                new Date(
                  month.getFullYear(),
                  month.getMonth() - (view === "month" ? 1 : 0),
                  month.getDate() -
                    (view === "month" ? 0 : view === "week" ? 7 : 1),
                ),
              )
            }
          />
          <h3>
            {month.toLocaleDateString("en", {
              month: "long",
              year: "numeric",
              ...(view === "month" ? {} : { day: "numeric" }),
            })}
          </h3>
          <IconButton
            icon={ChevronRight}
            label="Next"
            onClick={() =>
              setMonth(
                new Date(
                  month.getFullYear(),
                  month.getMonth() + (view === "month" ? 1 : 0),
                  month.getDate() +
                    (view === "month" ? 0 : view === "week" ? 7 : 1),
                ),
              )
            }
          />
          <button className="button small" onClick={() => setMonth(new Date())}>
            Today
          </button>
        </div>
        <select
          aria-label="Calendar view"
          value={view}
          onChange={(e) => setView(e.target.value)}
        >
          {["month", "week", "day", "agenda"].map((v) => (
            <option key={v} value={v}>
              {v[0].toUpperCase() + v.slice(1)}
            </option>
          ))}
        </select>
      </div>
      {view === "agenda" ? (
        <div className="agenda">
          {[...items]
            .filter((x) => x.dueDate)
            .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
            .map((r: any) => (
              <button key={r.id} onClick={() => onOpen(r)}>
                <time>{r.dueDate}</time>
                <span>{r.name}</span>
                <Badge>{r.status}</Badge>
              </button>
            ))}
        </div>
      ) : (
        <>
          <div
            className="calendar-weekdays"
            style={{
              gridTemplateColumns: `repeat(${view === "day" ? 1 : 7},1fr)`,
            }}
          >
            {(view === "day"
              ? [month.toLocaleDateString("en", { weekday: "long" })]
              : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
            ).map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>
          <div
            className="calendar-grid"
            style={{
              gridTemplateColumns: `repeat(${view === "day" ? 1 : 7},1fr)`,
            }}
          >
            {days.map((d) => {
              const key = fmt(d);
              return (
                <div
                  key={key}
                  className={`calendar-cell ${d.getMonth() !== month.getMonth() ? "muted-day" : ""} ${key === today() ? "today" : ""}`}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const record = items.find(
                      (r: any) => r.id === e.dataTransfer.getData("text/plain"),
                    );
                    if (record && onReschedule) onReschedule(record, key);
                  }}
                >
                  <button
                    className="day-number"
                    aria-label={`Create item on ${key}`}
                    onClick={() => onCreate?.(key)}
                  >
                    {d.getDate()}
                  </button>
                  {items
                    .filter((r: any) => r.dueDate === key)
                    .map((r: any) => (
                      <button
                        className={`calendar-event ${r.entity || ""}`}
                        key={r.id}
                        draggable={!!onReschedule}
                        onDragStart={(e) =>
                          e.dataTransfer.setData("text/plain", r.id)
                        }
                        onClick={() => onOpen(r)}
                      >
                        <span>{r.dueTime || r.startTime}</span>
                        {r.name}
                      </button>
                    ))}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
export default function Collection({
  entity,
  data,
  settings,
  onOpen,
  onNew,
  onSave,
  onImport,
  onSettings,
  initialFilter = "",
  embedded = false,
}: any) {
  const def = definitions[entity];
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState(initialFilter);
  const [priority, setPriority] = useState("");
  const [view, setView] = useState(
    entity === "deals"
      ? "kanban"
      : entity === "events" || entity === "organizations"
        ? "cards"
        : "table",
  );
  const [sort, setSort] = useState("createdAt");
  const [asc, setAsc] = useState(false);
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [columns, setColumns] = useState(
    entity === "leads"
      ? ["name", "company", "email", "phone", "source", "owner", "status"]
      : entity === "deals"
        ? ["name", "status", "organizationId", "value", "dueDate", "closedLost"]
        : [
            "name",
            "status",
            ...(entity === "inventory"
              ? ["type", "quantity", "available", "value"]
              : entity === "participants"
                ? ["eventId", "grade"]
                : ["organizationId", "value", "dueDate"]),
          ],
  );
  const [columnMenu, setColumnMenu] = useState(false);
  const [saveView, setSaveView] = useState(false);
  const [viewName, setViewName] = useState("");
  const [bulkStatus, setBulkStatus] = useState("");
  useEffect(() => {
    setStatus(initialFilter);
  }, [initialFilter]);
  const configuredStatuses =
    entity === "leads"
      ? settings.leadStatuses
      : entity === "deals" && data.stages?.length
        ? [...data.stages]
            .sort((a: any, b: any) => a.position - b.position)
            .map((s: any) => s.name)
        : def.statuses;
  // Existing workspaces can have a saved status list from before a new stage
  // was introduced. Keep every stored status visible and usable in the board.
  const statuses = Array.from(
    new Set([
      ...configuredStatuses,
      ...(data[entity] || []).map((r: any) => r.status).filter(Boolean),
    ]),
  );
  const records = useMemo(
    () =>
      [...(data[entity] || [])]
        .filter(
          (r: any) =>
            (!status || r.status === status) &&
            (!priority || r.priority === priority) &&
            (!search ||
              Object.values(r).some((v) =>
                String(v || "")
                  .toLowerCase()
                  .includes(search.toLowerCase()),
              )),
        )
        .sort((a: any, b: any) => {
          const x = a[sort] ?? "",
            y = b[sort] ?? "";
          return (
            (typeof x === "number"
              ? x - y
              : String(x).localeCompare(String(y))) * (asc ? 1 : -1)
          );
        }),
    [data, entity, status, priority, search, sort, asc],
  );
  useEffect(() => {
    setPage(0);
    setSelected([]);
  }, [search, status, priority]);
  const currency = settings.currency;
  const org = (r: any) =>
    (data.organizations || []).find((o: any) => o.id === r.organizationId)
      ?.name;
  const changeView = (v: any) => {
    setView(v);
    setPage(0);
  };
  const cell = (r: any, c: string) =>
    c === "status" ? (
      <select
        className={`inline-select ${r.status}`}
        aria-label={`Status of ${r.name}`}
        value={r.status}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => onSave(entity, { ...r, status: e.target.value })}
      >
        {statuses.map((s: string) => (
          <option key={s}>{s}</option>
        ))}
      </select>
    ) : c === "closedLost" ? (
      r.status === "Closed Lost" ? (
        <Badge>Closed Lost</Badge>
      ) : (
        <button
          className="text-button"
          onClick={(e) => {
            e.stopPropagation();
            onSave(entity, { ...r, status: "Closed Lost", probability: 0 });
          }}
        >
          Mark lost
        </button>
      )
    ) : c === "company" ? (
      org(r) || r.company || r.type || "—"
    ) : c === "available" ? (
      Math.max(
        0,
        r.quantity -
          (data.allocations || [])
            .filter(
              (a: any) =>
                a.inventoryId === r.id &&
                (["Lost", "Damaged"].includes(a.status) ||
                  (a.status === "Reserved" &&
                    data.events.some(
                      (e: any) =>
                        e.id === a.eventId &&
                        e.status !== "Cancelled" &&
                        e.dueDate <= today() &&
                        (e.endDate || e.dueDate) >= today(),
                    ))),
            )
            .reduce((s: number, a: any) => s + a.quantity, 0),
      )
    ) : c === "priority" ? (
      <Badge>{r.priority || "Medium"}</Badge>
    ) : c === "value" ? (
      money(r.value, currency)
    ) : c === "organizationId" ? (
      org(r) || "—"
    ) : c === "eventId" ? (
      (data.events || []).find((e: any) => e.id === r.eventId)?.name || "—"
    ) : c === "dueDate" ? (
      r.dueDate ? (
        <span
          className={
            r.dueDate < today() &&
            !["Completed", "Paid", "Received"].includes(r.status)
              ? "overdue"
              : ""
          }
        >
          {new Date(r.dueDate + "T12:00:00").toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
          })}
        </span>
      ) : (
        "—"
      )
    ) : (
      String(r[c] ?? "—")
    );
  async function bulk(action: string) {
    for (const r of records.filter((r: any) => selected.includes(r.id))) {
      if (action === "tags") {
        const tag = prompt("Tag to add");
        if (tag)
          await onSave(entity, {
            ...r,
            tags: [r.tags, tag].filter(Boolean).join(", "),
          });
        break;
      }
      await onSave(entity, { ...r, status: action });
    }
    setSelected([]);
  }
  const dateBasedEntities = [
    "activities",
    "tasks",
    "events",
    "checklists",
    "proposals",
    "payments",
    "expenses",
    "goals",
  ];
  const views =
    entity === "organizations"
      ? [[LayoutGrid, "cards", "Cards"]]
      : [
          [Table2, "table", "Table"],
          [LayoutGrid, "cards", "Cards"],
          [Columns3, "kanban", "Board"],
          ...(dateBasedEntities.includes(entity)
            ? [[CalendarDays, "calendar", "Calendar"]]
            : []),
          [List, "list", "List"],
          ...(entity === "deals" ? [[TrendingUp, "forecast", "Forecast"]] : []),
        ];
  return (
    <div className={embedded ? "embedded" : ""}>
      <div className="collection-toolbar">
        <div className="view-tabs">
          {views.map(([Icon, v, label]: any) => (
            <button
              key={v}
              className={view === v ? "active" : ""}
              onClick={() => changeView(v)}
            >
              <Icon size={15} />
              <span>{label}</span>
            </button>
          ))}
        </div>
        <div className="row">
          <button
            className="button small"
            onClick={() => download(`${entity}.csv`, csv(records), "text/csv")}
          >
            <Download size={14} />
            Export
          </button>
          {[
            "leads",
            "contacts",
            "organizations",
            "inventory",
            "participants",
          ].includes(entity) && (
            <button className="button small" onClick={() => onImport(entity)}>
              <Upload size={14} />
              Import
            </button>
          )}
        </div>
      </div>
      <div className="filter-toolbar">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder={`Search ${def.title.toLowerCase()}…`}
        />
        <select
          aria-label="Filter by status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">All statuses</option>
          {statuses.map((s: string) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        {["leads", "tasks"].includes(entity) && (
          <select
            aria-label="Filter priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
          >
            <option value="">All priorities</option>
            {["High", "Medium", "Low"].map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        )}
        <span className="record-count">{records.length} records</span>
        <div className="push-right row">
          <select
            aria-label="Saved view"
            value=""
            onChange={(e) => {
              const v = settings.savedViews?.find(
                (x: any) => x.name === e.target.value && x.entity === entity,
              );
              if (v) {
                setStatus(v.status);
                setPriority(v.priority);
                setSearch(v.search);
                setSort(v.sort);
                setAsc(v.asc);
                setColumns(v.columns);
                setView(v.view);
              }
            }}
          >
            <option value="">Saved views</option>
            {(settings.savedViews || [])
              .filter((v: any) => v.entity === entity)
              .map((v: any) => (
                <option key={v.name}>{v.name}</option>
              ))}
          </select>
          <IconButton
            icon={Save}
            label="Save current view"
            onClick={() => setSaveView(true)}
          />
          <IconButton
            icon={SlidersHorizontal}
            label="Choose columns"
            onClick={() => setColumnMenu(!columnMenu)}
          />
        </div>
      </div>
      {columnMenu && (
        <div className="column-settings">
          {Array.from(
            new Set([
              "name",
              ...def.fields,
              ...(entity === "deals" ? ["closedLost"] : []),
            ]),
          ).map((c: any) => (
            <label key={c}>
              <input
                type="checkbox"
                checked={columns.includes(c)}
                disabled={c === "name"}
                onChange={() =>
                  setColumns(
                    columns.includes(c)
                      ? columns.filter((x) => x !== c)
                      : [...columns, c],
                  )
                }
              />
              {labels[c] || c}
            </label>
          ))}
        </div>
      )}
      {selected.length > 0 && (
        <div className="bulk-bar">
          <span>{selected.length} selected</span>
          <select
            aria-label="Bulk status"
            value={bulkStatus}
            onChange={(e) => setBulkStatus(e.target.value)}
          >
            <option value="">Choose status</option>
            {statuses.map((s: string) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <button
            className="button small"
            disabled={!bulkStatus}
            onClick={() => bulk(bulkStatus)}
          >
            Update status
          </button>
          {entity === "leads" && (
            <>
              <button className="button small" onClick={() => bulk("Archived")}>
                <Archive size={14} />
                Archive
              </button>
              <button
                className="button small"
                onClick={async () => {
                  const tag = prompt("Tag to add to all selected leads");
                  if (tag)
                    for (const r of records.filter((r: any) =>
                      selected.includes(r.id),
                    ))
                      await onSave(entity, {
                        ...r,
                        tags: [r.tags, tag].filter(Boolean).join(", "),
                      });
                  setSelected([]);
                }}
              >
                <Tag size={14} />
                Add tag
              </button>
            </>
          )}
          <button className="text-button" onClick={() => setSelected([])}>
            Clear
          </button>
        </div>
      )}
      {!records.length ? (
        <Empty
          title={`No ${def.title.toLowerCase()} found`}
          description="Try adjusting your filters, or add your first record."
          action={
            <button className="button primary" onClick={() => onNew(entity)}>
              <Plus size={16} />
              New {def.singular}
            </button>
          }
        />
      ) : view === "calendar" ? (
        <CalendarView
          items={records}
          onOpen={(r: any) => onOpen(entity, r)}
          onCreate={(d: string) => onNew(entity, { dueDate: d })}
          onReschedule={(r: any, d: string) =>
            onSave(entity, { ...r, dueDate: d })
          }
        />
      ) : view === "kanban" ? (
        <div className="kanban">
          {statuses
            .filter(
              (s: string) =>
                entity === "deals" ||
                !["Archived", "Disqualified", "Closed Lost"].includes(s) ||
                records.some((r: any) => r.status === s),
            )
            .map((s: string, i: number) => {
              const group = records.filter((r: any) => r.status === s);
              return (
                <div
                  className="kanban-column"
                  key={s}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const r = records.find(
                      (r: any) => r.id === e.dataTransfer.getData("text/plain"),
                    );
                    if (r)
                      onSave(entity, {
                        ...r,
                        status: s,
                        ...(entity === "deals"
                          ? {
                              probability:
                                data.stages?.find((x: any) => x.name === s)
                                  ?.probability || 0,
                            }
                          : {}),
                      });
                  }}
                >
                  <div className="kanban-title">
                    <i
                      style={{
                        background: [
                          "#6366f1",
                          "#38bdf8",
                          "#a78bfa",
                          "#d4af37",
                          "#22c55e",
                        ][i % 5],
                      }}
                    />
                    <strong>{s}</strong>
                    <span>{group.length}</span>
                    <button
                      className="icon-button"
                      aria-label={`Add ${s}`}
                      onClick={() => onNew(entity, { status: s })}
                    >
                      <Plus size={15} />
                    </button>
                  </div>
                  <p className="kanban-value">
                    {money(
                      group.reduce(
                        (sum: number, r: any) => sum + Number(r.value || 0),
                        0,
                      ),
                      currency,
                    )}
                  </p>
                  {group.map((r: any) => (
                    <button
                      className="kanban-card"
                      key={r.id}
                      draggable
                      onDragStart={(e) =>
                        e.dataTransfer.setData("text/plain", r.id)
                      }
                      onClick={() => onOpen(entity, r)}
                    >
                      <div className="row-between">
                        <Avatar name={org(r) || r.name} small />
                        {r.priority && <Badge>{r.priority}</Badge>}
                      </div>
                      <h4>{r.name}</h4>
                      <p>{org(r) || r.contactPerson || r.city}</p>
                      <strong>{money(r.value, currency)}</strong>
                      <div className="kanban-card-footer">
                        <span>{r.dueDate || "No due date"}</span>
                        <span className="mini-owner">
                          {(r.owner || "O")[0].toUpperCase()}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              );
            })}
        </div>
      ) : view === "cards" ? (
        <div className="record-cards">
          {records.map((r: any) => (
            <button
              className="record-card"
              key={r.id}
              onClick={() => onOpen(entity, r)}
            >
              <div className="row-between">
                <Avatar name={r.name} imageUrl={entity === "organizations" ? (r.custom?.logoUrl || r.custom?.coverImageUrl || r.custom?.galleryImages?.[0] || "") : ""} imageFit={r.custom?.logoUrl ? "contain" : "cover"}/>
                <Badge>{r.status}</Badge>
              </div>
              <h3>{r.name}</h3>
              <p>{r.contactPerson || org(r) || r.type || r.city}</p>
              <div className="card-details">
                <span>
                  {entity === "events" ? "Event date" : "Next follow-up"}
                  <b>{r.dueDate || "Not scheduled"}</b>
                </span>
                <span>
                  {entity === "inventory" ? "Quantity" : "Expected value"}
                  <b>
                    {entity === "inventory"
                      ? r.quantity
                      : money(r.value, currency)}
                  </b>
                </span>
              </div>
              <div className="card-footer">
                <span>{r.city || r.venue || r.priority || "View details"}</span>
                <ArrowUpRight size={16} />
              </div>
            </button>
          ))}
        </div>
      ) : view === "list" ? (
        <div className="record-list">
          {records.map((r: any) => (
            <button key={r.id} onClick={() => onOpen(entity, r)}>
              <Avatar name={r.name} small />
              <span className="list-main">
                <strong>{r.name}</strong>
                <small>{r.contactPerson || org(r) || r.city}</small>
              </span>
              <Badge>{r.status}</Badge>
              <span>{r.dueDate || "—"}</span>
              <strong>{r.value != null ? money(r.value, currency) : ""}</strong>
              <ChevronRight size={16} />
            </button>
          ))}
        </div>
      ) : view === "forecast" ? (
        <div className="forecast">
          <div className="forecast-total">
            <p>Weighted pipeline forecast</p>
            <h2>
              {money(
                records
                  .filter(
                    (r: any) =>
                      !["Closed Won", "Closed Lost"].includes(r.status),
                  )
                  .reduce(
                    (s: number, r: any) => s + (r.value * r.probability) / 100,
                    0,
                  ),
                currency,
              )}
            </h2>
            <span>Deal value × win probability, excluding closed deals</span>
          </div>
          {records.map((r: any) => (
            <button
              className="forecast-row"
              key={r.id}
              onClick={() => onOpen(entity, r)}
            >
              <strong>{r.name}</strong>
              <span>{money(r.value, currency)}</span>
              <div className="progress">
                <i style={{ width: `${r.probability}%` }} />
              </div>
              <span>{r.probability}%</span>
              <b>{money((r.value * r.probability) / 100, currency)}</b>
            </button>
          ))}
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th className="checkbox-cell">
                  <input
                    aria-label="Select all filtered records"
                    type="checkbox"
                    checked={
                      records.length > 0 && selected.length === records.length
                    }
                    onChange={(e) =>
                      setSelected(
                        e.target.checked ? records.map((r: any) => r.id) : [],
                      )
                    }
                  />
                </th>
                {columns.map((c) => (
                  <th key={c} className="resizable">
                    <button
                      onClick={() => {
                        setSort(c);
                        setAsc(sort === c ? !asc : true);
                      }}
                    >
                      {labels[c] || c[0].toUpperCase() + c.slice(1)}
                      <ArrowUpDown size={12} />
                    </button>
                  </th>
                ))}
                <th />
              </tr>
            </thead>
            <tbody>
              {records.slice(page * 12, page * 12 + 12).map((r: any) => (
                <tr key={r.id}>
                  <td>
                    <input
                      type="checkbox"
                      aria-label={`Select ${r.name}`}
                      checked={selected.includes(r.id)}
                      onChange={(e) =>
                        setSelected(
                          e.target.checked
                            ? [...selected, r.id]
                            : selected.filter((x) => x !== r.id),
                        )
                      }
                    />
                  </td>
                  {columns.map((c) => (
                    <td key={c}>
                      {c === "name" ? (
                        <button
                          className="table-name"
                          onClick={() => onOpen(entity, r)}
                        >
                          <Avatar name={r.name} small />
                          <span>
                            <strong>{r.name}</strong>
                            {(r.contactPerson || org(r)) && (
                              <small>{r.contactPerson || org(r)}</small>
                            )}
                          </span>
                        </button>
                      ) : (
                        cell(r, c)
                      )}
                    </td>
                  ))}
                  <td>
                    <IconButton
                      icon={ChevronRight}
                      label={`Open ${r.name}`}
                      onClick={() => onOpen(entity, r)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="pagination">
            <span>
              Showing {page * 12 + 1}–{Math.min(page * 12 + 12, records.length)}{" "}
              of {records.length}
            </span>
            <div className="row">
              <button
                className="button small"
                disabled={page === 0}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </button>
              <span>
                {page + 1} / {Math.ceil(records.length / 12)}
              </span>
              <button
                className="button small"
                disabled={(page + 1) * 12 >= records.length}
                onClick={() => setPage(page + 1)}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
      {saveView && (
        <Modal title="Save this view" onClose={() => setSaveView(false)}>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              await onSettings({
                savedViews: [
                  ...(settings.savedViews || []).filter(
                    (v: any) => v.name !== viewName || v.entity !== entity,
                  ),
                  {
                    name: viewName,
                    entity,
                    status,
                    priority,
                    search,
                    sort,
                    asc,
                    columns,
                    view,
                  },
                ],
              });
              setSaveView(false);
            }}
          >
            <label>
              View name
              <input
                required
                value={viewName}
                onChange={(e) => setViewName(e.target.value)}
              />
            </label>
            <div className="modal-footer">
              <button className="button primary">Save view</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
