import { useEffect, useState } from 'react';
import { api, Client, CreateClientDto } from '../api';
import type { Nav } from '../App';

/** Inline delete confirm — replaces the delete button with "Да / Нет" */
function DeleteConfirm({ label, onConfirm }: { label: string; onConfirm: () => void }) {
  const [pending, setPending] = useState(false);
  if (!pending) {
    return (
      <button className="btn btn-danger btn-sm" onClick={() => setPending(true)}>
        {label}
      </button>
    );
  }
  return (
    <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
      <span style={{ fontSize: 12, color: '#c62828', whiteSpace: 'nowrap' }}>Удалить?</span>
      <button className="btn btn-danger btn-sm" onClick={onConfirm}>Да</button>
      <button className="btn btn-ghost btn-sm" onClick={() => setPending(false)}>Нет</button>
    </span>
  );
}

export default function ClientsPage({ nav }: { nav: Nav }) {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editClient, setEditClient] = useState<Client | null>(null);
  const [deleteError, setDeleteError] = useState('');

  const load = () => api.getClients().then(setClients).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const handleDelete = async (id: number) => {
    setDeleteError('');
    try {
      await api.deleteClient(id);
      load();
    } catch (e: unknown) {
      setDeleteError(e instanceof Error ? e.message : 'Ошибка удаления');
    }
  };

  return (
    <div>
      <div className="section-header">
        <h2>Клиенты</h2>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ Добавить клиента</button>
      </div>

      {deleteError && <div className="alert alert-error">{deleteError}</div>}

      {loading ? (
        <div className="loading">Загрузка...</div>
      ) : (
        <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
          <table style={{ minWidth: 700 }}>
            <thead>
              <tr>
                <th>Компания</th>
                <th>Контакт</th>
                <th>Email</th>
                <th>Телефон</th>
                <th>Проекты</th>
                <th style={{ width: 160 }}></th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr key={c.id}>
                  <td><strong>{c.companyName}</strong></td>
                  <td>{c.contactPerson}</td>
                  <td>{c.email}</td>
                  <td>{c.phone}</td>
                  <td>{c._count?.projects ?? 0}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => setEditClient(c)}>Ред.</button>
                      <DeleteConfirm
                        label="Удалить"
                        onConfirm={() => handleDelete(c.id)}
                      />
                    </div>
                  </td>
                </tr>
              ))}
              {clients.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: '#999', padding: 24 }}>Нет клиентов</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <ClientForm
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); load(); }}
        />
      )}

      {editClient && (
        <ClientForm
          initial={editClient}
          onClose={() => setEditClient(null)}
          onSaved={() => { setEditClient(null); load(); }}
        />
      )}
    </div>
  );
}

// ── Client-side validation ──────────────────────────────────────────────────

type ClientField = 'companyName' | 'contactPerson' | 'email' | 'phone';

const FIELD_ORDER: ClientField[] = ['companyName', 'contactPerson', 'email', 'phone'];

const RU_PHONE_RE = /^(\+7|8)[\s\-]?\(?\d{3}\)?[\s\-]?\d{3}[\s\-]?\d{2}[\s\-]?\d{2}$/;

function validateField(field: ClientField, value: string): string | null {
  switch (field) {
    case 'companyName':   return value.trim() ? null : 'Название компании обязательно';
    case 'contactPerson': return value.trim() ? null : 'Контактное лицо обязательно';
    case 'email':
      if (!value.trim()) return 'Email обязателен';
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? null : 'Неверный формат email';
    case 'phone':
      if (!value.trim()) return 'Телефон обязателен';
      return RU_PHONE_RE.test(value) ? null : 'Неверный формат (пример: +7 (999) 123-45-67)';
  }
}

function firstError(form: CreateClientDto): { field: ClientField; message: string } | null {
  for (const field of FIELD_ORDER) {
    const msg = validateField(field, String(form[field] ?? ''));
    if (msg) return { field, message: msg };
  }
  return null;
}

// ── Form component ───────────────────────────────────────────────────────────

function ClientForm({ onClose, onSaved, initial }: {
  onClose: () => void;
  onSaved: () => void;
  initial?: Client;
}) {
  const isEdit = !!initial;
  const [form, setForm] = useState<CreateClientDto>({
    companyName:   initial?.companyName   ?? '',
    contactPerson: initial?.contactPerson ?? '',
    phone:         initial?.phone         ?? '',
    email:         initial?.email         ?? '',
    comment:       initial?.comment       ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState('');
  const [fieldError, setFieldError] = useState<{ field: ClientField; message: string } | null>(null);

  const handleChange = (k: ClientField) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = { ...form, [k]: e.target.value };
    setForm(next);
    // Once user starts fixing the highlighted field — re-evaluate and shift to next problem
    if (fieldError?.field === k) {
      setFieldError(firstError(next));
    }
  };

  const submit = async () => {
    // Client-side gate: highlight first invalid field instead of sending request
    const err = firstError(form);
    if (err) { setFieldError(err); return; }

    setSaving(true);
    setServerError('');
    setFieldError(null);
    try {
      if (isEdit) {
        await api.updateClient(initial!.id, form);
      } else {
        await api.createClient(form);
      }
      onSaved();
    } catch (e: unknown) {
      setServerError(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = (f: ClientField): React.CSSProperties =>
    fieldError?.field === f
      ? { borderColor: '#c62828', background: '#fff8f8' }
      : {};

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h3>{isEdit ? `Редактировать: ${initial!.companyName}` : 'Новый клиент'}</h3>

        {serverError && (
          <div className="alert alert-error">{serverError}</div>
        )}

        <div className="form">
          <div className="form-row">
            <div className="field">
              <label>Компания *</label>
              <input
                value={form.companyName}
                onChange={handleChange('companyName')}
                placeholder="ООО «Пример»"
                style={inputStyle('companyName')}
              />
              {fieldError?.field === 'companyName' && (
                <span style={{ color: '#c62828', fontSize: 12 }}>{fieldError.message}</span>
              )}
            </div>
            <div className="field">
              <label>Контактное лицо *</label>
              <input
                value={form.contactPerson}
                onChange={handleChange('contactPerson')}
                placeholder="Иван Иванов"
                style={inputStyle('contactPerson')}
              />
              {fieldError?.field === 'contactPerson' && (
                <span style={{ color: '#c62828', fontSize: 12 }}>{fieldError.message}</span>
              )}
            </div>
          </div>
          <div className="form-row">
            <div className="field">
              <label>Email *</label>
              <input
                type="email"
                value={form.email}
                onChange={handleChange('email')}
                placeholder="email@company.ru"
                style={inputStyle('email')}
              />
              {fieldError?.field === 'email' && (
                <span style={{ color: '#c62828', fontSize: 12 }}>{fieldError.message}</span>
              )}
            </div>
            <div className="field">
              <label>Телефон *</label>
              <input
                value={form.phone}
                onChange={handleChange('phone')}
                placeholder="+7 (999) 000-00-00"
                style={inputStyle('phone')}
              />
              {fieldError?.field === 'phone' && (
                <span style={{ color: '#c62828', fontSize: 12 }}>{fieldError.message}</span>
              )}
            </div>
          </div>
          <div className="field">
            <label>Комментарий</label>
            <textarea
              value={form.comment}
              onChange={(e) => setForm((f) => ({ ...f, comment: e.target.value }))}
            />
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Отмена</button>
          <button className="btn btn-primary" disabled={saving} onClick={submit}>
            {isEdit ? 'Сохранить изменения' : 'Сохранить'}
          </button>
        </div>
      </div>
    </div>
  );
}
