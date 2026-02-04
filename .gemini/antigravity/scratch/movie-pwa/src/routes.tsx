import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import LandingPage from '../pages/LandingPage';
import { HomePage } from '../pages/HomePage';
import { MoviesPage } from '../pages/MoviesPage';
import { AppShell } from '../components/layout/AppShell';
import { useCollection } from '../providers/CollectionProvider';

// Guard to prevent accessing app without selecting a format
const RequireFormat = ({ children }: { children: JSX.Element }) => {
    const { format } = useCollection();
    const location = useLocation();

    if (!format) {
        return <Navigate to="/" state={{ from: location }} replace />;
    }

    return children;
};

export const AppRoutes = () => {
    return (
        <Routes>
            {/* Landing Page (Choice) */}
            <Route path="/" element={<LandingPage />} />

            {/* Protected Routes (App) */}
            <Route
                path="/app/*"
                element={
                    <RequireFormat>
                        <AppShell>
                            <Routes>
                                <Route path="/" element={<HomePage />} />
                                <Route path="/genre/:genre" element={<MoviesPage />} />
                                <Route path="*" element={<Navigate to="/app" replace />} />
                            </Routes>
                        </AppShell>
                    </RequireFormat>
                }
            />

            {/* Catch all redirect */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
};
