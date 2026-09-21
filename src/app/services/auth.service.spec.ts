import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service'; // 1. Removed .ts extension, 2. Used correct class name

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AuthService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});