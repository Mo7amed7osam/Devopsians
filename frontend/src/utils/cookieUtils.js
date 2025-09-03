// Cookie utility functions
const setCookie = (name, value, days = 1) => {
  const date = new Date();
  date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
  const expires = `expires=${date.toUTCString()}`;
  document.cookie = `${name}=${value};${expires};path=/;SameSite=Strict;Secure`;
};

const getCookie = (name) => {
  const cookieName = `${name}=`;
  const decodedCookie = decodeURIComponent(document.cookie);
  const cookieArray = decodedCookie.split(';');
  
  for (let cookie of cookieArray) {
    while (cookie.charAt(0) === ' ') {
      cookie = cookie.substring(1);
    }
    if (cookie.indexOf(cookieName) === 0) {
      return cookie.substring(cookieName.length, cookie.length);
    }
  }
  return null;
};

const removeCookie = (name) => {
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
};

export const setUserCookies = (userData) => {
  const { token, user } = userData;
  setCookie('authToken', token);
  setCookie('userRole', user.role);
  setCookie('userId', user.id);
  setCookie('userName', user.userName);
  if (user.firstName) setCookie('firstName', user.firstName);
  if (user.lastName) setCookie('lastName', user.lastName);
};

export const clearUserCookies = () => {
  removeCookie('authToken');
  removeCookie('userRole');
  removeCookie('userId');
  removeCookie('userName');
  removeCookie('firstName');
  removeCookie('lastName');
};

export const getUserData = () => {
  return {
    token: getCookie('authToken'),
    role: getCookie('userRole'),
    id: getCookie('userId'),
    userName: getCookie('userName'),
    firstName: getCookie('firstName'),
    lastName: getCookie('lastName')
  };
};

export const isAuthenticated = () => {
  return !!getCookie('authToken');
};
