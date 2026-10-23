"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import {
  LayoutDashboard,
  Sun,
  Users,
  Building2,
  Contact,
  Target,
  CalendarDays,
  Flag,
  Package,
  ListChecks,
  FileText,
  Wallet,
  Receipt,
  BarChart3,
  FolderOpen,
  Goal,
  Zap,
  Settings2,
  Search,
  Bell,
  Plus,
  ChevronDown,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  Command,
  ArrowUpRight,
  Map,
  Calculator,
  Moon,
  X,
  Pin,
  LogOut,
  RefreshCw,
  Upload,
  Download,
  Trash2,
  Check,
  ExternalLink,
  AlertTriangle,
  Link2,
  LoaderCircle,
} from "lucide-react";
import { api, download, csv } from "@/lib/client";
import { definitions, defaultSettings, money, today } from "@/lib/config";
import {
  Badge,
  Avatar,
  Empty,
  IconButton,
  Modal,
  Loading,
  SearchInput,
  Section,
} from "./ui";
import Dashboard from "./dashboard";
import Collection, { CalendarView } from "./collection";
import RecordForm from "./record-form";
import Detail from "./detail";
import Settings from "./settings";
import {
  MyDay,
  Financial,
  Simulator,
  Reports,
  Radar,
  AutomationCenter,
  ImportDialog,
} from "./business-tools";
const groups = [
  {
    label: "WORKSPACE",
    items: [
      ["dashboard", "Command Center", LayoutDashboard],
      ["myday", "My Day", Sun],
    ],
  },
  {
    label: "SALES CRM",
    items: [
      ["leads", "Leads", Users],
      ["organizations", "Organizations", Building2],
      ["contacts", "Contacts", Contact],
      ["deals", "Deals & opportunities", Target],
      ["calendar", "Calendar", CalendarDays],
    ],
  },
  {
    label: "EVENT OPERATIONS",
    items: [
      ["events", "Events", Flag],
      ["eventcalendar", "Event calendar", CalendarDays],
      ["participants", "Participants", Users],
      ["inventory", "Equipment & inventory", Package],
      ["checklists", "Event checklists", ListChecks],
    ],
  },
  {
    label: "BUSINESS",
    items: [
      ["proposals", "Proposals & quotations", FileText],
      ["financial", "Financial overview", Wallet],
      ["expenses", "Expenses", Receipt],
      ["reports", "Reports & analytics", BarChart3],
      ["documents", "Documents", FolderOpen],
    ],
  },
  {
    label: "GROWTH & MANAGEMENT",
    items: [
      ["radar", "School opportunity radar", Map],
      ["simulator", "Event profit simulator", Calculator],
      ["goals", "Goals & targets", Goal],
      ["automations", "Automation center", Zap],
      ["settings", "Settings", Settings2],
    ],
  },
];
const nav = groups.flatMap((g) => g.items);
const descriptions: Record<string, string> = {
  myday: "Your priorities, follow-ups, and next best moves.",
  leads: "Build relationships that turn into remarkable events.",
  organizations: "One connected home for every customer relationship.",
  contacts: "The people behind your next opportunity.",
  deals: "Turn promising conversations into lasting partnerships.",
  pipeline: "See the next move in every opportunity.",
  activities: "Every conversation, captured in context.",
  tasks: "Keep the important things moving forward.",
  events: "From the first idea to the final checkmate.",
  participants: "Registration, attendance, and results in one place.",
  inventory: "The right equipment, ready at the right time.",
  proposals: "Thoughtful proposals. Clear pricing. Confident next steps.",
  financial: "Understand what’s coming in, going out, and growing.",
  reports: "A clear picture of your business, grounded in real data.",
  radar: "Find your next school partnership.",
  simulator: "Know the numbers before you make your move.",
  automations: "Let the routine work take care of itself.",
  settings: "A workspace that works the way you do.",
};
export default function Workspace() {
  const [payload, setPayload] = useState<any>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [module, setModule] = useState("dashboard"),
    [filter, setFilter] = useState(""),
    [detail, setDetail] = useState<any>(null),
    [form, setForm] = useState<any>(null),
    [importEntity, setImportEntity] = useState(""),
    [leadImport, setLeadImport] = useState(false),
    [collapsed, setCollapsed] = useState(false),
    [mobile, setMobile] = useState(false),
    [light, setLight] = useState(false),
    [searchOpen, setSearchOpen] = useState(false),
    [query, setQuery] = useState(""),
    [quick, setQuick] = useState(false),
    [toastMessage, setToastMessage] = useState<any>(null),
    [confirm, setConfirm] = useState<any>(null),
    [pending, setPending] = useState(false),
    [upload, setUpload] = useState<any>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState("");
  const toast = useCallback((message: string, isError = false) => {
    setToastMessage({ message, isError });
  }, []);
  useEffect(() => {
    if (toastMessage) {
      const t = setTimeout(() => setToastMessage(null), 5000);
      return () => clearTimeout(t);
    }
  }, [toastMessage]);
  const refresh = useCallback(async () => {
    try {
      const p = await api();
      setPayload(p);
      setError("");
      return p;
    } catch (e: any) {
      setError(e.message);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    refresh().catch(() => {});
    const t = setInterval(() => refresh().catch(() => {}), 60000);
    setLight(localStorage.getItem("checkmate-theme") === "light");
    const hash = location.hash.slice(1);
    if (nav.some((n) => n[0] === hash)) setModule(hash);
    return () => clearInterval(t);
  }, [refresh]);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen((o) => !o);
      }
      if (e.key === "Escape") {
        setQuick(false);
        setMobile(false);
      }
      if (
        e.key === "n" &&
        !["INPUT", "TEXTAREA", "SELECT"].includes(
          (e.target as HTMLElement)?.tagName,
        ) &&
        !e.ctrlKey &&
        !e.metaKey
      )
        setForm({ entity: "tasks", record: {} });
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
  useEffect(() => {
    const handler = () => {
      const hash = location.hash.slice(1);
      if (nav.some((n) => n[0] === hash)) {
        setModule(hash);
        setDetail(null);
      }
    };
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, []);
  const data = payload?.data || {};
  const settings = payload?.settings || defaultSettings;
  const user = payload?.user;
  const title =
    nav.find((n) => n[0] === module)?.[1] ||
    definitions[module]?.title ||
    "Workspace";
  const entity = module === "pipeline" ? "deals" : module;
  function navigate(next: string, f = "") {
    setModule(next);
    setFilter(f);
    setDetail(null);
    setMobile(false);
    history.replaceState(null, "", `#${next}`);
    window.scrollTo({ top: 0 });
  }
  function onOpen(e: string, r: any) {
    if (!r) return;
    setModule(e);
    setDetail({ entity: e, id: r.id });
    setSearchOpen(false);
    setMobile(false);
    window.scrollTo({ top: 0 });
  }
  function onNew(e: string, r: any = {}) {
    setForm({ entity: e, record: r });
    setQuick(false);
  }
  async function save(e: string, r: any, propagate = false) {
    try {
      if (e === "deals" && r.status === "Closed Lost" && !r.lossReason) {
        setForm({ entity: e, record: r });
        return;
      }
      await api({ action: "save", entity: e, recordId: r.id, record: r });
      await refresh();
      toast("Changes saved");
    } catch (err: any) {
      toast(err.message, true);
      if (propagate) throw err;
    }
  }
  async function onSettings(cfg: any) {
    try {
      await api({ action: "settings", settings: cfg });
      await refresh();
      toast("Workspace settings saved");
    } catch (e: any) {
      toast(e.message, true);
      throw e;
    }
  }
  function onDelete(e: string, r: any) {
    setConfirm({
      title: `Delete ${definitions[e]?.singular || "record"}?`,
      message: `“${r.name}” will be deleted. Records linked to financial or historical data are protected.`,
      execute: async () => {
        await api({ action: "delete", entity: e, recordId: r.id });
        setDetail(null);
        await refresh();
        toast("Record deleted");
      },
    });
  }
  async function executeAction(action: string, e?: string, r?: any) {
    try {
      const result = await api({ action, entity: e, recordId: r?.id });
      await refresh();
      toast(
        action === "seed"
          ? "Fictional demo workspace loaded"
          : action === "removeDemo"
            ? "Demo records removed"
            : "Action completed",
      );
      if (action === "convert") onOpen("deals", result.record);
      if (action === "convertOrganization") onOpen("leads", result.record);
      if (action === "eventFromDeal") onOpen("events", result.record);
    } catch (err: any) {
      toast(err.message, true);
      throw err;
    }
  }
  function onAction(action: string, e?: string, r?: any) {
    if (["removeDemo", "convert", "convertOrganization"].includes(action)) {
      setConfirm({
        title:
          action === "removeDemo"
            ? "Remove fictional demo data?"
            : action === "convertOrganization" ? "Convert organization to lead?" : "Convert this lead?",
        message:
          action === "removeDemo"
            ? "This removes seeded demo records. Real records that depend on demo records must be unlinked first."
            : action === "convertOrganization" ? "This keeps the organization and creates a linked lead, ready for outreach." : "This will link an organization, contact, and new deal while preserving this lead and its history.",
        execute: () => executeAction(action, e, r),
      });
    } else executeAction(action, e, r).catch(() => {});
  }
  const common = {
    data,
    settings,
    user,
    navigate,
    onOpen,
    onNew,
    onSave: save,
    onSettings,
    onAction,
    onImport: setImportEntity,
  };
  const unread =
    data.notifications?.filter((n: any) => n.status === "Unread").length || 0;
  const current = detail
    ? data[detail.entity]?.find((r: any) => r.id === detail.id)
    : null;
  const searchResults = payload
    ? [
        "organizations",
        "contacts",
        "leads",
        "deals",
        "events",
        "tasks",
        "documents",
        "proposals",
      ]
        .flatMap((e) =>
          data[e]
            .filter(
              (r: any) =>
                !query ||
                JSON.stringify(r).toLowerCase().includes(query.toLowerCase()),
            )
            .slice(0, 5)
            .map((r: any) => ({ entity: e, record: r })),
        )
        .slice(0, 30)
    : [];
  const permitted = (key: any) => {
    if (!user) return true;
    if (user.role === "Owner" || user.role === "Manager")
      return key !== "settings" || user.role === "Owner";
    if (user.role === "Sales")
      return [
        "dashboard",
        "myday",
        "notifications",
        "leads",
        "organizations",
        "contacts",
        "deals",
        "pipeline",
        "activities",
        "tasks",
        "calendar",
        "proposals",
        "documents",
        "radar",
      ].includes(key);
    return [
      "dashboard",
      "myday",
      "notifications",
      "events",
      "eventcalendar",
      "participants",
      "checklists",
      "inventory",
      "tasks",
      "documents",
    ].includes(key);
  };
  return (
    <div
      className={`app ${light ? "light" : ""} ${collapsed ? "sidebar-collapsed" : ""} ${mobile ? "mobile-open" : ""}`}
    >
      <aside className="sidebar">
        <a
          className="brand"
          href="#dashboard"
          onClick={(e) => {
            e.preventDefault();
            navigate("dashboard");
          }}
        >
          <span className="brand-symbol">♞</span>
          <div>
            <strong>
              CheckMate<span> OS</span>
            </strong>
            <small>EVERY MOVE MATTERS.</small>
          </div>
        </a>
        <div className="workspace-switch">
          <span className="workspace-avatar">CM</span>
          <div>
            <strong>CheckMate Events</strong>
            <span>Business workspace</span>
          </div>
          <ChevronDown size={14} />
        </div>
        <nav>
          {settings.pins?.length > 0 && (
            <div className="nav-group">
              <div className="nav-label">PINNED</div>
              {settings.pins
                .filter((p: string) => permitted(p))
                .map((key: string) => {
                  const n = nav.find((n) => n[0] === key);
                  return n ? (
                    <button
                      className={`nav-item ${module === key ? "active" : ""}`}
                      key={key}
                      onClick={() => navigate(key)}
                    >
                      <Pin size={16} />
                      <span>{n[1] as string}</span>
                    </button>
                  ) : null;
                })}
            </div>
          )}
          {groups.map((g) => (
            <div className="nav-group" key={g.label}>
              <div className="nav-label">{g.label}</div>
              {g.items
                .filter((n) => permitted(n[0]))
                .map(([key, label, Icon]: any) => (
                  <div className="nav-item-wrap" key={key}>
                    <button
                      title={collapsed ? label : undefined}
                      className={`nav-item ${module === key ? "active" : ""}`}
                      onClick={() => navigate(key)}
                    >
                      <Icon size={17} />
                      <span>{label}</span>
                      {key === "leads" && data.leads?.length > 0 && (
                        <b>{data.leads.length}</b>
                      )}
                      {key === "notifications" && unread > 0 && <b>{unread}</b>}
                      {key === "automations" && <i className="nav-spark" />}
                    </button>
                    {!collapsed && user?.role === "Owner" && (
                      <button
                        className={`pin-button ${settings.pins.includes(key) ? "pinned" : ""}`}
                        aria-label={`Pin ${label}`}
                        onClick={() =>
                          onSettings({
                            pins: settings.pins.includes(key)
                              ? settings.pins.filter((p: string) => p !== key)
                              : [...settings.pins, key],
                          }).catch(() => {})
                        }
                      >
                        <Pin size={10} />
                      </button>
                    )}
                  </div>
                ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="owner-avatar">{user?.name?.[0] || "C"}</div>
          <div>
            <strong>{user?.name || "Your workspace"}</strong>
            <span>{user?.role || "Private access"}</span>
          </div>
          <a
            href="/signout-with-chatgpt?return_to=%2F"
            target="_top"
            title="Sign out"
          >
            <LogOut size={16} />
          </a>
        </div>
      </aside>
      {mobile && (
        <button
          className="mobile-backdrop"
          aria-label="Close menu"
          onClick={() => setMobile(false)}
        />
      )}
      <div className="main-shell">
        <header className="topbar">
          <button
            className="icon-button sidebar-toggle"
            aria-label="Toggle sidebar"
            onClick={() => {
              if (window.innerWidth < 900) setMobile(!mobile);
              else setCollapsed(!collapsed);
            }}
          >
            {collapsed ? (
              <PanelLeftOpen size={18} />
            ) : (
              <PanelLeftClose size={18} />
            )}
          </button>
          <div className="breadcrumbs">
            <span>Workspace</span>
            <ChevronRight size={13} />
            <strong>{title as string}</strong>
            {detail && (
              <>
                <ChevronRight size={13} />
                <span>{current?.name}</span>
              </>
            )}
          </div>
          <button className="global-search" onClick={() => setSearchOpen(true)}>
            <Search size={16} />
            <span>Search anything…</span>
            <kbd>⌘ K</kbd>
          </button>
          <div className="header-actions">
            <IconButton
              icon={light ? Moon : Sun}
              label="Toggle color theme"
              onClick={() => {
                setLight(!light);
                localStorage.setItem(
                  "checkmate-theme",
                  !light ? "light" : "dark",
                );
              }}
            />
            <button
              className="icon-button notification-button"
              aria-label={`Inbox, ${unread} unread`}
              onClick={() => navigate("notifications")}
            >
              <Bell size={18} />
              {unread > 0 && settings.notificationPreferences && <i />}
            </button>
            <div className="quick-add">
              <button
                className="button primary small"
                onClick={() => setQuick(!quick)}
              >
                <Plus size={16} />
                <span>Quick add</span>
                <ChevronDown size={13} />
              </button>
              {quick && (
                <div className="quick-menu">
                  {[
                    "leads",
                    "organizations",
                    "contacts",
                    "deals",
                    "tasks",
                    "activities",
                    "events",
                    "expenses",
                    "proposals",
                  ]
                    .filter(permitted)
                    .map((e) => (
                      <button
                        key={e}
                        onClick={() =>
                          onNew(
                            e,
                            e === "activities"
                              ? { type: "Meeting", status: "Scheduled" }
                              : {},
                          )
                        }
                      >
                        <Plus size={14} />
                        New{" "}
                        {e === "activities"
                          ? "meeting"
                          : definitions[e].singular}
                      </button>
                    ))}
                </div>
              )}
            </div>
          </div>
        </header>
        <main>
          {loading ? (
            <Loading />
          ) : error && !payload ? (
            <div className="connection-state">
              <span className="brand-symbol">♞</span>
              <h1>Your next move starts here.</h1>
              <p>{error}</p>
              <a
                className="button primary"
                href="/signin-with-chatgpt?return_to=%2F"
                target="_top"
              >
                Sign in to CheckMate OS
                <ArrowUpRight size={16} />
              </a>
              <button
                className="button"
                onClick={() => refresh().catch(() => {})}
              >
                <RefreshCw size={15} />
                Retry connection
              </button>
            </div>
          ) : (
            <>
              {error && (
                <div className="error">
                  Refresh failed: {error}. Showing the last loaded records.
                </div>
              )}
              {data.leads?.some((l: any) => l.demo === 1) && (
                <div className="demo-banner">
                  <span>
                    <i />
                    DEMO WORKSPACE
                    <span className="demo-description">
                      Fictional schools & sample records. Your next real chapter
                      is ready.
                    </span>
                  </span>
                  <button onClick={() => navigate("settings")}>
                    Manage demo data
                    <ArrowRightIcon />
                  </button>
                </div>
              )}
              {detail && current ? (
                <Detail
                  key={current.id}
                  entity={detail.entity}
                  record={current}
                  {...common}
                  onBack={() => setDetail(null)}
                  onEdit={(e: string, r: any) =>
                    setForm({ entity: e, record: r })
                  }
                  onDelete={onDelete}
                  onUpload={setUpload}
                />
              ) : (
                <>
                  {module !== "dashboard" && (
                    <div className="page-intro">
                      <div>
                        <div className="eyebrow gold-text">
                          CHECKMATE WORKSPACE
                        </div>
                        <h1>{title as string}</h1>
                        <p>
                          {descriptions[module] ||
                            "Everything connected. Every detail in place."}
                        </p>
                      </div>
                      {module === "organizations" && (
                        <button
                          className="button"
                          onClick={() => setLeadImport(true)}
                        >
                          <Link2 size={16} />
                          Add from URL
                        </button>
                      )}
                      {definitions[entity] &&
                        !["documents", "notifications", "automations"].includes(
                          entity,
                        ) && (
                          <button
                            className="button primary"
                            onClick={() => onNew(entity)}
                          >
                            <Plus size={16} />
                            New {definitions[entity].singular}
                          </button>
                        )}
                    </div>
                  )}
                  {module === "dashboard" ? (
                    <Dashboard {...common} />
                  ) : module === "myday" ? (
                    <MyDay {...common} />
                  ) : module === "financial" ? (
                    <Financial {...common} />
                  ) : module === "simulator" ? (
                    <Simulator {...common} onSave={save} />
                  ) : module === "reports" ? (
                    <Reports {...common} />
                  ) : module === "radar" ? (
                    <Radar {...common} />
                  ) : module === "automations" ? (
                    <AutomationCenter {...common} />
                  ) : module === "settings" ? (
                    <Settings {...common} toast={toast} />
                  ) : ["calendar", "eventcalendar"].includes(module) ? (
                    <CalendarView
                      items={(module === "eventcalendar"
                        ? ["events"]
                        : ["events", "activities", "tasks", "leads"]
                      ).flatMap((e) =>
                        data[e]
                          .filter((r: any) => r.dueDate)
                          .map((r: any) => ({ ...r, entity: e })),
                      )}
                      onOpen={(r: any) => onOpen(r.entity, r)}
                      onCreate={(dueDate: string) =>
                        onNew(
                          module === "eventcalendar" ? "events" : "activities",
                          { dueDate, status: "Scheduled", type: "Meeting" },
                        )
                      }
                      onReschedule={(r: any, d: string) =>
                        save(r.entity, { ...r, dueDate: d })
                      }
                    />
                  ) : module === "notifications" ? (
                    <Section title={`${unread} unread notifications`} />
                  ) : module === "documents" ? (
                    <Section title="Business documents" />
                  ) : definitions[entity] ? (
                    <Collection
                      key={module}
                      entity={entity}
                      initialFilter={filter}
                      {...common}
                    />
                  ) : null}
                </>
              )}
              {!data.organizations.length &&
                !data.leads.length &&
                module === "dashboard" &&
                user.role === "Owner" && (
                  <div className="welcome-banner">
                    <div>
                      <h3>Make your first move.</h3>
                      <p>
                        Start with a lead, or explore a complete fictional demo
                        workspace.
                      </p>
                    </div>
                    <button
                      className="button primary"
                      onClick={() => onAction("seed")}
                    >
                      Explore demo workspace
                      <ArrowUpRight size={15} />
                    </button>
                  </div>
                )}
            </>
          )}
          <footer className="app-footer">
            <span>
              ♞ CheckMate OS <i>·</i> Every move matters.
            </span>
            <span>
              <i className="live-dot" />
              Private workspace{" "}
              <span className="footer-jordan">· Amman, Jordan</span>
            </span>
          </footer>
        </main>
      </div>
      {form && payload && (
        <RecordForm
          entity={form.entity}
          record={form.record}
          data={data}
          settings={settings}
          onClose={() => setForm(null)}
          onSave={(r: any) => save(form.entity, r, true)}
        />
      )}
      {importEntity && (
        <ImportDialog
          entity={importEntity}
          onClose={() => setImportEntity("")}
          onComplete={refresh}
        />
      )}
      {leadImport && (
        <LeadImportDialog
          onClose={() => setLeadImport(false)}
          onComplete={async (r: any) => {
            await refresh();
            setLeadImport(false);
            onOpen("organizations", r);
          }}
        />
      )}
      {searchOpen && (
        <Modal
          title="Find your next move"
          onClose={() => setSearchOpen(false)}
          wide
        >
          <div className="command-search">
            <Search size={20} />
            <input
              autoFocus
              placeholder="Search schools, people, deals, events…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <kbd>ESC</kbd>
          </div>
          <div className="command-results">
            {nav
              .filter(
                ([k, label]) =>
                  permitted(k) &&
                  (!query ||
                    String(label).toLowerCase().includes(query.toLowerCase())),
              )
              .slice(0, 5)
              .map(([k, label, Icon]: any) => (
                <button
                  key={k}
                  onClick={() => {
                    navigate(k);
                    setSearchOpen(false);
                  }}
                >
                  <Icon size={17} />
                  <span>Go to {label}</span>
                  <small>Navigation</small>
                </button>
              ))}
            {searchResults.map(({ entity: e, record: r }: any) => (
              <button key={r.id} onClick={() => onOpen(e, r)}>
                <Avatar name={r.name} small />
                <span>
                  {r.name}
                  <small>{r.status}</small>
                </span>
                <Badge>{definitions[e].singular}</Badge>
              </button>
            ))}
            {!searchResults.length && query && (
              <p className="quiet-empty">
                No matching records. Try a different name.
              </p>
            )}
          </div>
        </Modal>
      )}
      {confirm && (
        <Modal
          title={confirm.title}
          onClose={() => {
            if (!pending) setConfirm(null);
          }}
        >
          <p className="notes-text">{confirm.message}</p>
          <div className="modal-footer">
            <button
              className="button"
              disabled={pending}
              onClick={() => setConfirm(null)}
            >
              Cancel
            </button>
            <button
              className="button primary"
              disabled={pending}
              onClick={async () => {
                setPending(true);
                try {
                  await confirm.execute();
                  setConfirm(null);
                } catch (e: any) {
                  toast(e.message, true);
                } finally {
                  setPending(false);
                }
              }}
            >
              {pending ? "Working…" : "Confirm"}
            </button>
          </div>
        </Modal>
      )}
      {upload && (
        <Modal
          title="Upload a document"
          onClose={() => {
            setUpload(null);
            setFile(null);
            setUploadError("");
          }}
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!file) return;
              setPending(true);
              try {
                const form = new FormData();
                form.append("file", file);
                for (const [k, v] of Object.entries(upload))
                  if (v) form.append(k, String(v));
                const res = await fetch("/api/documents", {
                  method: "POST",
                  body: form,
                });
                const json: any = await res.json();
                if (!res.ok) throw new Error(json.error);
                await refresh();
                setUpload(null);
                setFile(null);
                toast("Document uploaded");
              } catch (e: any) {
                setUploadError(e.message);
              } finally {
                setPending(false);
              }
            }}
          >
            <label className="upload-zone">
              <Upload size={28} />
              <strong>Choose your file</strong>
              <span>PDFs, images, and business files · up to 10 MB</span>
              <input
                ref={fileRef}
                required
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </label>
            {["leadId", "organizationId", "dealId", "eventId"].map(
              (k: string) => {
                const e = (
                  {
                    leadId: "leads",
                    organizationId: "organizations",
                    dealId: "deals",
                    eventId: "events",
                  } as any
                )[k];
                return (
                  <label key={k}>
                    <span>Link to {definitions[e].singular}</span>
                    <select
                      value={upload[k] || ""}
                      onChange={(ev) =>
                        setUpload({ ...upload, [k]: ev.target.value })
                      }
                    >
                      <option value="">None</option>
                      {data[e].map((r: any) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  </label>
                );
              },
            )}
            {uploadError && <p className="error">{uploadError}</p>}
            <div className="modal-footer">
              <button className="button primary" disabled={pending || !file}>
                {pending ? "Uploading…" : "Upload document"}
              </button>
            </div>
          </form>
        </Modal>
      )}
      {toastMessage && (
        <div
          className={`toast ${toastMessage.isError ? "error-toast" : ""}`}
          role="status"
        >
          {toastMessage.isError ? (
            <AlertTriangle size={18} />
          ) : (
            <Check size={18} />
          )}
          <span>{toastMessage.message}</span>
          <button
            aria-label="Dismiss notification"
            onClick={() => setToastMessage(null)}
          >
            <X size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
function ArrowRightIcon() {
  return <ChevronRight size={13} />;
}
function LeadImportDialog({ onClose, onComplete }: any) {
  const [url, setUrl] = useState(""),
    [preview, setPreview] = useState<any>(null),
    [selected, setSelected] = useState<string[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const fields = [
    ["name", "Organization name"],
    ["emails", "Email"],
    ["phones", "Phone"],
    ["website", "Website"],
    ["address", "Address"],
    ["city", "City"],
    ["description", "Description"],
    ["logo", "Logo"],
    ["images", "Images"],
    ["socialLinks", "Social links"],
  ];
  async function inspect(e: any) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/lead-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "preview", url }),
      });
      const j: any = await r.json();
      if (!r.ok) throw new Error(j.error);
      setPreview(j);
      setSelected(
        fields
          .filter(
            ([k]) =>
              k === "name" ||
              (Array.isArray(j.fields[k]) ? j.fields[k].length : !!j.fields[k]),
          )
          .map(([k]) => k),
      );
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function create() {
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/lead-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create", preview, selected }),
      });
      const j: any = await r.json();
      if (!r.ok) throw new Error(j.error);
      onComplete(j.organization);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title="Add organization from URL" onClose={() => !busy && onClose()} wide>
      {!preview ? (
        <form onSubmit={inspect}>
          <p className="notes-text">
            Paste a publicly accessible school or directory page. We read only
            page metadata and visible HTML; restricted pages, private addresses,
            and rate-limited sites are not fetched.
          </p>
          <label>
            Public website URL
            <input
              required
              autoFocus
              type="url"
              placeholder="https://nshamah.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </label>
          {error && <p className="error">{error}</p>}
          <div className="modal-footer">
            <button className="button primary" disabled={busy}>
              {busy ? (
                <>
                  <LoaderCircle className="spin" size={15} />
                  Reading page…
                </>
              ) : (
                "Review extracted information"
              )}
            </button>
          </div>
        </form>
      ) : (
        <div className="smart-import">
          <p className="muted small-text">
            Source:{" "}
            <a
              className="gold-text"
              href={preview.sourceUrl}
              target="_blank"
              rel="noreferrer"
            >
              {preview.sourceUrl}
            </a>{" "}
            · Extracted {new Date(preview.extractedAt).toLocaleString()}
          </p>
          {(preview.duplicates.leads.length ||
            preview.duplicates.organizations.length) > 0 && (
            <div className="error">
              <strong>Potential duplicate found.</strong>{" "}
              {preview.duplicates.leads
                .concat(preview.duplicates.organizations)
                .map((x: any) => x.name)
                .join(", ")}
              . Creation is blocked to protect your CRM.
            </div>
          )}
          <p className="small-text muted">
            Select what to import and edit any text below. Fields marked
            “review” came from non-structured page text; missing fields are
            intentionally left blank.
          </p>
          <div className="smart-import-fields">
            {fields.map(([key, label]) => {
              const value = preview.fields[key];
              const available = Array.isArray(value)
                ? value.length > 0
                : !!value;
              return (
                <div
                  className={`smart-import-field ${!available ? "missing" : ""}`}
                  key={key}
                >
                  <label className="row">
                    <input
                      type="checkbox"
                      disabled={!available || key === "name"}
                      checked={selected.includes(key)}
                      onChange={() =>
                        setSelected(
                          selected.includes(key)
                            ? selected.filter((x) => x !== key)
                            : [...selected, key],
                        )
                      }
                    />
                    <strong>{label}</strong>
                    <small>
                      {!available
                        ? "Missing"
                        : preview.uncertain.includes(key)
                          ? "Manual review"
                          : "Extracted"}
                    </small>
                  </label>
                  {available &&
                    [
                      "name",
                      "website",
                      "address",
                      "city",
                      "description",
                    ].includes(key) && (
                      <input
                        value={value || ""}
                        onChange={(e) =>
                          setPreview({
                            ...preview,
                            fields: {
                              ...preview.fields,
                              [key]: e.target.value,
                            },
                          })
                        }
                      />
                    )}{" "}
                  {available &&
                    ["emails", "phones", "socialLinks"].includes(key) && (
                      <span>{value.join(", ")}</span>
                    )}
                  {available && key === "logo" && (
                    <img src={value} alt="Extracted logo preview" />
                  )}
                  {available && key === "images" && (
                    <span>
                      {value.length} public image URL
                      {value.length === 1 ? "" : "s"} selected; confirm reuse
                      rights before publishing.
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          {error && <p className="error">{error}</p>}
          <div className="modal-footer">
            <button
              className="button"
              disabled={busy}
              onClick={() => setPreview(null)}
            >
              Back
            </button>
            <button
              className="button primary"
              disabled={
                busy ||
                preview.duplicates.leads.length > 0 ||
                preview.duplicates.organizations.length > 0 ||
                !selected.includes("name")
              }
              onClick={create}
            >
              {busy ? "Creating…" : "Create lead"}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
