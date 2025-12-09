import React, { createContext, useState, useContext, useEffect } from 'react';
import { getToken, getRole, removeToken, removeRole } from '../utils/cookieUtils';

const AuthContext = createContext(null);

// <-- NEW: Helper function to get initial dark mode state from sessionStorage
const getInitialDarkMode = () => {
    const savedMode = sessionStorage.getItem('darkMode');
    return savedMode ? JSON.parse(savedMode) : false;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState({ token: getToken(), role: getRole() });

    // <-- NEW: Add dark mode state
    const [isDarkMode, setIsDarkMode] = useState(getInitialDarkMode());

    // Sync auth state across tabs by checking cookies periodically
    useEffect(() => {
        const syncAuthState = () => {
            const currentToken = getToken();
            const currentRole = getRole();
            
            // Update state if cookies changed (e.g., login/logout in another tab)
            if (currentToken !== user.token || currentRole !== user.role) {
                setUser({ token: currentToken, role: currentRole });
            }
        };

        // Check every 1 second for cookie changes
        const interval = setInterval(syncAuthState, 1000);

        // Also listen for storage events (though cookies don't trigger this)
        window.addEventListener('storage', syncAuthState);

        return () => {
            clearInterval(interval);
            window.removeEventListener('storage', syncAuthState);
        };
    }, [user.token, user.role]);

    // <-- NEW: Add toggle function
    const toggleDarkMode = () => {
        setIsDarkMode(prevMode => {
            const newMode = !prevMode;
            sessionStorage.setItem('darkMode', JSON.stringify(newMode));
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