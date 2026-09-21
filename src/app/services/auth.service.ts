import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // Hardcoded mock user for offline / local testing
  private readonly MOCK_USER = {
    email: 'admin@crm.com',
    password: 'password123',
    name: 'Admin User',
    role: 'Admin'
  };

  private readonly MOCK_OTP = '123456';
  private readonly MOCK_RESET_TOKEN = 'local-mock-reset-token-xyz';

  constructor() {}

  login(credentials: { email: string; password: string }): Observable<any> {
    const cleanEmail = (credentials.email || '').trim().toLowerCase();
    const cleanPassword = (credentials.password || '').trim();

    if (cleanEmail === this.MOCK_USER.email && cleanPassword === this.MOCK_USER.password) {
      const mockResponse = {
        success: true,
        message: 'Login successful',
        data: {
          accessToken: 'mock-local-jwt-token-123456789',
          user: {
            name: this.MOCK_USER.name,
            email: this.MOCK_USER.email,
            role: this.MOCK_USER.role
          }
        }
      };

      // Save dummy session into localStorage
      localStorage.setItem('token', mockResponse.data.accessToken);
      localStorage.setItem('crm_user', JSON.stringify(mockResponse.data.user));

      return of(mockResponse);
    }

    return throwError(() => ({
      error: { message: 'Invalid credentials. Use admin@crm.com / password123' }
    }));
  }

  forgotPassword(email: string): Observable<any> {
    return of({
      success: true,
      message: 'Mock OTP sent! Use code: 123456'
    });
  }

  verifyOtp(email: string, otp: string): Observable<any> {
    if (otp.trim() === this.MOCK_OTP) {
      return of({
        success: true,
        message: 'OTP verified successfully.',
        data: {
          resetToken: this.MOCK_RESET_TOKEN
        }
      });
    }

    return throwError(() => ({
      error: { message: 'Invalid OTP. Please enter 123456.' }
    }));
  }

  resetPassword(data: any): Observable<any> {
    return of({
      success: true,
      message: 'Password updated successfully. You can now log in.'
    });
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('crm_user');
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem('token');
  }
}