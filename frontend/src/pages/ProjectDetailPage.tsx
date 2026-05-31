import { useEffect, useState } from 'react';
import {
  api, CreateEstimateDto, Estimate, ProjectDetail, Service,
  PROJECT_STATUSES, PROJECT_TYPES, STATUS_COLORS, SERVICE_CATEGORIES,
  COMPLEXITY_LABELS, ESTIMATE_STATUSES, ESTIMATE_STATUS_COLORS, formatMoney,
} from '../api';
import type { Nav } from '../App';

const STATUS_LIST = Object.entries(PROJECT_STATUSES);

export default function ProjectDetailPage({ id, nav }: { id: number; nav: Nav }) {
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEstimateForm, setShowEstimateForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [error, setError] = useState('');
  const [deletePending, setDeletePending] = useState(false);

  const load = () =>
    api.getProject(id).then(setProject).catch((e) => setError(e.message)).finally(() => setLoading(false));

  useEffect(() => { load(); }, [id]);

  const changeStatus = async (status: string) => {
    try {
      await api.updateProjectStatus(id, status);
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Ошибка');
    }
  };

  const handleDelete = async () => {
    try {
      await api.deleteProject(id);
      nav.goProjects();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Ошибка удаления');
      setDeletePending(false);
    }
  };

  if (loading) return <div className="loading">Загрузка...</div>;
  if (!project) return <div className="alert alert-error">{error || 'Проект не найден'}</div>;

  const sortedEstimates = [...project.estimates].sort((a, b) => b.version - a.version);

  return (
    <div>
      <div className="section-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-ghost btn-sm" onClick={nav.goProjects}>← Проекты</button>
          <h2 style={{ margin: 0 }}>{project.name}</h2>
          <span className="badge" style={{ background: STATUS_COLORS[project.status] }}>
            {PROJECT_STATUSES[project.status]}
          </span>
        </div>
        <div className="project-actions" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setShowEditForm(true)}>✏ Редактировать</button>
          {!deletePending ? (
            <button className="btn btn-danger btn-sm" onClick={() => setDeletePending(true)}>Удалить проект</button>
          ) : (
            <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: '#c62828' }}>
                {project.estimates.length > 0
                  ? `У проекта ${project.estimates.length} расчёт(ов) — удалить нельзя`
                  : 'Удалить проект безвозвратно?'}
              </span>
              {project.estimates.length === 0 && (
                <button className="btn btn-danger btn-sm" onClick={handleDelete}>Да, удалить</button>
              )}
              <button className="btn btn-ghost btn-sm" onClick={() => setDeletePending(false)}>Отмена</button>
            </span>
          )}
          <button className="btn btn-success" onClick={() => setShowEstimateForm(true)}>+ Расчёт</button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Project info */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="form-row">
          <div className="field" style={{ flex: 'none' }}>
            <label>Клиент</label>
            <span>{project.client?.companyName}</span>
          </div>
          <div className="field" style={{ flex: 'none' }}>
            <label>Тип</label>
            <span>{PROJECT_TYPES[project.type] ?? project.type}</span>
          </div>
          {project.description && (
            <div className="field">
              <label>Описание</label>
              <span>{project.description}</span>
            </div>
          )}
          <div className="field" style={{ flex: 'none' }}>
            <label>Изменить статус</label>
            <select value={project.status} onChange={(e) => changeStatus(e.target.value)}>
              {STATUS_LIST.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Estimates */}
      <h3 style={{ margin: '0 0 12px' }}>
        Версии расчёта ({project.estimates.length})
      </h3>

      {sortedEstimates.length === 0 ? (
        <div className="alert alert-info">Расчётов ещё нет. Нажмите «+ Расчёт» чтобы создать первый.</div>
      ) : (
        sortedEstimates.map((e, idx) => (
          <EstimateCard key={e.id} estimate={e} isLatest={idx === 0} onStatusChanged={load} />
        ))
      )}

      {showEstimateForm && (
        <EstimateForm
          projectId={id}
          nextVersion={(project.estimates.length > 0 ? Math.max(...project.estimates.map((e) => e.version)) : 0) + 1}
          onClose={() => setShowEstimateForm(false)}
          onSaved={() => { setShowEstimateForm(false); load(); }}
          onError={setError}
        />
      )}

      {showEditForm && (
        <ProjectEditForm
          project={project}
          onClose={() => setShowEditForm(false)}
          onSaved={() => { setShowEditForm(false); load(); }}
          onError={setError}
        />
      )}
    </div>
  );
}

