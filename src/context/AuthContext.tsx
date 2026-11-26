import type { ReactNode } from 'react';
import {
    createContext,
    useContext,
    useState,
    useCallback,
    useMemo,
} from 'react';

interface AuthContextType {
    isAuthenticated: boolean;
    isAdmin: boolean;
    isSuperAdmin: boolean;
    login: (token: string, role: string) => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {

    const [isAuthenticated, setIsAuthenticated] = useState(() => {
        return localStorage.getItem('isAuthenticated') === 'true';
    });

    const [isAdmin, setIsAdmin] = useState(() => {
        return localStorage.getItem('userRole') === 'admin';
    });

    const [isSuperAdmin, setIsSuperAdmin] = useState(() => {
        return localStorage.getItem('userRole') === 'superadmin';
    });

    const login = useCallback((token:string,role: string) => {
    const normalizedRole = role.toLowerCase();

    setIsAuthenticated(true);
    setIsAdmin(normalizedRole === "admin");
    setIsSuperAdmin(normalizedRole==="superadmin")
    localStorage.setItem("token", token);
    localStorage.setItem("isAuthenticated", "true");
    localStorage.setItem("userRole", normalizedRole);
}, []);

    const logout = useCallback(() => {
        setIsAuthenticated(false);
        setIsAdmin(false);
        setIsSuperAdmin(false);
        localStorage.removeItem('isAuthenticated');
        localStorage.removeItem('userRole');
    }, []);

    const value = useMemo(
        () => ({
            isAuthenticated,
            isAdmin,
            isSuperAdmin,
            login,
            logout,
        }),
        [isAuthenticated, isAdmin,isSuperAdmin, login, logout]
    );

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);

    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }

    return context;
}
