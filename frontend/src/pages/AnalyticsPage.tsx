import { useEffect, useState } from 'react';
import { api, AnalyticsSummary, PROJECT_STATUSES, PROJECT_TYPES, formatMoney } from '../api';

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getSummary().then(setData).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Загрузка...</div>;
  if (error) return <div className="alert alert-error">{error}</div>;
  if (!data) return null;

  return (
    <div>
      <div className="section-header">
        <h2>Аналитика</h2>
      </div>

      <div className="analytics-grid">
        <div className="analytics-card">
          <div className="value">{data.totalProjects}</div>
          <div className="label">Проектов всего</div>
        </div>
        <div className="analytics-card">
          <div className="value">{data.totalEstimates}</div>
          <div className="label">Расчётов всего</div>
        </div>
        <div className="analytics-card">
          <div className="value">{formatMoney(data.averagePrice)}</div>
          <div className="label">Средний чек</div>
        </div>
        <div className="analytics-card">
          <div className="value" style={{ color: data.averageMargin < 25 ? '#c62828' : '#1a237e' }}>
            {data.averageMargin}%
          </div>
          <div className="label">Средняя маржа</div>
        </div>
        <div className="analytics-card">
          <div className="value" style={{ color: data.lowMarginEstimates > 0 ? '#c62828' : '#388e3c' }}>
            {data.lowMarginEstimates}
          </div>
          <div className="label">Расчётов с низкой маржой</div>
        </div>
      </div>

      <div className="analytics-breakdown-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
        {/* By status */}
        <div className="card">
          <div className="card-title" style={{ marginBottom: 12 }}>Проекты по статусам</div>
          {Object.entries(data.projectsByStatus).map(([status, count]) => (
            <div key={status} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #f0f0f0' }}>
              <span>{PROJECT_STATUSES[status] ?? status}</span>
              <strong>{count}</strong>
            </div>
          ))}
        </div>

        {/* By type */}
        <div className="card">
          <div className="card-title" style={{ marginBottom: 12 }}>Проекты по типам</div>
          {Object.entries(data.projectsByType).map(([type, count]) => (
            <div key={type} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #f0f0f0' }}>
              <span>{PROJECT_TYPES[type] ?? type}</span>
              <strong>{count}</strong>
            </div>
          ))}
        </div>

        {/* Top services */}
        <div className="card">
          <div className="card-title" style={{ marginBottom: 12 }}>Топ-5 услуг</div>
          {data.topServices.map((s, i) => (
            <div key={s.serviceName} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #f0f0f0' }}>
              <span>{i + 1}. {s.serviceName}</span>
              <strong>{s.usageCount}×</strong>
            </div>
          ))}
          {data.topServices.length === 0 && <span style={{ color: '#999' }}>Нет данных</span>}
        </div>
      </div>
    </div>
  );
}
