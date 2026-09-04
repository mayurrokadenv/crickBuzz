import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

import Dashboard from "./Pages/Dashboard";
import NVianDashboard from "./Pages/NVianDashboard.tsx";
import MatchDetailsPage from "./Pages/MatchDetailsPage/MatchDetailsPage.tsx";
import Login from "./Pages/Login.tsx";
import AccessDenied from "./Pages/AccessDenied.tsx";
import SuperAdmin from "./Pages/SuperAdmin.tsx";
import Admin from "./Pages/Admin/Admin.tsx";
import Fixtures from "./Pages/Admin/Fixtures.tsx";
import Commentary from "./Pages/Admin/Commentary.tsx";
import TeamsPlayers from "./Pages/Admin/TeamAndPlayersTab/TeamsPlayers.tsx";
import RegistrationForm from "./Pages/RegistrationForm.tsx";
import { NVianDashboardSearchProvider } from "./context/NVianDashboardSearchContext.tsx";
import { DashboardSearchProvider } from "./context/DashboardSearchContext.tsx";
import { RegistrationProvider } from "./context/RegistrationContext.tsx";

function App() {
    return (
        <AuthProvider>
            <NVianDashboardSearchProvider>
                <DashboardSearchProvider>
                    <RegistrationProvider>
                    <BrowserRouter>
                        <Routes>
                            <Route path="/login" element={<Login />} />
                            <Route path="/" element={<Dashboard />} />
                            
                                <Route path="/register" element={<RegistrationForm />} />
                            
                            <Route path="/nvian" element={<NVianDashboard />} />
                            <Route path="/match/:matchId" element={<MatchDetailsPage />} />
                            <Route path="/fixture/:matchId" element={<MatchDetailsPage />} />

                            <Route
                                path="/admin"
                                element={
                                    <ProtectedRoute
                                        element={<Admin />}
                                        requireAdmin={true}
                                    />
                                }
                            >
                                <Route index element={<Navigate to="fixtures" replace />} />
                                <Route path="fixtures" element={<Fixtures />} />
                                <Route path="teams-players" element={<TeamsPlayers />} />
                                <Route path="commentary" element={<Commentary />} />
                            </Route>

                            <Route
                                path="/superadmin"
                                element={
                                    <ProtectedRoute
                                        element={<SuperAdmin />}
                                        requireSuperAdmin={true}
                                    />
                                }
                            />
                            <Route path="/access-denied" element={<AccessDenied />} />
                            <Route path="*" element={<Navigate to="/" replace />} />
                        </Routes>
                    </BrowserRouter>
                    </RegistrationProvider>
                </DashboardSearchProvider>
            </NVianDashboardSearchProvider>
        </AuthProvider>
    );
}

export default App;