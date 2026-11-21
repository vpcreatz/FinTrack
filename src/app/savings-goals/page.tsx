"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowUpRight, CalendarDays, Check, Edit2, PiggyBank, Plus, Target, Trash2, X } from "lucide-react";
import Sidebar from "@/components/layout/Sidebar";
import { useCurrency } from "@/lib/useCurrency";

type Goal = {
  id: string;
  name: string;
  target_amount: number | string;
  current_amount: number | string;
  target_date: string | null;
  created_at: string;
};

type GoalDraft = { name: string; target_amount: string; current_amount: string; target_date: string };
const emptyDraft: GoalDraft = { name: "", target_amount: "", current_amount: "0", target_date: "" };

export default function SavingsGoalsPage() {
  const { currency, formatMoney } = useCurrency();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [draft, setDraft] = useState<GoalDraft>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadGoals = useCallback(async () => {
    try {
      const response = await fetch("/api/savings-goals");
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not load savings goals.");
      setGoals(result.goals ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load savings goals.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadGoals(); }, [loadGoals]);

  const totals = useMemo(() => goals.reduce((summary, goal) => {
    summary.saved += Number(goal.current_amount);
    summary.target += Number(goal.target_amount);
    return summary;
  }, { saved: 0, target: 0 }), [goals]);

  function openNewGoal() {
    setEditingId(null);
    setDraft(emptyDraft);
    setFormOpen(true);
    setError("");
    setNotice("");
  }

  function startEdit(goal: Goal) {
    setEditingId(goal.id);
    setDraft({
      name: goal.name,
      target_amount: String(goal.target_amount),
      current_amount: String(goal.current_amount),
      target_date: goal.target_date?.slice(0, 10) ?? "",
    });
    setFormOpen(true);
    setError("");
    setNotice("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveGoal(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/savings-goals", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(editingId ? { id: editingId } : {}),
          name: draft.name,
          target_amount: Number(draft.target_amount),
          current_amount: Number(draft.current_amount),
          target_date: draft.target_date || null,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error([result.error, result.detail].filter(Boolean).join(" — ") || "Could not save this goal.");
      setNotice(editingId ? "Goal updated." : "Goal created.");
      setDraft(emptyDraft);
      setEditingId(null);
      setFormOpen(false);
      await loadGoals();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save this goal.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteGoal(id: string) {
    if (!window.confirm("Delete this savings goal? This cannot be undone.")) return;
    setDeletingId(id);
    setError("");
    try {
      const response = await fetch("/api/savings-goals", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not delete this goal.");
      setGoals((current) => current.filter((goal) => goal.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete this goal.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-area">
        <header className="topbar"><div><h1 className="page-title">Savings Goals</h1><p className="page-subtitle">Set targets, track your progress and celebrate milestones.</p></div><button className="primary-button" onClick={openNewGoal}><Plus size={17} /> New goal</button></header>
        <main className="main-content">
          {error && <p className="notice-error" role="alert">{error}</p>}
          {notice && <p className="notice-success" role="status">{notice}</p>}

          <section className="metrics-grid">
            <div className="card"><div className="metric-top">Total saved <span className="metric-icon green"><PiggyBank size={19} /></span></div><div className="metric-value">{formatMoney(totals.saved)}</div><div className="card-description">Across {goals.length} active {goals.length === 1 ? "goal" : "goals"}</div></div>
            <div className="card"><div className="metric-top">Combined target <span className="metric-icon blue"><Target size={19} /></span></div><div className="metric-value">{formatMoney(totals.target)}</div><div className="card-description">Your savings target</div></div>
            <div className="card"><div className="metric-top">Overall progress <span className="metric-icon blue"><ArrowUpRight size={19} /></span></div><div className="metric-value">{totals.target > 0 ? `${Math.min(100, (totals.saved / totals.target) * 100).toFixed(1)}%` : "0%"}</div><div className="card-description">{formatMoney(Math.max(0, totals.target - totals.saved))} left to reach all targets</div></div>
          </section>

          {formOpen && <section className="card goal-form-card">
            <div className="card-header"><div><h2 className="card-title">{editingId ? "Edit savings goal" : "Create a savings goal"}</h2><p className="card-description">Give your goal a name and a realistic target.</p></div><button className="icon-button" type="button" aria-label="Close form" onClick={() => setFormOpen(false)}><X size={18} /></button></div>
            <form onSubmit={saveGoal} className="goal-form-grid">
              <label className="form-field"><span className="field-label">Goal name</span><input className="form-input" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="e.g. New laptop" maxLength={80} required /></label>
              <label className="form-field"><span className="field-label">Target amount ({currency})</span><input className="form-input" type="number" min="0.01" step="0.01" value={draft.target_amount} onChange={(e) => setDraft({ ...draft, target_amount: e.target.value })} required /></label>
              <label className="form-field"><span className="field-label">Already saved ({currency})</span><input className="form-input" type="number" min="0" step="0.01" value={draft.current_amount} onChange={(e) => setDraft({ ...draft, current_amount: e.target.value })} required /></label>
              <label className="form-field"><span className="field-label">Target date <span className="field-optional">(optional)</span></span><input className="form-input" type="date" value={draft.target_date} onChange={(e) => setDraft({ ...draft, target_date: e.target.value })} /></label>
              <div className="goal-form-actions"><button type="button" className="secondary-button" onClick={() => setFormOpen(false)}>Cancel</button><button type="submit" className="primary-button" disabled={saving}>{saving ? "Saving…" : editingId ? "Save changes" : "Create goal"}</button></div>
            </form>
          </section>}

          <div className="section-heading"><div><h2 className="section-title">Your goals</h2><p className="card-description">Update the saved amount as you make progress.</p></div></div>
          {loading ? <div className="card empty-state">Loading your savings goals…</div> : goals.length === 0 ? <div className="card empty-state"><div className="empty-icon"><Target size={24} /></div><h3>No savings goals yet</h3><p>Create your first goal to start tracking progress.</p><button className="primary-button" onClick={openNewGoal}><Plus size={16} /> Create a goal</button></div> : <div className="goal-grid">
            {goals.map((goal) => {
              const target = Number(goal.target_amount);
              const saved = Number(goal.current_amount);
              const percent = target > 0 ? Math.min(100, (saved / target) * 100) : 0;
              const complete = saved >= target;
              return <article className="card goal-card" key={goal.id}>
                <div className="goal-card-top"><div className="goal-symbol"><Target size={19} /></div><div className="goal-actions"><button className="icon-button" aria-label={`Edit ${goal.name}`} onClick={() => startEdit(goal)}><Edit2 size={16} /></button><button className="icon-button danger-icon" aria-label={`Delete ${goal.name}`} disabled={deletingId === goal.id} onClick={() => void deleteGoal(goal.id)}><Trash2 size={16} /></button></div></div>
                <h3 className="goal-name">{goal.name}</h3><div className="goal-amount-line"><strong>{formatMoney(saved)}</strong><span>of {formatMoney(target)}</span></div>
                <div className="progress-track goal-progress"><div className={`progress-fill ${complete ? "normal" : percent >= 75 ? "warning" : "normal"}`} style={{ width: `${percent}%` }} /></div>
                <div className="goal-meta"><span>{percent.toFixed(0)}% saved</span>{complete ? <span className="goal-complete"><Check size={13} /> Completed</span> : <span>{formatMoney(Math.max(0, target - saved))} to go</span>}</div>
                {goal.target_date && <div className="goal-date"><CalendarDays size={14} /> Target {new Date(`${goal.target_date.slice(0, 10)}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</div>}
              </article>;
            })}
          </div>}
        </main>
      </div>
    </div>
  );
}
