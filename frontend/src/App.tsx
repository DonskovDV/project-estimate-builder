import { useState } from 'react';
import ClientsPage from './pages/ClientsPage';
import ProjectsPage from './pages/ProjectsPage';
import ProjectDetailPage from './pages/ProjectDetailPage';
import ServicesPage from './pages/ServicesPage';
import AnalyticsPage from './pages/AnalyticsPage';

type Tab = 'clients' | 'projects' | 'services' | 'analytics';

export interface Nav {
  goProject: (id: number) => void;
  goProjects: () => void;
}

export default function App() {
  const [tab, setTab] = useState<Tab>('projects');
  const [projectId, setProjectId] = useState<number | null>(null);

  const nav: Nav = {
    goProject: (id) => { setProjectId(id); setTab('projects'); },
    goProjects: () => { setProjectId(null); },
  };

  return (
    <>
      <header className="app-header">
        <div className="app-header-inner">
        <h1>Project Estimate Builder</h1>
        <nav className="nav">
          {(['projects', 'clients', 'services', 'analytics'] as Tab[]).map((t) => (
            <button
              key={t}
              className={tab === t && !projectId ? 'active' : ''}
              onClick={() => { setTab(t); setProjectId(null); }}
            >
              {{ projects: 'Проекты', clients: 'Клиенты', services: 'Услуги', analytics: 'Аналитика' }[t]}
            </button>
          ))}
        </nav>
        </div>
      </header>

      <main className="page">
        {tab === 'clients' && <ClientsPage nav={nav} />}
        {tab === 'projects' && !projectId && <ProjectsPage nav={nav} />}
        {tab === 'projects' && projectId && (
          <ProjectDetailPage id={projectId} nav={nav} />
        )}
        {tab === 'services' && <ServicesPage />}
        {tab === 'analytics' && <AnalyticsPage />}
      </main>
    </>
  );
}
