import authService from './authService.js';

class AuthUI {
  constructor({ onAuthenticated, onLogout }) {
    this.onAuthenticated = onAuthenticated;
    this.onLogout = onLogout;

    this.authView = document.getElementById('auth-view');
    this.loginForm = document.getElementById('login-form');
    this.registerForm = document.getElementById('register-form');
    this.errorDiv = document.getElementById('auth-error');

    this._setupListeners();
  }

  _setupListeners() {
    document.getElementById('show-register').addEventListener('click', () => this._showRegister());
    document.getElementById('show-login').addEventListener('click', () => this._showLogin());

    document.getElementById('login-form').addEventListener('submit', e => {
      e.preventDefault();
      this._handleLogin();
    });

    document.getElementById('register-form').addEventListener('submit', e => {
      e.preventDefault();
      this._handleRegister();
    });

    document.getElementById('logout-btn').addEventListener('click', () => this._handleLogout());
  }

  _showLogin() {
    this.loginForm.hidden = false;
    this.registerForm.hidden = true;
    this._clearError();
  }

  _showRegister() {
    this.loginForm.hidden = true;
    this.registerForm.hidden = false;
    this._clearError();
  }

  _showError(msg) {
    this.errorDiv.textContent = msg;
    this.errorDiv.hidden = false;
  }

  _clearError() {
    this.errorDiv.textContent = '';
    this.errorDiv.hidden = true;
  }

  _setLoading(form, loading) {
    form.querySelector('button[type=submit]').disabled = loading;
  }

  async _handleLogin() {
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    this._setLoading(this.loginForm, true);
    this._clearError();

    const result = await authService.login(email, password);

    this._setLoading(this.loginForm, false);
    if (result.ok) {
      this.onAuthenticated(authService.user);
    } else {
      this._showError(result.message);
    }
  }

  async _handleRegister() {
    const email = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-password').value;
    const confirm = document.getElementById('register-confirm').value;

    if (password !== confirm) {
      this._showError('Passwords do not match.');
      return;
    }

    this._setLoading(this.registerForm, true);
    this._clearError();

    const result = await authService.register(email, password);

    this._setLoading(this.registerForm, false);
    if (result.ok) {
      document.getElementById('login-email').value = email;
      this._showLogin();
    } else {
      this._showError(result.message);
    }
  }

  async _handleLogout() {
    await authService.logout();
    this.onLogout();
  }
}

export default AuthUI;
