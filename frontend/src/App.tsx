import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import {
  Archive,
  BarChart3,
  BookOpenText,
  CalendarDays,
  Check,
  Clock,
  FileUp,
  Flame,
  FolderArchive,
  History,
  LayoutDashboard,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { api } from "./api";
import { PlantIcon } from "./icons";
import type { Activity, ConfidenceEntry, Dashboard, Detail, GrowthItem, Note } from "./types";

const blankItem = { title: "", description: "", category: "Skills" };
const archiveReasons = ["Goal Achieved", "Lost Interest", "No Time", "Too Difficult", "Replaced By Another Interest", "No Longer Relevant", "Other"];

function parseTimestamp(value: string): Date {
  const tzPattern = /[+-]\d{2}:\d{2}$/;
  if (value.endsWith("Z") || tzPattern.test(value)) {
    return new Date(value);
  }
  return new Date(`${value}Z`);
}

export function App() {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [selectedId, setSelectedId] = useState<string>("");
  const [categories, setCategories] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [form, setForm] = useState(blankItem);
  const [note, setNote] = useState({ title: "", content: "" });
  const [confidence, setConfidence] = useState({ discussScore: 0, applyScore: 0, teachScore: 0, note: "" });
  const [archiveReason, setArchiveReason] = useState(archiveReasons[0]);
  const [error, setError] = useState("");

  async function refresh(nextId = selectedId) {
    const [dash, meta] = await Promise.all([api.dashboard(), api.meta()]);
    setDashboard(dash);
    setCategories(meta.categories);
    const chosen = nextId || dash.active[0]?.id || dash.items[0]?.id || "";
    setSelectedId(chosen);
    if (chosen) setDetail(await api.detail(chosen));
  }

  useEffect(() => {
    refresh().catch((err) => setError(err.message));
  }, []);

  const visibleItems = useMemo(() => {
    const items = dashboard?.items ?? [];
    return items.filter((item) => {
      const statusOk = statusFilter === "all" || item.status === statusFilter;
      const q = query.trim().toLowerCase();
      const queryOk = !q || [item.title, item.description, item.category].join(" ").toLowerCase().includes(q);
      return statusOk && queryOk;
    });
  }, [dashboard, statusFilter, query]);

  async function selectItem(id: string) {
    setSelectedId(id);
    setDetail(await api.detail(id));
  }

  async function createItem(event: FormEvent) {
    event.preventDefault();
    if (!form.title.trim()) return;
    const created = await api.createItem(form);
    setForm(blankItem);
    await refresh(created.id);
  }

  async function createNote(event: FormEvent) {
    event.preventDefault();
    if (!detail || !note.title.trim()) return;
    await api.createNote(detail.item.id, note);
    setNote({ title: "", content: "" });
    await refresh(detail.item.id);
  }

  async function addConfidence(event: FormEvent) {
    event.preventDefault();
    if (!detail) return;
    await api.confidence(detail.item.id, confidence);
    setConfidence({ discussScore: 0, applyScore: 0, teachScore: 0, note: "" });
    await refresh(detail.item.id);
  }

  async function uploadFile(file?: File) {
    if (!detail || !file) return;
    await api.upload(detail.item.id, file);
    await refresh(detail.item.id);
  }

  async function updateNote(noteId: string, payload: { title: string; content: string }) {
    if (!detail) return;
    await api.updateNote(noteId, payload);
    await refresh(detail.item.id);
  }

  async function deleteNote(noteId: string) {
    if (!detail) return;
    await api.deleteNote(noteId);
    await refresh(detail.item.id);
  }

  async function setStatus(status: "Active" | "Archived" | "Abandoned") {
    if (!detail) return;
    if (status === "Archived" && !window.confirm("Archive this growth item? You can restore it later.")) return;
    if (status === "Abandoned" && !window.confirm("Mark this growth item as abandoned?")) return;
    await api.updateItem(detail.item.id, { status, archivedReason: status === "Archived" ? archiveReason : null });
    await refresh(detail.item.id);
  }

  async function deleteSelected() {
    if (!detail) return;
    if (!window.confirm("Delete this growth item permanently? This cannot be undone.")) return;
    const next = dashboard?.items.find((item) => item.id !== detail.item.id)?.id ?? "";
    await api.deleteItem(detail.item.id);
    setDetail(null);
    await refresh(next);
  }

  if (!dashboard) {
    return (
      <main className="grid min-h-screen place-items-center bg-paper text-ink">
        <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-mist px-5 py-4 shadow-soft">
          <PlantIcon name="sprout" className="h-7 w-7 text-canopy" />
          <span className="font-medium">Growing your local forest...</span>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-paper text-ink">
      <header className="border-b border-white/10 bg-[#070B0F]/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-lg border border-canopy/30 bg-[#10161D] text-canopy">
              <PlantIcon name="pine" className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-normal text-canopy">BrainVerge</h1>
              <p className="text-sm text-moss">A local forest for skills, projects, ideas, and ambitions.</p>
            </div>
          </div>
          <div className="relative w-full lg:w-96">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-moss" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="h-11 w-full rounded-lg border border-white/10 bg-[#0B1016] pl-10 pr-3 text-sm text-ink outline-none ring-canopy/20 placeholder:text-moss focus:border-canopy focus:ring-4"
              placeholder="Search growth items, notes, and files"
            />
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-5 px-5 py-6 xl:grid-cols-[310px_1fr_390px]">
        <aside className="space-y-5">
          <SummaryCards dashboard={dashboard} />
          <CreateItem form={form} setForm={setForm} categories={categories} onSubmit={createItem} />
          <ItemList
            items={dashboard.items}
            selectedId={selectedId}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            onSelect={selectItem}
            query={query}
          />
        </aside>

        <section className="space-y-5">
          <Forest items={dashboard.active} onSelect={selectItem} />
          <Stats dashboard={dashboard} />
          <RecentTimeline activities={dashboard.recent} />
        </section>

        <aside className="space-y-5">
          {detail ? (
            <DetailPanel
              detail={detail}
              note={note}
              setNote={setNote}
              onCreateNote={createNote}
              confidence={confidence}
              setConfidence={setConfidence}
              onAddConfidence={addConfidence}
              uploadFile={uploadFile}
              archiveReason={archiveReason}
              setArchiveReason={setArchiveReason}
              setStatus={setStatus}
              deleteSelected={deleteSelected}
              updateNote={updateNote}
              deleteNote={deleteNote}
            />
          ) : (
            <Panel>
              <p className="text-sm text-moss">Create or select a Growth Item to inspect its living record.</p>
            </Panel>
          )}
          {error && <p className="rounded-lg bg-berry/10 px-4 py-3 text-sm text-berry">{error}</p>}
        </aside>
      </section>
    </main>
  );
}

function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-lg border border-white/10 bg-[#10161D] p-4 shadow-soft ${className}`}>{children}</div>;
}

function SummaryCards({ dashboard }: { dashboard: Dashboard }) {
  const cards = [
    { label: "Active", value: dashboard.summary.activeCount, icon: LayoutDashboard },
    { label: "Current streak", value: `${dashboard.summary.currentStreak}d`, icon: Flame },
    { label: "Longest streak", value: `${dashboard.summary.longestStreak}d`, icon: CalendarDays },
    { label: "Avg growth", value: `${dashboard.summary.avgGrowth}%`, icon: BarChart3 },
  ];
  return (
    <div className="grid grid-cols-2 gap-3">
      {cards.map((card) => (
        <Panel key={card.label} className="p-3">
          <card.icon className="mb-2 h-4 w-4 text-moss" />
          <p className="text-xl font-semibold text-canopy">{card.value}</p>
          <p className="text-xs text-moss">{card.label}</p>
        </Panel>
      ))}
    </div>
  );
}

function CreateItem({
  form,
  setForm,
  categories,
  onSubmit,
}: {
  form: typeof blankItem;
  setForm: (value: typeof blankItem) => void;
  categories: string[];
  onSubmit: (event: FormEvent) => void;
}) {
  return (
    <Panel>
      <div className="mb-3 flex items-center gap-2">
        <Plus className="h-4 w-4 text-canopy" />
        <h2 className="font-semibold text-ink">Plant Growth Item</h2>
      </div>
      <form onSubmit={onSubmit} className="space-y-3">
        <input className="field" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Python Programming" />
        <textarea className="field min-h-20" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What are you nurturing here?" />
        <input className="field" list="brainverge-categories" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Category" />
        <datalist id="brainverge-categories">
          {categories.map((category) => <option key={category} value={category} />)}
        </datalist>
        <button className="btn-primary w-full" type="submit">
          <Plus className="h-4 w-4" /> Plant
        </button>
      </form>
    </Panel>
  );
}

function ItemList({
  items,
  selectedId,
  statusFilter,
  setStatusFilter,
  onSelect,
  query,
}: {
  items: GrowthItem[];
  selectedId: string;
  statusFilter: string;
  setStatusFilter: (value: string) => void;
  onSelect: (id: string) => void;
  query: string;
}) {
  const visible = items.filter((item) => {
    const statusOk = statusFilter === "all" || item.status === statusFilter;
    const q = query.trim().toLowerCase();
    const queryOk = !q || [item.title, item.description, item.category].join(" ").toLowerCase().includes(q);
    return statusOk && queryOk;
  });

  const archivedCount = items.filter((i) => i.status === "Archived").length;
  const abandonedCount = items.filter((i) => i.status === "Abandoned").length;

  return (
    <Panel>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="font-semibold text-ink">Growth Items</h2>
        <div className="flex items-center gap-2">
          <button
            className={`text-xs rounded-md px-2 py-1 ${statusFilter === "Archived" ? "bg-mist" : "bg-transparent"}`}
            onClick={() => {
              setStatusFilter("Archived");
              const first = items.find((i) => i.status === "Archived");
              if (first) onSelect(first.id);
            }}
          >
            Archived ({archivedCount})
          </button>
          <button
            className={`text-xs rounded-md px-2 py-1 ${statusFilter === "Abandoned" ? "bg-mist" : "bg-transparent"}`}
            onClick={() => {
              setStatusFilter("Abandoned");
              const first = items.find((i) => i.status === "Abandoned");
              if (first) onSelect(first.id);
            }}
          >
            Abandoned ({abandonedCount})
          </button>
          <select className="rounded-md border border-white/10 bg-mist px-2 py-1 text-xs text-ink" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All</option>
            <option value="Active">Active</option>
            <option value="Archived">Archived</option>
            <option value="Abandoned">Abandoned</option>
          </select>
        </div>
      </div>
      <div className="max-h-[560px] space-y-2 overflow-auto pr-1">
        {visible.map((item) => (
          <button
            key={item.id}
            onClick={() => onSelect(item.id)}
            className={`w-full rounded-lg border p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-canopy/70 hover:bg-[#151B22] ${selectedId === item.id ? "border-canopy bg-mist" : "border-white/10 bg-[#0B1016]"}`}
          >
            <div className="flex items-start gap-3">
              <PlantIcon name={item.plantIcon} className="mt-1 h-5 w-5 shrink-0 text-canopy" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{item.title}</p>
                <p className="text-xs text-moss">{item.category} · {item.growthStageLabel}</p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-canopy" style={{ width: `${item.growthScore}%` }} />
                </div>
              </div>
              <span className="text-xs font-semibold text-canopy">{item.growthScore}%</span>
            </div>
          </button>
        ))}
      </div>
    </Panel>
  );
}

function Forest({ items, onSelect }: { items: GrowthItem[]; onSelect: (id: string) => void }) {
  return (
    <section className="overflow-hidden rounded-lg border border-white/10 bg-[#10161D] shadow-soft">
      <div className="forest-bg p-5">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.16em] text-leaf">Growth Forest</p>
            <h2 className="text-3xl font-semibold text-ink">What you are tending now</h2>
          </div>
          <PlantIcon name="pine" className="h-9 w-9 text-canopy" />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((item) => (
            <button key={item.id} onClick={() => onSelect(item.id)} className="group min-h-32 rounded-lg border border-white/10 bg-[#0B1016] p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-canopy/70 hover:bg-[#151B22]">
              <PlantIcon name={item.plantIcon} className="h-10 w-10 text-canopy" />
              <p className="mt-3 line-clamp-2 text-sm font-semibold">{item.title}</p>
              <p className="mt-1 text-xs text-moss">{item.decay.message}</p>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function Stats({ dashboard }: { dashboard: Dashboard }) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Panel>
        <div className="mb-3 flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-canopy" />
          <h2 className="font-semibold text-ink">Statistics</h2>
        </div>
        <div className="space-y-3">
          {dashboard.categories.map((cat) => (
            <div key={cat.category}>
              <div className="mb-1 flex justify-between text-xs">
                <span>{cat.category}</span>
                <span>{cat.avgGrowth}% · {cat.count}</span>
              </div>
              <div className="h-2 rounded-full bg-white/10">
                <div className="h-full rounded-full bg-canopy" style={{ width: `${cat.avgGrowth}%` }} />
              </div>
            </div>
          ))}
        </div>
      </Panel>
      <Panel>
        <div className="mb-3 flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-canopy" />
          <h2 className="font-semibold text-ink">Activity Heatmap</h2>
        </div>
        <div className="grid grid-cols-[repeat(15,minmax(0,1fr))] gap-1">
          {dashboard.heatmap.map((day) => (
            <div
              key={day.date}
              title={`${day.date}: ${day.count} activities`}
              className={`aspect-square rounded-[3px] ${day.count === 0 ? "bg-white/10" : day.count < 3 ? "bg-canopy/35" : day.count < 6 ? "bg-canopy" : "bg-sun"}`}
            />
          ))}
        </div>
        <div className="mt-4 space-y-2">
          {dashboard.insights.map((insight) => (
            <p key={insight} className="rounded-md border border-white/10 bg-mist px-3 py-2 text-sm text-soil">{insight}</p>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function RecentTimeline({ activities }: { activities: Activity[] }) {
  return (
    <Panel>
      <div className="mb-3 flex items-center gap-2">
        <History className="h-4 w-4 text-canopy" />
        <h2 className="font-semibold text-ink">Recent Activity</h2>
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        {activities.slice(0, 10).map((activity) => (
          <div key={activity.id} className="rounded-md border border-white/10 bg-mist px-3 py-2 text-sm">
            <p className="font-medium">{activity.action_type}</p>
            <p className="text-xs text-moss">{activity.title} · {formatDistanceToNow(parseTimestamp(activity.timestamp), { addSuffix: true })}</p>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function DetailPanel(props: {
  detail: Detail;
  note: { title: string; content: string };
  setNote: (value: { title: string; content: string }) => void;
  onCreateNote: (event: FormEvent) => void;
  confidence: { discussScore: number; applyScore: number; teachScore: number; note: string };
  setConfidence: (value: { discussScore: number; applyScore: number; teachScore: number; note: string }) => void;
  onAddConfidence: (event: FormEvent) => void;
  uploadFile: (file?: File) => void;
  archiveReason: string;
  setArchiveReason: (reason: string) => void;
  setStatus: (status: "Active" | "Archived" | "Abandoned") => void;
  deleteSelected: () => void;
  updateNote: (noteId: string, payload: { title: string; content: string }) => void;
  deleteNote: (noteId: string) => void;
}) {
  const { detail, note, setNote, onCreateNote, confidence, setConfidence, onAddConfidence, uploadFile, archiveReason, setArchiveReason, setStatus, deleteSelected, updateNote, deleteNote } = props;
  const item = detail.item;
  return (
    <>
      <Panel>
        <div className="flex items-start gap-4">
          <div className="grid h-16 w-16 shrink-0 place-items-center rounded-lg border border-canopy/20 bg-[#EAF5EE]">
            <PlantIcon name={item.plantIcon} className="h-10 w-10 text-canopy" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-canopy">{item.category}</p>
            <h2 className="text-2xl font-semibold text-ink">{item.title}</h2>
            <p className="mt-1 text-sm text-soil">{item.description}</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <Metric label="Growth" value={`${item.growthScore}%`} />
          <Metric label="Commitment" value={`${item.commitmentScore}%`} />
          <Metric label="Confidence" value={`${item.confidenceScore}%`} />
        </div>
        <p className="mt-4 rounded-md border border-white/10 bg-mist px-3 py-2 text-sm text-soil">{item.decay.message}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {item.status !== "Active" && <button className="btn-soft" onClick={() => setStatus("Active")}><RotateCcw className="h-4 w-4" /> Restore</button>}
          {item.status === "Active" && (
            <>
              <select className="field h-10 flex-1 py-0 text-xs" value={archiveReason} onChange={(e) => setArchiveReason(e.target.value)}>
                {archiveReasons.map((reason) => <option key={reason}>{reason}</option>)}
              </select>
              <button className="btn-soft" onClick={() => setStatus("Archived")}><Archive className="h-4 w-4" /> Archive</button>
              <button className="btn-soft" onClick={() => setStatus("Abandoned")}><FolderArchive className="h-4 w-4" /> Abandon</button>
            </>
          )}
          <button className="btn-danger" onClick={deleteSelected}><Trash2 className="h-4 w-4" /> Delete</button>
        </div>
      </Panel>
      <Panel>
        <div className="mb-3 flex items-center gap-2">
          <BookOpenText className="h-4 w-4 text-canopy" />
          <h2 className="font-semibold text-ink">Notes</h2>
        </div>
        <form onSubmit={onCreateNote} className="mb-4 space-y-2">
          <input className="field" value={note.title} onChange={(e) => setNote({ ...note, title: e.target.value })} placeholder="Reflection title" />
          <textarea className="field min-h-24 font-mono text-xs" value={note.content} onChange={(e) => setNote({ ...note, content: e.target.value })} placeholder="Markdown notes..." />
          <button className="btn-primary" type="submit"><Check className="h-4 w-4" /> Save note</button>
        </form>
        <div className="max-h-72 space-y-2 overflow-auto">
          {detail.notes.map((n) => <NoteCard key={n.id} note={n} onSave={updateNote} onDelete={deleteNote} />)}
        </div>
      </Panel>
      <Panel>
        <div className="mb-3 flex items-center gap-2">
          <Flame className="h-4 w-4 text-canopy" />
          <h2 className="font-semibold text-ink">Confidence</h2>
        </div>
        <form onSubmit={onAddConfidence} className="space-y-3">
          <Range label="Discuss" value={confidence.discussScore} onChange={(value) => setConfidence({ ...confidence, discussScore: value })} />
          <Range label="Apply" value={confidence.applyScore} onChange={(value) => setConfidence({ ...confidence, applyScore: value })} />
          <Range label="Teach" value={confidence.teachScore} onChange={(value) => setConfidence({ ...confidence, teachScore: value })} />
          <input className="field" value={confidence.note} onChange={(e) => setConfidence({ ...confidence, note: e.target.value })} placeholder="Optional confidence note" />
          <button className="btn-primary" type="submit"><Check className="h-4 w-4" /> Update confidence</button>
        </form>
        <ConfidenceTrend entries={detail.confidence} />
      </Panel>
      <Panel>
        <div className="mb-3 flex items-center gap-2">
          <FileUp className="h-4 w-4 text-canopy" />
          <h2 className="font-semibold text-ink">Files</h2>
        </div>
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-canopy/35 bg-mist px-3 py-6 text-sm text-canopy">
          <Upload className="h-4 w-4" />
          Upload local material
          <input type="file" className="hidden" onChange={(e) => uploadFile(e.target.files?.[0])} />
        </label>
        <div className="mt-3 space-y-2">
          {detail.files.map((file) => (
            <div key={file.id} className="rounded-md border border-white/10 bg-[#0B1016] px-3 py-2">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">{file.file_name}</p>
                  <p className="text-xs text-moss">{Math.round(file.file_size / 1024)} KB</p>
                </div>
                <div className="flex gap-2">
                  <a
                    href={`/api/files/${file.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-soft text-xs"
                  >
                    View
                  </a>
                  <a
                    href={`/api/files/${file.id}?download=1`}
                    download={file.file_name}
                    className="btn-primary text-xs"
                  >
                    Download
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Panel>
      <Panel>
        <div className="mb-3 flex items-center gap-2">
          <Clock className="h-4 w-4 text-canopy" />
          <h2 className="font-semibold text-ink">Timeline</h2>
        </div>
        <div className="space-y-3">
          {detail.activities.slice(0, 14).map((activity) => (
            <div key={activity.id} className="border-l-2 border-leaf pl-3">
              <p className="text-sm font-medium">{activity.action_type}</p>
              <p className="text-xs text-moss">{format(parseTimestamp(activity.timestamp), "MMM d, yyyy h:mm a")}</p>
            </div>
          ))}
        </div>
      </Panel>
    </>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-white/10 bg-mist px-3 py-2">
      <p className="text-lg font-semibold text-canopy">{value}</p>
      <p className="text-xs text-moss">{label}</p>
    </div>
  );
}

function NoteCard({ note, onSave, onDelete }: { note: Note; onSave: (noteId: string, payload: { title: string; content: string }) => void; onDelete: (noteId: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ title: note.title, content: note.content });

  if (editing) {
    return (
      <article className="rounded-md border border-white/10 bg-mist p-3">
        <form
          className="space-y-2"
          onSubmit={(event) => {
            event.preventDefault();
            onSave(note.id, draft);
            setEditing(false);
          }}
        >
          <input className="field" value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} />
          <textarea className="field min-h-24 font-mono text-xs" value={draft.content} onChange={(event) => setDraft({ ...draft, content: event.target.value })} />
          <div className="flex gap-2">
            <button className="btn-primary" type="submit"><Check className="h-4 w-4" /> Save</button>
            <button className="btn-soft" type="button" onClick={() => setEditing(false)}>Cancel</button>
          </div>
        </form>
      </article>
    );
  }

  return (
    <article className="rounded-md border border-white/10 bg-mist p-3">
      <div className="flex items-start justify-between gap-2">
        <p className="font-medium">{note.title}</p>
        <div className="flex gap-1">
          <button className="rounded-md p-1 text-leaf hover:bg-white/10" title="Edit note" onClick={() => setEditing(true)}><BookOpenText className="h-4 w-4" /></button>
          <button
            className="rounded-md p-1 text-berry hover:bg-white/10"
            title="Delete note"
            onClick={() => {
              if (window.confirm("Delete this note permanently? This cannot be undone.")) {
                onDelete(note.id);
              }
            }}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
      <p className="mt-1 whitespace-pre-wrap text-sm text-soil">{note.content}</p>
      <p className="mt-2 text-xs text-moss">{formatDistanceToNow(parseTimestamp(note.updated_at), { addSuffix: true })}</p>
    </article>
  );
}

function Range({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="block">
      <div className="mb-1 flex justify-between text-xs">
        <span>{label}</span>
        <span>{value}/10</span>
      </div>
      <input className="w-full accent-canopy" min={0} max={10} type="range" value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  );
}

function ConfidenceTrend({ entries }: { entries: ConfidenceEntry[] }) {
  if (!entries.length) return <p className="mt-3 text-sm text-moss">No confidence entries yet.</p>;
  return (
    <div className="mt-4 flex h-24 items-end gap-2 rounded-md border border-white/10 bg-mist p-3">
      {entries.slice(-12).map((entry) => {
        const avg = ((entry.discuss_score + entry.apply_score + entry.teach_score) / 3) * 10;
        return <div key={entry.id} title={`${Math.round(avg)}%`} className="flex-1 rounded-t bg-canopy" style={{ height: `${Math.max(8, avg)}%` }} />;
      })}
    </div>
  );
}
