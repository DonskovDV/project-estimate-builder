import { useEffect, useState } from 'react';
import { api, Client, CreateProjectDto, Project, PROJECT_STATUSES, PROJECT_TYPES, STATUS_COLORS } from '../api';
import type { Nav } from '../App';

const TYPE_LIST = Object.entries(PROJECT_TYPES);
const STATUS_LIST = Object.entries(PROJECT_STATUSES);

export default function ProjectsPage({ nav }: { nav: Nav }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');

  const load = () =>
    Promise.all([
      api.getProjects({ status: filterStatus || undefined, type: filterType || undefined }),
      api.getClients(),
    ])
      .then(([p, c]) => { setProjects(p); setClients(c); })
      .finally(() => setLoading(false));

  useEffect(() => { load(); }, [filterStatus, filterType]);

  return (
    <div>
      <div className="section-header">
        <h2>Проекты</h2>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ Новый проект</button>
      </div>

      <div className="filters">
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">Все статусы</option>
          {STATUS_LIST.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
          <option value="">Все типы</option>
          {TYPE_LIST.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <button className="btn btn-ghost btn-sm" onClick={() => { setFilterStatus(''); setFilterType(''); }}>
          Сбросить
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="loading">Загрузка...</div>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <table>
            <thead>
              <tr>
                <th>Проект</th>
                <th>Клиент</th>
                <th>Тип</th>
                <th>Статус</th>
                <th>Расчётов</th>
                <th>Создан</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => (
                <tr key={p.id} className="clickable" onClick={() => nav.goProject(p.id)}>
                  <td><strong>{p.name}</strong></td>
                  <td>{p.client?.companyName ?? '—'}</td>
                  <td>{PROJECT_TYPES[p.type] ?? p.type}</td>
                  <td>
                    <span className="badge" style={{ background: STATUS_COLORS[p.status] }}>
                      {PROJECT_STATUSES[p.status] ?? p.status}
                    </span>
                  </td>
                  <td>{p._count?.estimates ?? 0}</td>
                  <td>{new Date(p.createdAt).toLocaleDateString('ru-RU')}</td>
                </tr>
              ))}
              {projects.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: '#999', padding: 24 }}>Нет проектов</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <ProjectForm
          clients={clients}
          onClose={() => setShowForm(false)}
          onSaved={(p) => { setShowForm(false); nav.goProject(p.id); }}
          onError={setError}
        />
      )}
    </div>
  );
}

function ProjectForm({ clients, onClose, onSaved, onError }: {
  clients: Client[];
  onClose: () => void;
  onSaved: (p: Project) => void;
  onError: (e: string) => void;
}) {
  const [form, setForm] = useState<CreateProjectDto>({
    clientId: clients[0]?.id ?? 0,
    name: '',
    type: 'corporate_website',
    description: '',
  });
  const [saving, setSaving] = useState(false);
  const [localError, setLocalError] = useState('');

  const submit = async () => {
    setSaving(true);
    setLocalError('');
    try {
      const project = await api.createProject(form);
      onSaved(project);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Ошибка';
      setLocalError(msg);
      onError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h3>Новый проект</h3>
        {localError && <div className="alert alert-error">{localError}</div>}
        <div className="form">
          <div className="field">
            <label>Клиент *</label>
            <select value={form.clientId} onChange={(e) => setForm((f) => ({ ...f, clientId: Number(e.target.value) }))}>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.companyName}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Название проекта *</label>
            <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="field">
            <label>Тип проекта *</label>
            <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
              {Object.entries(PROJECT_TYPES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Описание</label>
            <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Отмена</button>
          <button className="btn btn-primary" disabled={saving || !form.clientId || !form.name} onClick={submit}>
            Создать
          </button>
        </div>
      </div>
    </div>
  );
}
