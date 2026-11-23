import { lazy, Suspense, Component, type ReactNode } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AppProvider } from './lib/app-context';
import { SleighProvider } from './features/map/sleigh-context';
import { HiddenNisseProvider } from './components/HiddenNisse';
import { Layout } from './components/Layout';
import HomePage from './pages/HomePage';

const NvrPage = lazy(() => import('./features/nvr/NvrPage'));
const CameraSoloPage = lazy(() => import('./features/nvr/CameraSoloPage'));
const CalendarPage = lazy(() => import('./features/calendar/CalendarPage'));
const ReindeerPage = lazy(() => import('./pages/ReindeerPage'));
const MissionsPage = lazy(() => import('./pages/MissionsPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const AdminPage = lazy(() => import('./admin/AdminPage'));

class ErrorBoundary extends Component<{ children: ReactNode }, { error: boolean }> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  componentDidCatch(err: unknown) {
    console.error(err);
  }
  render() {
    if (this.state.error) {
      return (
        <div className="panel" style={{ margin: 24, textAlign: 'center' }} role="alert">
          <h2>Ups! En nisse har trådt på en ledning.</h2>
          <p>Noget gik galt i kontrolcentralen. Prøv at genindlæse siden.</p>
          <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>
            Genindlæs
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const Loading = () => <div className="loading-shimmer" style={{ height: 320, borderRadius: 16 }} aria-label="Indlæser" />;

export function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <HiddenNisseProvider>
          <SleighProvider>
            <ErrorBoundary>
              <Routes>
                {/* Enkelt kamera i separat vindue – uden sidens ramme */}
                <Route
                  path="/kamera/:id"
                  element={
                    <Suspense fallback={<Loading />}>
                      <CameraSoloPage />
                    </Suspense>
                  }
                />
                <Route
                  path="*"
                  element={
                    <Layout>
                      <Suspense fallback={<Loading />}>
                        <Routes>
                          <Route path="/" element={<HomePage />} />
                          <Route path="/overvaagning" element={<NvrPage />} />
                          <Route path="/julekalender" element={<CalendarPage />} />
                          <Route path="/rensdyr" element={<ReindeerPage />} />
                          <Route path="/missioner" element={<MissionsPage />} />
                          <Route path="/om" element={<AboutPage />} />
                          <Route path="/admin/*" element={<AdminPage />} />
                          <Route path="*" element={<NotFoundPage />} />
                        </Routes>
                      </Suspense>
                    </Layout>
                  }
                />
              </Routes>
            </ErrorBoundary>
          </SleighProvider>
        </HiddenNisseProvider>
      </AppProvider>
    </BrowserRouter>
  );
}
