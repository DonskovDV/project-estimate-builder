import { useEffect, useState } from 'react';
import type React from 'react';
import { api, CreateServiceDto, Service, SERVICE_CATEGORIES, formatMoney } from '../api';

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editService, setEditService] = useState<Service | null>(null);
  const [error, setError] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [filterActive, setFilterActive] = useState('');

  const load = () =>
    api.getServices({
      category: filterCat || undefined,
      isActive: filterActive === '' ? undefined : filterActive === 'true',
    })
      .then(setServices)
      .finally(() => setLoading(false));

  useEffect(() => { load(); }, [filterCat, filterActive]);

  return (
    <div>
      <div className="section-header">
        <h2>Каталог услуг</h2>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ Добавить услугу</button>
      </div>

      <div className="filters">
        <select value={filterCat} onChange={(e) => setFilterCat(e.target.value)}>
          <option value="">Все категории</option>
          {Object.entries(SERVICE_CATEGORIES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select value={filterActive} onChange={(e) => setFilterActive(e.target.value)}>
          <option value="">Все</option>
          <option value="true">Активные</option>
          <option value="false">Неактивные</option>
        </select>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="loading">Загрузка...</div>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <table className="table-services">
            <thead>
              <tr>
                <th>Услуга</th>
                <th>Категория</th>
                <th>Стоимость</th>
                <th>Себестоимость</th>
                <th>Срок (дн.)</th>
                <th>Обяз.</th>
                <th>Статус</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {services.map((s) => (
                <tr key={s.id}>
                  <td><strong>{s.name}</strong></td>
                  <td>{SERVICE_CATEGORIES[s.category] ?? s.category}</td>
                  <td>{formatMoney(s.basePrice)}</td>
                  <td>{s.costPrice != null ? formatMoney(s.costPrice) : '—'}</td>
                  <td>{s.baseDays}</td>
                  <td>{s.isRequired ? '✓' : '—'}</td>
                  <td>
                    <span className="badge" style={{ background: s.isActive ? '#388e3c' : '#9e9e9e' }}>
                      {s.isActive ? 'Активна' : 'Неактивна'}
                    </span>
                  </td>
                  <td>
                    <button className="btn btn-ghost btn-sm" onClick={() => setEditService(s)}>Ред.</button>
                  </td>
                </tr>
              ))}
              {services.length === 0 && (
                <tr><td colSpan={8} style={{ textAlign: 'center', color: '#999', padding: 24 }}>Нет услуг</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {(showForm || editService) && (
        <ServiceForm
          service={editService}
          onClose={() => { setShowForm(false); setEditService(null); }}
          onSaved={() => { setShowForm(false); setEditService(null); load(); }}
          onError={setError}
        />
      )}
    </div>
  );
}

// ── Client-side validation ───────────────────────────────────────────────────

type ServiceField = 'name' | 'basePrice' | 'baseDays';
const SERVICE_FIELD_ORDER: ServiceField[] = ['name', 'basePrice', 'baseDays'];

function validateServiceField(field: ServiceField, form: CreateServiceDto): string | null {
  switch (field) {
    case 'name':      return form.name.trim() ? null : 'Название обязательно';
    case 'basePrice': return form.basePrice > 0 ? null : 'Стоимость должна быть больше 0';
    case 'baseDays':  return form.baseDays >= 1 ? null : 'Срок должен быть не менее 1 дня';
  }
}

function firstServiceError(form: CreateServiceDto): { field: ServiceField; message: string } | null {
  for (const field of SERVICE_FIELD_ORDER) {
    const msg = validateServiceField(field, form);
    if (msg) return { field, message: msg };
  }
  return null;
}

// ── Form component ───────────────────────────────────────────────────────────

function ServiceForm({ service, onClose, onSaved, onError }: {
  service: Service | null;
  onClose: () => void;
  onSaved: () => void;
  onError: (e: string) => void;
}) {
  const [form, setForm] = useState<CreateServiceDto>(
    service
      ? { ...service }
      : { name: '', category: 'design', basePrice: 0, baseDays: 1, isRequired: false, isActive: true },
  );
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState('');
  const [fieldError, setFieldError] = useState<{ field: ServiceField; message: string } | null>(null);

  const set = <K extends keyof CreateServiceDto>(k: K, v: CreateServiceDto[K]) => {
    const next = { ...form, [k]: v };
    setForm(next);
    if (fieldError && (k === 'name' || k === 'basePrice' || k === 'baseDays')) {
      setFieldError(firstServiceError(next));
    }
  };

  const submit = async () => {
    const err = firstServiceError(form);
    if (err) { setFieldError(err); return; }

    setSaving(true);
    setServerError('');
    setFieldError(null);
    try {
      if (service) {
        await api.updateService(service.id, form);
      } else {
        await api.createService(form);
      }
      onSaved();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Ошибка';
      setServerError(msg);
      onError(msg);
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = (f: ServiceField): React.CSSProperties =>
    fieldError?.field === f ? { borderColor: '#c62828', background: '#fff8f8' } : {};

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h3>{service ? 'Редактировать услугу' : 'Новая услуга'}</h3>
        {serverError && <div className="alert alert-error">{serverError}</div>}
        <div className="form">
          <div className="field">
            <label>Название *</label>
            <input
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              style={inputStyle('name')}
            />
            {fieldError?.field === 'name' && (
              <span style={{ color: '#c62828', fontSize: 12 }}>{fieldError.message}</span>
            )}
          </div>
          <div className="form-row">
            <div className="field">
              <label>Категория *</label>
              <select value={form.category} onChange={(e) => set('category', e.target.value)}>
                {Object.entries(SERVICE_CATEGORIES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Базовая стоимость, ₽ *</label>
              <input
                type="number" min={0}
                value={form.basePrice}
                onChange={(e) => set('basePrice', Number(e.target.value))}
                style={inputStyle('basePrice')}
              />
              {fieldError?.field === 'basePrice' && (
                <span style={{ color: '#c62828', fontSize: 12 }}>{fieldError.message}</span>
              )}
            </div>
          </div>
          <div className="form-row">
            <div className="field">
              <label>Себестоимость, ₽</label>
              <input type="number" min={0} value={form.costPrice ?? ''} onChange={(e) => set('costPrice', e.target.value ? Number(e.target.value) : undefined)} />
            </div>
            <div className="field">
              <label>Срок (дней) *</label>
              <input
                type="number" min={1}
                value={form.baseDays}
                onChange={(e) => set('baseDays', Number(e.target.value))}
                style={inputStyle('baseDays')}
              />
              {fieldError?.field === 'baseDays' && (
                <span style={{ color: '#c62828', fontSize: 12 }}>{fieldError.message}</span>
              )}
            </div>
          </div>
          <div className="form-row">
            <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input type="checkbox" checked={form.isRequired} onChange={(e) => set('isRequired', e.target.checked)} />
              Обязательная
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input type="checkbox" checked={form.isActive} onChange={(e) => set('isActive', e.target.checked)} />
              Активная
            </label>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Отмена</button>
          <button className="btn btn-primary" disabled={saving} onClick={submit}>Сохранить</button>
        </div>
      </div>
    </div>
  );
}
