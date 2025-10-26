import React, { createContext, useState, useContext, useEffect } from 'react';
import { getToken, getRole, removeToken, removeRole } from '../utils/cookieUtils';

const AuthContext = createContext(null);

// <-- NEW: Helper function to get initial dark mode state from localStorage
const getInitialDarkMode = () => {
    const savedMode = localStorage.getItem('darkMode');
    return savedMode ? JSON.parse(savedMode) : false;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState({ token: getToken(), role: getRole() });

    // <-- NEW: Add dark mode state
    const [isDarkMode, setIsDarkMode] = useState(getInitialDarkMode());

    // <-- NEW: Add toggle function
    const toggleDarkMode = () => {
        setIsDarkMode(prevMode => {
            const newMode = !prevMode;
            localStorage.setItem('darkMode', JSON.stringify(newMode));
            return newMode;
        });
    };

    const logout = () => {
        removeToken();
        removeRole();
        setUser({ token: null, role: null });
    };
    
    // We can add a login function here later to make login flow cleaner
    const login = (token, role) => {
        // This part is for later, but it shows how we'd update the context
        setUser({ token, role });
    }

    // The value provided to all components that use this context
    const authValue = {
        isAuthenticated: !!user.token,
        userRole: user.role,
        logout,
        login, // Expose login function
        isDarkMode,      // <-- NEW: Expose state
        toggleDarkMode,  // <-- NEW: Expose function
    };

    return <AuthContext.Provider value={authValue}>{children}</AuthContext.Provider>;
};

// This is the custom hook that our components will use to get the auth state
export const useAuth = () => {
    return useContext(AuthContext);
};