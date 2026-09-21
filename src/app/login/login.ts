import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

type AuthView = 'login' | 'forgot' | 'otp' | 'reset';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class LoginComponent {

  currentAuthView: AuthView = 'login';

  showLoginPassword = false;
  showNewPassword = false;
  showConfirmPassword = false;

  loginData = {
    email: '',
    password: ''
  };
  isLoading = false;
  errorMessage = '';

  forgotEmail = '';

  otp = '';
  resetToken = '';

  otpArray: string[] = ['', '', '', '', '', ''];
  otpDigits = [0, 1, 2, 3, 4, 5];
  otpError = '';
  isOTPComplete = false;

  resetPasswordData = {
    newPassword: '',
    confirmPassword: ''
  };

  toastMessage: string = '';
  toastType: 'success' | 'error' | 'info' = 'success';
  showToast: boolean = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  showToastMessage(message: string, type: 'success' | 'error' | 'info' = 'success'): void {
    this.toastMessage = message;
    this.toastType = type;
    this.showToast = true;
    this.cdr.detectChanges();

    setTimeout(() => {
      this.hideToast();
    }, 4000);
  }

  hideToast(): void {
    this.showToast = false;
    this.toastMessage = '';
    this.cdr.detectChanges();
  }

  onOTPInput(event: any, index: number): void {
    const input = event.target;
    const value = input.value.replace(/[^0-9]/g, '');

    this.otpArray[index] = value;
    this.otp = this.otpArray.join('');
    this.isOTPComplete = this.otpArray.every(digit => digit !== '');

    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      if (nextInput) {
        (nextInput as HTMLInputElement).focus();
      }
    }

    if (this.otpError) {
      this.otpError = '';
    }

    this.cdr.detectChanges();
  }

  onOTPKeyDown(event: any, index: number): void {
    if (event.key === 'Backspace' && !event.target.value && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      if (prevInput) {
        (prevInput as HTMLInputElement).focus();
        (prevInput as HTMLInputElement).select();
      }
    }
  }

  onOTPPaste(event: any): void {
    event.preventDefault();
    const pastedData = event.clipboardData?.getData('text') || '';
    const digits = pastedData.replace(/[^0-9]/g, '').slice(0, 6);

    if (digits) {
      for (let i = 0; i < digits.length && i < 6; i++) {
        this.otpArray[i] = digits[i];
      }
      this.otp = this.otpArray.join('');
      this.isOTPComplete = this.otpArray.every(digit => digit !== '');

      const nextEmptyIndex = this.otpArray.findIndex(digit => digit === '');
      if (nextEmptyIndex !== -1 && nextEmptyIndex < 6) {
        const nextInput = document.getElementById(`otp-${nextEmptyIndex}`);
        if (nextInput) {
          (nextInput as HTMLInputElement).focus();
        }
      } else if (this.isOTPComplete) {
        const lastInput = document.getElementById('otp-5');
        if (lastInput) {
          (lastInput as HTMLInputElement).focus();
        }
      }

      this.cdr.detectChanges();
    }
  }

  onOTPFocus(index: number): void {
    const input = document.getElementById(`otp-${index}`) as HTMLInputElement;
    if (input) {
      input.select();
    }
  }

  private getApiErrorMessage(err: any, fallback: string): string {
    if (err?.error?.errors && Array.isArray(err.error.errors) && err.error.errors.length > 0) {
      return err.error.errors.join(' ');
    }
    if (err?.error?.message && String(err.error.message).trim()) {
      return err.error.message;
    }
    return fallback;
  }

  private extractStringField(...candidates: any[]): string {
    for (const c of candidates) {
      if (typeof c === 'string' && c.trim().length > 0) {
        return c.trim();
      }
    }
    return '';
  }

  switchView(view: AuthView): void {
    this.currentAuthView = view;
    this.errorMessage = '';
    this.otpError = '';

    this.showLoginPassword = false;
    this.showNewPassword = false;
    this.showConfirmPassword = false;

    if (view !== 'otp') {
      this.otpArray = ['', '', '', '', '', ''];
      this.otp = '';
      this.isOTPComplete = false;
    }

    this.cdr.detectChanges();
  }

  onLoginSubmit(): void {
    const cleanEmail = (this.loginData.email || '').trim();
    const cleanPassword = (this.loginData.password || '').trim();

    if (!cleanEmail || !cleanPassword) {
      this.errorMessage = 'Please enter both email and password.';
      return;
    }

    this.errorMessage = '';
    this.isLoading = true;
    this.cdr.detectChanges();

    this.authService.login({ email: cleanEmail, password: cleanPassword }).subscribe({
      next: (response: any) => {
        this.isLoading = false;
        this.showToastMessage('Login Successful!', 'success');
        this.router.navigate(['/dashboard']);
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.isLoading = false;
        this.errorMessage = this.getApiErrorMessage(err, 'Invalid credentials. Use admin@crm.com / password123');
        this.cdr.detectChanges();
      }
    });
  }

  sendOtp(): void {
    if (!this.forgotEmail.trim()) {
      this.errorMessage = 'Please enter your registered email address.';
      return;
    }

    this.errorMessage = '';
    this.isLoading = true;
    this.cdr.detectChanges();

    this.authService.forgotPassword(this.forgotEmail).subscribe({
      next: (response: any) => {
        this.isLoading = false;
        this.otpArray = ['', '', '', '', '', ''];
        this.otp = '';
        this.isOTPComplete = false;

        this.showToastMessage(response.message, 'success');
        this.switchView('otp');
      },
      error: (err: any) => {
        this.isLoading = false;
        this.errorMessage = this.getApiErrorMessage(err, 'Could not send OTP.');
        this.cdr.detectChanges();
      }
    });
  }

  verifyOtp(): void {
    this.otp = this.otpArray.join('');

    if (!this.otp || this.otp.length !== 6) {
      this.otpError = 'Please enter all 6 digits of the OTP.';
      return;
    }

    this.otpError = '';
    this.isLoading = true;
    this.cdr.detectChanges();

    this.authService.verifyOtp(this.forgotEmail, this.otp).subscribe({
      next: (response: any) => {
        this.isLoading = false;

        this.resetToken = this.extractStringField(
          response?.data?.resetToken,
          response?.token
        );

        this.resetPasswordData = { newPassword: '', confirmPassword: '' };
        this.showToastMessage(response.message, 'success');
        this.switchView('reset');
      },
      error: (err: any) => {
        this.isLoading = false;
        this.otpError = this.getApiErrorMessage(err, 'Invalid OTP.');
        this.cdr.detectChanges();
      }
    });
  }

  resetPassword(): void {
    const { newPassword, confirmPassword } = this.resetPasswordData;

    if (!newPassword || !confirmPassword) {
      this.errorMessage = 'Please fill in both password fields.';
      return;
    }

    if (newPassword !== confirmPassword) {
      this.errorMessage = 'Passwords do not match.';
      return;
    }

    this.errorMessage = '';
    this.isLoading = true;
    this.cdr.detectChanges();

    const exactPayload = {
      email: this.forgotEmail.trim(),
      token: this.resetToken,
      password: newPassword
    };

    this.authService.resetPassword(exactPayload).subscribe({
      next: (response: any) => {
        this.isLoading = false;
        this.resetToken = '';
        this.loginData = { email: this.forgotEmail, password: '' };

        this.showToastMessage(response.message, 'success');
        this.switchView('login');
      },
      error: (err: any) => {
        this.isLoading = false;
        this.errorMessage = this.getApiErrorMessage(err, 'Could not reset password.');
        this.cdr.detectChanges();
      }
    });
  }
}