function ProjectEditForm({ project, onClose, onSaved, onError }: {
  project: ProjectDetail;
  onClose: () => void;
  onSaved: () => void;
  onError: (e: string) => void;
}) {
  const [name, setName] = useState(project.name);
  const [type, setType] = useState(project.type);
  const [description, setDescription] = useState(project.description ?? '');
  const [saving, setSaving] = useState(false);
  const [localError, setLocalError] = useState('');
  const [nameError, setNameError] = useState('');

  const submit = async () => {
    if (!name.trim()) { setNameError('Название обязательно'); return; }
    setSaving(true);
    setLocalError('');
    try {
      await api.updateProject(project.id, { name, type, description: description || undefined });
      onSaved();
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
        <h3>Редактировать проект</h3>
        {localError && <div className="alert alert-error">{localError}</div>}
        <div className="form">
          <div className="field">
            <label>Название *</label>
            <input
              value={name}
              onChange={(e) => { setName(e.target.value); if (e.target.value.trim()) setNameError(''); }}
              style={nameError ? { borderColor: '#c62828', background: '#fff8f8' } : {}}
            />
            {nameError && <span style={{ color: '#c62828', fontSize: 12 }}>{nameError}</span>}
          </div>
          <div className="field">
            <label>Тип проекта</label>
            <select value={type} onChange={(e) => setType(e.target.value)}>
              {Object.entries(PROJECT_TYPES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Описание</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Отмена</button>
          <button className="btn btn-primary" disabled={saving} onClick={submit}>Сохранить изменения</button>
        </div>
      </div>
    </div>
  );
}

function EstimateCard({ estimate, isLatest, onStatusChanged }: {
  estimate: Estimate;
  isLatest: boolean;
  onStatusChanged: () => void;
}) {
  const [open, setOpen] = useState(isLatest);
  const [statusError, setStatusError] = useState('');

  const handleStatusChange = async (status: string) => {
    setStatusError('');
    try {
      await api.updateEstimateStatus(estimate.id, status as 'draft' | 'approved' | 'rejected');
      onStatusChanged();
    } catch (e: unknown) {
      setStatusError(e instanceof Error ? e.message : 'Ошибка');
    }
  };

  return (
    <div className={`estimate-card${isLatest ? ' latest' : ''}`}>
      <div className="estimate-header" style={{ cursor: 'pointer' }} onClick={() => setOpen((o) => !o)}>
        <span className="estimate-version">v{estimate.version}</span>
        <span style={{ color: '#888', fontSize: 12 }}>{new Date(estimate.createdAt).toLocaleString('ru-RU')}</span>
        {isLatest && <span className="badge" style={{ background: '#1a237e' }}>Последняя</span>}
        <span
          className="badge"
          style={{ background: ESTIMATE_STATUS_COLORS[estimate.status] ?? '#888' }}
        >
          {ESTIMATE_STATUSES[estimate.status] ?? estimate.status}
        </span>
        {estimate.warnings.includes('low_margin_warning') && (
          <span className="warning-tag">⚠ Низкая маржа</span>
        )}
        <span style={{ marginLeft: 'auto', color: '#888' }}>{open ? '▲' : '▼'}</span>
      </div>

      {open && (
        <>
          <div className="estimate-grid">
            <div className="estimate-stat">
              <span className="estimate-stat-label">Итоговая стоимость</span>
              <span className="estimate-stat-value" style={{ color: '#1a237e' }}>{formatMoney(estimate.totalPrice)}</span>
            </div>
            <div className="estimate-stat">
              <span className="estimate-stat-label">Срок</span>
              <span className="estimate-stat-value">{estimate.totalDays} дн.</span>
            </div>
            <div className="estimate-stat">
              <span className="estimate-stat-label">Маржинальность</span>
              <span className="estimate-stat-value" style={{ color: estimate.marginPercent < 25 ? '#c62828' : '#388e3c' }}>
                {estimate.marginPercent.toFixed(1)}%
              </span>
            </div>
            <div className="estimate-stat">
              <span className="estimate-stat-label">Сложность</span>
              <span className="estimate-stat-value" style={{ fontSize: 14 }}>{COMPLEXITY_LABELS[estimate.complexity]}</span>
            </div>
            <div className="estimate-stat">
              <span className="estimate-stat-label">Скидка</span>
              <span className="estimate-stat-value" style={{ fontSize: 14 }}>{formatMoney(estimate.discount)}</span>
            </div>
            <div className="estimate-stat">
              <span className="estimate-stat-label">Наценка</span>
              <span className="estimate-stat-value" style={{ fontSize: 14 }}>{formatMoney(estimate.extraCharge)}</span>
            </div>
          </div>

          {estimate.comment && (
            <p style={{ margin: '12px 0 0', color: '#555', fontSize: 13 }}>
              <em>{estimate.comment}</em>
            </p>
          )}

          {estimate.services && estimate.services.length > 0 && (
            <div className="estimate-services">
              <strong>Услуги:</strong>{' '}
              {estimate.services.map((es) => es.service.name).join(', ')}
            </div>
          )}

          <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontSize: 12, color: '#555', fontWeight: 600 }}>Статус расчёта:</label>
            <select
              value={estimate.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              style={{ fontSize: 12, padding: '3px 8px', borderRadius: 4, border: '1px solid #ccc' }}
              onClick={(e) => e.stopPropagation()}
            >
              {Object.entries(ESTIMATE_STATUSES).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
            {statusError && <span style={{ color: '#c62828', fontSize: 12 }}>{statusError}</span>}
          </div>
        </>
      )}
    </div>
  );
}

function EstimateForm({ projectId, nextVersion, onClose, onSaved, onError }: {
  projectId: number;
  nextVersion: number;
  onClose: () => void;
  onSaved: () => void;
  onError: (e: string) => void;
}) {
  const [services, setServices] = useState<Service[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [complexity, setComplexity] = useState<'low' | 'medium' | 'high'>('medium');
  const [discount, setDiscount] = useState(0);
  const [extraCharge, setExtraCharge] = useState(0);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [localError, setLocalError] = useState('');
  const [filterCat, setFilterCat] = useState('');

  useEffect(() => {
    api.getServices({ isActive: true }).then(setServices);
  }, []);

  const toggle = (id: number) => {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const submit = async () => {
    setSaving(true);
    setLocalError('');
    try {
      const dto: CreateEstimateDto = {
        serviceIds: [...selected],
        complexity,
        discount,
        extraCharge,
        comment: comment || undefined,
      };
      await api.createEstimate(projectId, dto);
      onSaved();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Ошибка';
      setLocalError(msg);
      onError(msg);
    } finally {
      setSaving(false);
    }
  };

  const filtered = filterCat ? services.filter((s) => s.category === filterCat) : services;
  const coefficients: Record<string, number> = { low: 1.0, medium: 1.3, high: 1.6 };
  const coeff = coefficients[complexity];

  const selectedServices = services.filter((s) => selected.has(s.id));
  const baseTotal = selectedServices.reduce((sum, s) => sum + s.basePrice, 0);
  const complexityTotal = baseTotal * coeff;
  const previewPrice = Math.max(0, complexityTotal - discount + extraCharge);
  const previewDays = Math.ceil(selectedServices.reduce((sum, s) => sum + s.baseDays, 0) * coeff);

  return (
    <div className="modal-backdrop">
      <div className="modal" style={{ width: 700 }}>
        <h3>Новый расчёт — версия v{nextVersion}</h3>
        {localError && <div className="alert alert-error">{localError}</div>}

        <div className="form">
          {/* Service picker */}
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
              <strong style={{ fontSize: 13 }}>Услуги * ({selected.size} выбрано)</strong>
              <select value={filterCat} onChange={(e) => setFilterCat(e.target.value)} style={{ marginLeft: 'auto', fontSize: 12, padding: '3px 6px' }}>
                <option value="">Все категории</option>
                {Object.entries(SERVICE_CATEGORIES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div className="service-list">
              {filtered.map((s) => (
                <div
                  key={s.id}
                  className={`service-item${selected.has(s.id) ? ' selected' : ''}`}
                  onClick={() => toggle(s.id)}
                >
                  <input type="checkbox" checked={selected.has(s.id)} readOnly />
                  <span className="service-item-name">{s.name}</span>
                  <span className="badge" style={{ background: '#e0e0e0', color: '#333', fontSize: 10 }}>
                    {SERVICE_CATEGORIES[s.category] ?? s.category}
                  </span>
                  <span className="service-item-meta">{formatMoney(s.basePrice)} · {s.baseDays} дн.</span>
                </div>
              ))}
            </div>
          </div>

          {/* Complexity + discount + extra */}
          <div className="form-row">
            <div className="field">
              <label>Сложность</label>
              <select value={complexity} onChange={(e) => setComplexity(e.target.value as typeof complexity)}>
                {Object.entries(COMPLEXITY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Скидка, ₽</label>
              <input type="number" min={0} value={discount} onChange={(e) => setDiscount(Number(e.target.value))} />
            </div>
            <div className="field">
              <label>Наценка, ₽</label>
              <input type="number" min={0} value={extraCharge} onChange={(e) => setExtraCharge(Number(e.target.value))} />
            </div>
          </div>

          <div className="field">
            <label>Комментарий</label>
            <input value={comment} onChange={(e) => setComment(e.target.value)} />
          </div>

          {/* Live preview */}
          {selected.size > 0 && (
            <div className="alert alert-info" style={{ margin: 0 }}>
              <strong>Предварительный расчёт:</strong>{' '}
              {formatMoney(previewPrice)} · {previewDays} дн.
              {discount > complexityTotal * 0.3 && (
                <span style={{ color: '#c62828', marginLeft: 8 }}>⚠ Скидка &gt; 30%</span>
              )}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Отмена</button>
          <button className="btn btn-success" disabled={saving || selected.size === 0} onClick={submit}>
            Создать расчёт
          </button>
        </div>
      </div>
    </div>
  );
}
