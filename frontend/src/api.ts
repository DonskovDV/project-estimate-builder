const BASE = '/api';

async function req<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) {
    const details: string[] | undefined = data.details;
    const msg = details?.length ? details.join('\n') : (data.error ?? 'Ошибка запроса');
    throw new Error(msg);
  }
  return data as T;
}

export const api = {
  // Clients
  getClients: () => req<Client[]>('GET', '/clients'),
  getClient: (id: number) => req<Client>('GET', `/clients/${id}`),
  createClient: (data: CreateClientDto) => req<Client>('POST', '/clients', data),

  updateClient: (id: number, data: Partial<CreateClientDto>) => req<Client>('PATCH', `/clients/${id}`, data),
  deleteClient: (id: number) => req<void>('DELETE', `/clients/${id}`),

  // Projects
  getProjects: (filters?: { status?: string; type?: string; clientId?: number }) => {
    const params = new URLSearchParams();
    if (filters?.status) params.set('status', filters.status);
    if (filters?.type) params.set('type', filters.type);
    if (filters?.clientId) params.set('clientId', String(filters.clientId));
    const qs = params.toString();
    return req<Project[]>('GET', `/projects${qs ? `?${qs}` : ''}`);
  },
  getProject: (id: number) => req<ProjectDetail>('GET', `/projects/${id}`),
  createProject: (data: CreateProjectDto) => req<Project>('POST', '/projects', data),
  updateProjectStatus: (id: number, status: string) =>
    req<Project>('PATCH', `/projects/${id}/status`, { status }),
  updateProject: (id: number, data: { name?: string; type?: string; description?: string }) =>
    req<Project>('PATCH', `/projects/${id}`, data),
  deleteProject: (id: number) => req<void>('DELETE', `/projects/${id}`),

  // Services
  getServices: (filters?: { category?: string; isActive?: boolean }) => {
    const params = new URLSearchParams();
    if (filters?.category) params.set('category', filters.category);
    if (filters?.isActive !== undefined) params.set('isActive', String(filters.isActive));
    const qs = params.toString();
    return req<Service[]>('GET', `/services${qs ? `?${qs}` : ''}`);
  },
  createService: (data: CreateServiceDto) => req<Service>('POST', '/services', data),
  updateService: (id: number, data: Partial<CreateServiceDto>) =>
    req<Service>('PATCH', `/services/${id}`, data),

  // Estimates
  getEstimates: (projectId: number) => req<Estimate[]>('GET', `/projects/${projectId}/estimates`),
  getEstimate: (id: number) => req<EstimateDetail>('GET', `/estimates/${id}`),
  createEstimate: (projectId: number, data: CreateEstimateDto) =>
    req<Estimate>('POST', `/projects/${projectId}/estimates`, data),
  updateEstimateStatus: (id: number, status: 'draft' | 'approved' | 'rejected') =>
    req<Estimate>('PATCH', `/estimates/${id}/status`, { status }),

  // Analytics
  getSummary: () => req<AnalyticsSummary>('GET', '/analytics/summary'),
};

// --- Types ---
export interface Client {
  id: number;
  companyName: string;
  contactPerson: string;
  phone: string;
  email: string;
  comment?: string;
  createdAt: string;
  _count?: { projects: number };
}

export interface Project {
  id: number;
  clientId: number;
  name: string;
  type: string;
  description?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  client?: Client;
  _count?: { estimates: number };
}

export interface ProjectDetail extends Project {
  estimates: Estimate[];
}

export interface Service {
  id: number;
  name: string;
  category: string;
  basePrice: number;
  baseDays: number;
  isRequired: boolean;
  isActive: boolean;
  costPrice?: number;
}

export interface EstimateService {
  id: number;
  serviceId: number;
  service: Service;
}

export interface Estimate {
  id: number;
  projectId: number;
  version: number;
  complexity: string;
  discount: number;
  extraCharge: number;
  totalPrice: number;
  totalDays: number;
  marginPercent: number;
  status: string;
  comment?: string;
  warnings: string[];
  createdAt: string;
  services?: EstimateService[];
}

export interface EstimateDetail extends Estimate {
  project: ProjectDetail & { client: Client };
}

export interface AnalyticsSummary {
  totalProjects: number;
  totalEstimates: number;
  averagePrice: number;
  averageMargin: number;
  projectsByStatus: Record<string, number>;
  projectsByType: Record<string, number>;
  topServices: { serviceName: string; usageCount: number }[];
  lowMarginEstimates: number;
}

export interface CreateClientDto {
  companyName: string;
  contactPerson: string;
  phone: string;
  email: string;
  comment?: string;
}

export interface CreateProjectDto {
  clientId: number;
  name: string;
  type: string;
  description?: string;
}

export interface CreateServiceDto {
  name: string;
  category: string;
  basePrice: number;
  baseDays: number;
  isRequired: boolean;
  isActive: boolean;
  costPrice?: number;
}

export interface CreateEstimateDto {
  serviceIds: number[];
  complexity: 'low' | 'medium' | 'high';
  discount: number;
  extraCharge: number;
  comment?: string;
}

export const PROJECT_TYPES: Record<string, string> = {
  clinic_website: 'Сайт клиники',
  ecommerce: 'Интернет-магазин',
  corporate_website: 'Корпоративный сайт',
  seo: 'SEO-продвижение',
  crm_integration: 'CRM-интеграция',
  support: 'Техподдержка',
};

export const PROJECT_STATUSES: Record<string, string> = {
  draft: 'Черновик',
  calculated: 'Рассчитан',
  sent: 'Отправлен',
  approved: 'Одобрен',
  rejected: 'Отклонён',
  archived: 'В архиве',
};

export const SERVICE_CATEGORIES: Record<string, string> = {
  design: 'Дизайн',
  frontend: 'Frontend',
  backend: 'Backend',
  cms: 'CMS',
  seo: 'SEO',
  analytics: 'Аналитика',
  integration: 'Интеграции',
  support: 'Поддержка',
  management: 'Управление',
};

export const ESTIMATE_STATUSES: Record<string, string> = {
  draft:    'Черновик',
  approved: 'Одобрен',
  rejected: 'Отклонён',
};

export const ESTIMATE_STATUS_COLORS: Record<string, string> = {
  draft:    '#888',
  approved: '#388e3c',
  rejected: '#c62828',
};

export const COMPLEXITY_LABELS: Record<string, string> = {
  low: 'Низкая (×1.0)',
  medium: 'Средняя (×1.3)',
  high: 'Высокая (×1.6)',
};

export const STATUS_COLORS: Record<string, string> = {
  draft: '#888',
  calculated: '#2196f3',
  sent: '#ff9800',
  approved: '#4caf50',
  rejected: '#f44336',
  archived: '#9e9e9e',
};

export function formatMoney(n: number) {
  return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(n);
}
