// TODO: make configurable before deploy
const BACKEND_ORIGIN = 'http://localhost:7000';

class AuthService {
  constructor() {
    this._user = null;
    this._isAuthenticated = false;
  }

  get backendOrigin() {
    return BACKEND_ORIGIN;
  }

  async initialize() {
    return await this.checkAuthStatus();
  }

  async checkAuthStatus() {
    try {
      const response = await fetch(`${BACKEND_ORIGIN}/authentication/me`, {
        method: 'GET',
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        this._user = data.user;
        this._isAuthenticated = true;
        return true;
      } else {
        this._user = null;
        this._isAuthenticated = false;
        return false;
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      this._user = null;
      this._isAuthenticated = false;
      return false;
    }
  }

  async login(email, password) {
    try {
      const response = await fetch(`${BACKEND_ORIGIN}/authentication/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();
      if (!response.ok) {
        return { ok: false, message: data.message || 'Login failed.' };
      }

      const authenticated = await this.checkAuthStatus();
      if (!authenticated) {
        return { ok: false, message: 'Login failed. If using Safari, please try again from a different browser.' };
      }

      return { ok: true, message: data.message };
    } catch (error) {
      console.error('Login error:', error);
      return { ok: false, message: 'Something went wrong. Please try again later.' };
    }
  }

  async register(email, password) {
    try {
      const response = await fetch(`${BACKEND_ORIGIN}/authentication/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();
      if (response.ok) {
        return { ok: true, message: data.message };
      }
      return { ok: false, message: data.message || 'Registration failed.' };
    } catch (error) {
      console.error('Register error:', error);
      return { ok: false, message: 'Something went wrong. Please try again later.' };
    }
  }

  async logout() {
    try {
      await fetch(`${BACKEND_ORIGIN}/authentication/logout`, {
        method: 'POST',
        credentials: 'include'
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
    this._user = null;
    this._isAuthenticated = false;
  }

  get user() { return this._user; }
  get isAuthenticated() { return this._isAuthenticated; }
}

export default new AuthService();
