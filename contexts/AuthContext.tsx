
import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';

interface AuthContextType {
    user: User | null;
    login: (provider: string) => Promise<void>;
    logout: () => void;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const stored = localStorage.getItem('raiwave_user');
        if (stored) {
            try {
                setUser(JSON.parse(stored));
            } catch (e) {
                console.error("Failed to parse user session", e);
                localStorage.removeItem('raiwave_user');
            }
        }
        setIsLoading(false);
    }, []);

    const login = async (provider: string) => {
        console.log(`Initiating simulated login with ${provider}...`);
        return new Promise<void>((resolve) => {
            setTimeout(() => {
                let mockUser: User;
                
                switch(provider) {
                    case 'facebook':
                        mockUser = {
                            id: 'fb_123',
                            name: 'Karim Social',
                            email: 'karim@facebook.com',
                            avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Karim&backgroundColor=3b5998'
                        };
                        break;
                    case 'apple':
                        mockUser = {
                            id: 'apple_123',
                            name: 'Amine Studio',
                            email: 'amine@icloud.com',
                            avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Amine&mode=exclude&top=hat&clothing=blazerAndShirt'
                        };
                        break;
                    default: // Google
                         mockUser = {
                            id: 'google_123',
                            name: 'Amine Producer',
                            email: 'amine@raiwave.com',
                            avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Amine'
                        };
                }
                
                setUser(mockUser);
                localStorage.setItem('raiwave_user', JSON.stringify(mockUser));
                console.log("Login successful");
                resolve();
            }, 800);
        });
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('raiwave_user');
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within an AuthProvider');
    return context;
};
