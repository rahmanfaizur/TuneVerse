"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import LoadingScreen from "../components/LoadingScreen";

interface User {
    id: string;
    username: string;
    email?: string;
    isGuest: boolean;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    login: (token: string, user: User) => void;
    logout: () => void;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const storedToken = localStorage.getItem("tuneverse_token");
        const storedUser = localStorage.getItem("tuneverse_user");

        if (storedToken && storedUser) {
            try {
                const parsedUser = JSON.parse(storedUser);
                setToken(storedToken);
                setUser(parsedUser);
            } catch (e) {
                console.error("Failed to parse user data", e);
                // Clear invalid data
                localStorage.removeItem("tuneverse_user");
                localStorage.removeItem("tuneverse_token");
            }
        }
        setIsLoading(false);
    }, []);

    const login = useCallback((newToken: string, newUser: User) => {
        localStorage.setItem("tuneverse_token", newToken);
        localStorage.setItem("tuneverse_user", JSON.stringify(newUser));
        setToken(newToken);
        setUser(newUser);
    }, []);

    const logout = useCallback(() => {
        localStorage.removeItem("tuneverse_token");
        localStorage.removeItem("tuneverse_user");
        setToken(null);
        setUser(null);
        router.push("/login");
    }, [router]);

    const value = useMemo(() => ({
        user,
        token,
        login,
        logout,
        isLoading
    }), [user, token, login, logout, isLoading]);

    if (isLoading) {
        return <LoadingScreen message="Authenticating..." />;
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
