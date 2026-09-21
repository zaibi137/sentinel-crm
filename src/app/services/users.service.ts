import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

export interface UserItem {
  id: string;
  name: string;
  email: string;
  accountsHandled?: number;
  closedWon?: number;
  tier?: string;
}

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly STORAGE_KEY = 'crm_users';

  constructor() {
    this.initStorage();
  }

  private initStorage(): void {
    if (!localStorage.getItem(this.STORAGE_KEY)) {
      const initialUsers: UserItem[] = [
        {
          id: 'usr-1',
          name: 'Admin User',
          email: 'admin@crm.com',
          accountsHandled: 12,
          closedWon: 8,
          tier: 'Tier 1'
        },
        {
          id: 'usr-2',
          name: 'Sarah Jenkins',
          email: 'sarah.j@crm.com',
          accountsHandled: 15,
          closedWon: 11,
          tier: 'Tier 2'
        }
      ];
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(initialUsers));
    }
  }

  private getStoredUsers(): UserItem[] {
    const data = localStorage.getItem(this.STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  }

  private saveUsers(users: UserItem[]): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(users));
  }

  getUsers(): Observable<UserItem[]> {
    return of(this.getStoredUsers());
  }

  getUser(id: string): Observable<UserItem> {
    const users = this.getStoredUsers();
    const user = users.find(u => u.id === id) || { id, name: 'Unknown User', email: '' };
    return of(user);
  }

  createUser(user: any): Observable<any> {
    const users = this.getStoredUsers();
    const newUser: UserItem = {
      ...user,
      id: user.id || `usr-${Date.now()}`,
      accountsHandled: user.accountsHandled || 0,
      closedWon: user.closedWon || 0,
      tier: user.tier || 'Tier 1'
    };
    users.unshift(newUser);
    this.saveUsers(users);
    return of({ success: true, data: newUser });
  }

  updateUser(id: string, user: any): Observable<any> {
    const users = this.getStoredUsers();
    const index = users.findIndex(u => u.id === id);
    if (index !== -1) {
      users[index] = { ...users[index], ...user, id };
      this.saveUsers(users);
      return of({ success: true, data: users[index] });
    }
    return of({ success: false, message: 'User not found' });
  }
}