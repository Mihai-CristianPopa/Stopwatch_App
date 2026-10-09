import authService from './authService.js';

class AuthUI {
  constructor({ onAuthenticated, onLogout }) {
    this.onAuthenticated = onAuthenticated;
    this.onLogout = onLogout;

    this.authView = document.getElementById('auth-view');
    this.loginForm = document.getElementById('login-form');
    this.registerForm = document.getElementById('register-form');
    this.confirmationEmailScreen = document.getElementById('email-confirmation-screen');
    this.passwordResetForm = document.getElementById('request-password-reset-form');
    this.resetPasswordScreen = document.getElementById('reset-password-screen');
    this.resetPasswordForm = document.getElementById('reset-password-form');
    this.errorDiv = document.getElementById('auth-error');

    this._setupListeners();
  }

  _setupListeners() {
    document.getElementById('show-register').addEventListener('click', () => this._showRegister());
    document.getElementById('show-login').addEventListener('click', () => this._showLogin());
    document.getElementById('reset-pass-show-login').addEventListener('click', () => this._showLogin());

    document.getElementById('login-form').addEventListener('submit', e => {
      e.preventDefault();
      this._handleLogin();
    });

    document.getElementById('register-form').addEventListener('submit', e => {
      e.preventDefault();
      this._handleRegister();
    });

    document.getElementById('request-password-reset-form').addEventListener('submit', e => {
      e.preventDefault();
      this._handleRequestPasswordReset();
    });
    
    document.getElementById('reset-password-form').addEventListener('submit', e => {
      e.preventDefault();
      this._handleResetPassword();
    });

    document.getElementById('logout-btn').addEventListener('click', () => this._handleLogout());
    document.getElementById('show-request-password-reset-form').addEventListener('click', () => {
      this._showRequestPasswordResetForm();
    });
  }

  _showRequestPasswordResetForm() {
    this.loginForm.hidden = true;
    this.registerForm.hidden = true;
    this.confirmationEmailScreen.hidden = true;
    this.passwordResetForm.hidden = false;
    this.resetPasswordScreen.hidden = true;
    this.resetPasswordForm.hidden = true;
    this._clearError();
  }

  _showResetPasswordScreen() {
    this.loginForm.hidden = true;
    this.registerForm.hidden = true;
    this.confirmationEmailScreen.hidden = true;
    this.passwordResetForm.hidden = true;
    this.resetPasswordScreen.hidden = false;
    this.resetPasswordForm.hidden = true;
    this._clearError();
  }

  _showLogin() {
    this.loginForm.hidden = false;
    this.registerForm.hidden = true;
    this.confirmationEmailScreen.hidden = true;
    this.passwordResetForm.hidden = true;
    this.resetPasswordScreen.hidden = true;
    this.resetPasswordForm.hidden = true;
    this._clearError();
  }

  _showRegister() {
    this.loginForm.hidden = true;
    this.registerForm.hidden = false;
    this.confirmationEmailScreen.hidden = true;
    this.passwordResetForm.hidden = true;
    this.resetPasswordScreen.hidden = true;
    this.resetPasswordForm.hidden = true;
    this._clearError();
  }

  _showEmailConfirmation() {
    this.loginForm.hidden = true;
    this.registerForm.hidden = true;
    this.confirmationEmailScreen.hidden = false;
    this.passwordResetForm.hidden = true;
    this.resetPasswordScreen.hidden = true;
    this.resetPasswordForm.hidden = true;
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

  _clearEmail() {
    document.getElementById('login-email').value = "";
  }

  _clearPassword() {
    document.getElementById('login-password').value = "";
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
      // Here I need to show the user that he received an email and he needs to confirm it to proceed
      // And not yet set up the login
      if (result.skipped === true) {
        document.getElementById('login-email').value = email;
        this._showLogin();
      } else {
        this._showEmailConfirmation();
      }
    } else {
      this._showError(result.message);
    }
  }
  async _handleResetPassword() {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const email = params.get('reset-password-email');
    if (!token || !email) {
      this._showError('Missing mandatory parameters.');
      return;
    }

    const password = document.getElementById('reset-password').value;
    const confirm = document.getElementById('reset-confirm').value;

    if (password !== confirm) {
      this._showError('Passwords do not match.');
      return;
    }

    this._setLoading(this.resetPasswordForm, true);
    this._clearError();

    const result = await authService.resetPassword({token, email, password});

    this._setLoading(this.resetPasswordForm, false);
    if (result.ok) {
        document.getElementById('login-email').value = email;
        this._showLogin();
    } else {
      this._showError(result.message);
    }
  }
  
  async _handleRequestPasswordReset() {
    const email = document.getElementById('password-reset-input-email').value.trim();
    this._setLoading(this.passwordResetForm, true);
    this._clearError();

    const result = await authService.requestPasswordReset(email);

    this._setLoading(this.passwordResetForm, false);
    if (result.ok) {
        this._showResetPasswordScreen();
    } else {
      this._showError(result.message);
    }
  }

  async _handleLogout() {
    await authService.logout();
    this._clearEmail();
    this._clearPassword();
    this.onLogout();
  }
}

export default AuthUI;
