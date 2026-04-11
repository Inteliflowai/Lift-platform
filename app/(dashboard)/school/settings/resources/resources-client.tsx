"use client";

import { useState, useEffect } from "react";
import { Plus, Pencil, X, Check, Lightbulb } from "lucide-react";

interface Resource {
  id: string;
  name: string;
  resource_type: string;
  description: string | null;
  available_for_grades: string[];
  is_active: boolean;
}

const RESOURCE_TYPES = [
  { value: "academic", label: "Academic" },
  { value: "social", label: "Social" },
  { value: "counseling", label: "Counseling" },
  { value: "learning_support", label: "Learning Support" },
  { value: "enrichment", label: "Enrichment" },
  { value: "other", label: "Other" },
];

const GRADE_OPTIONS = ["K-2", "3-5", "6-8", "9-12"];

const STARTER_SUGGESTIONS = [
  { name: "Weekly Academic Tutoring", resource_type: "academic", description: "One-on-one or small group academic tutoring sessions" },
  { name: "Learning Specialist Consultations", resource_type: "learning_support", description: "Regular check-ins with a learning specialist for strategy development" },
  { name: "Peer Mentor Program", resource_type: "social", description: "Pairing new students with trained peer mentors for social integration" },
  { name: "School Counselor", resource_type: "counseling", description: "Individual counseling sessions for transition adjustment and emotional support" },
];

const emptyForm = {
  name: "",
  resource_type: "academic",
  description: "",
  available_for_grades: [] as string[],
  is_active: true,
};

export function ResourcesClient() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    fetchResources();
  }, []);

  async function fetchResources() {
    const res = await fetch("/api/school/resources");
    const data = await res.json();
    setResources(Array.isArray(data) ? data : []);
    setLoading(false);
    // Show suggestions if no resources exist
    if (Array.isArray(data) && data.length === 0) setShowSuggestions(true);
  }

  async function handleSave() {
    setSaving(true);
    if (editingId) {
      await fetch("/api/school/resources", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingId, ...form }),
      });
    } else {
      await fetch("/api/school/resources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    }
    setSaving(false);
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
    fetchResources();
  }

  async function handleToggleActive(r: Resource) {
    await fetch("/api/school/resources", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: r.id, is_active: !r.is_active }),
    });
    fetchResources();
  }

  async function addSuggestion(s: typeof STARTER_SUGGESTIONS[0]) {
    await fetch("/api/school/resources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...s, available_for_grades: [], is_active: true }),
    });
    fetchResources();
  }

  function startEdit(r: Resource) {
    setEditingId(r.id);
    setForm({
      name: r.name,
      resource_type: r.resource_type,
      description: r.description || "",
      available_for_grades: r.available_for_grades ?? [],
      is_active: r.is_active,
    });
    setShowForm(true);
  }

  function toggleGrade(grade: string) {
    setForm((f) => ({
      ...f,
      available_for_grades: f.available_for_grades.includes(grade)
        ? f.available_for_grades.filter((g) => g !== grade)
        : [...f.available_for_grades, grade],
    }));
  }

  if (loading) return <p className="py-8 text-center text-muted">Loading resources...</p>;

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-lift-text">Support Resources</h1>
          <p className="mt-1 text-sm text-muted">
            Configure the support resources available at your school. These are used when generating AI support plans for admitted candidates.
          </p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditingId(null); setForm(emptyForm); }}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
        >
          <Plus size={16} /> Add Resource
        </button>
      </div>

      {/* Starter Suggestions */}
      {showSuggestions && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lightbulb size={18} className="text-amber-600" />
              <span className="text-sm font-medium text-amber-800">Get started with common resources</span>
            </div>
            <button onClick={() => setShowSuggestions(false)} className="text-amber-400 hover:text-amber-600">
              <X size={16} />
            </button>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {STARTER_SUGGESTIONS.map((s) => (
              <button
                key={s.name}
                onClick={() => addSuggestion(s)}
                className="rounded-lg border border-amber-200 bg-white px-3 py-2 text-left text-sm hover:border-amber-400"
              >
                <span className="font-medium text-lift-text">{s.name}</span>
                <span className="mt-0.5 block text-xs text-muted capitalize">{s.resource_type.replace("_", " ")}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Add/Edit Form */}
      {showForm && (
        <div className="rounded-lg border border-lift-border bg-surface p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-lift-text">
            {editingId ? "Edit Resource" : "New Resource"}
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted">Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full rounded-lg border border-lift-border px-3 py-2 text-sm"
                placeholder="e.g. Weekly Academic Tutoring"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted">Type</label>
              <select
                value={form.resource_type}
                onChange={(e) => setForm((f) => ({ ...f, resource_type: e.target.value }))}
                className="w-full rounded-lg border border-lift-border px-3 py-2 text-sm"
              >
                {RESOURCE_TYPES.map((rt) => (
                  <option key={rt.value} value={rt.value}>{rt.label}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-muted">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className="w-full rounded-lg border border-lift-border px-3 py-2 text-sm"
                rows={2}
                placeholder="Brief description of this resource"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-muted">Available for Grades (leave empty for all)</label>
              <div className="flex gap-2">
                {GRADE_OPTIONS.map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => toggleGrade(g)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                      form.available_for_grades.includes(g)
                        ? "bg-primary text-white"
                        : "bg-gray-100 text-muted hover:bg-gray-200"
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving || !form.name}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
            >
              <Check size={14} /> {saving ? "Saving..." : editingId ? "Update" : "Add"}
            </button>
            <button
              onClick={() => { setShowForm(false); setEditingId(null); setForm(emptyForm); }}
              className="rounded-lg border border-lift-border px-4 py-2 text-sm text-muted hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Resources Table */}
      {resources.length > 0 ? (
        <div className="overflow-hidden rounded-lg border border-lift-border">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs font-medium text-muted uppercase">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Grades</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-lift-border">
              {resources.map((r) => (
                <tr key={r.id} className={r.is_active ? "" : "opacity-50"}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-lift-text">{r.name}</div>
                    {r.description && <div className="mt-0.5 text-xs text-muted">{r.description}</div>}
                  </td>
                  <td className="px-4 py-3 capitalize">{r.resource_type.replace("_", " ")}</td>
                  <td className="px-4 py-3">
                    {r.available_for_grades?.length > 0
                      ? r.available_for_grades.join(", ")
                      : <span className="text-muted">All</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${r.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {r.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => startEdit(r)} className="mr-2 text-muted hover:text-primary" title="Edit">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => handleToggleActive(r)} className="text-muted hover:text-amber-600" title={r.is_active ? "Deactivate" : "Activate"}>
                      {r.is_active ? <X size={14} /> : <Check size={14} />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : !showSuggestions ? (
        <div className="rounded-lg border border-dashed border-lift-border p-8 text-center">
          <p className="text-sm text-muted">No support resources configured yet.</p>
          <button
            onClick={() => setShowSuggestions(true)}
            className="mt-2 text-sm font-medium text-primary hover:underline"
          >
            Show starter suggestions
          </button>
        </div>
      ) : null}
    </div>
  );
}
