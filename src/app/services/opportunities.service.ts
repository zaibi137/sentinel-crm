import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class OpportunityService {
  private readonly STORAGE_KEY = 'crm_opportunities';

  constructor() {
    this.initStorage();
  }

  private initStorage(): void {
    if (!localStorage.getItem(this.STORAGE_KEY)) {
      const initialOpportunities = [
        {
          id: 'opp-101',
          title: 'Software Development Deal',
          amount: 50000,
          stage: 1, // Qualification/Prospecting
          assignedToUserId: 'usr-1',
          customerId: 'cust-101',
          customerName: 'Acme Corporation'
        },
        {
          id: 'opp-102',
          title: 'Hardware Upgrade Project',
          amount: 120000,
          stage: 2, // Proposal
          assignedToUserId: 'usr-2',
          customerId: 'cust-102',
          customerName: 'Global Tech Solutions'
        }
      ];
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(initialOpportunities));
    }
  }

  private getStoredOpportunities(): any[] {
    const data = localStorage.getItem(this.STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  }

  private saveOpportunities(opportunities: any[]): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(opportunities));
  }

  getOpportunities(
    pageNumber: number = 1,
    pageSize: number = 100,
    search: string = '',
    stage?: number,
    assignedToUserId?: string,
    customerId?: string
  ): Observable<any> {
    let opportunities = this.getStoredOpportunities();

    if (search && search.trim()) {
      const term = search.toLowerCase().trim();
      opportunities = opportunities.filter(o => 
        (o.title && o.title.toLowerCase().includes(term)) ||
        (o.customerName && o.customerName.toLowerCase().includes(term))
      );
    }

    if (stage !== undefined && stage !== null && !isNaN(stage)) {
      opportunities = opportunities.filter(o => Number(o.stage) === Number(stage));
    }

    if (assignedToUserId && assignedToUserId.trim()) {
      opportunities = opportunities.filter(o => o.assignedToUserId === assignedToUserId.trim());
    }

    if (customerId && customerId.trim()) {
      opportunities = opportunities.filter(o => o.customerId === customerId.trim());
    }

    const startIndex = (pageNumber - 1) * pageSize;
    const paginatedItems = opportunities.slice(startIndex, startIndex + pageSize);

    return of({
      items: paginatedItems,
      data: paginatedItems, // Handles dual accessibility
      totalCount: opportunities.length,
      pageNumber,
      pageSize
    });
  }

  addOpportunity(data: any): Observable<any> {
    const opportunities = this.getStoredOpportunities();
    const newOpportunity = {
      ...data,
      id: data.id || `opp-${Date.now()}`,
      stage: data.stage !== undefined ? Number(data.stage) : 1
    };
    opportunities.unshift(newOpportunity);
    this.saveOpportunities(opportunities);
    return of({ success: true, data: newOpportunity });
  }

  updateOpportunity(id: string, data: any): Observable<any> {
    const opportunities = this.getStoredOpportunities();
    const index = opportunities.findIndex(o => o.id === id);
    if (index !== -1) {
      opportunities[index] = { ...opportunities[index], ...data, id };
      this.saveOpportunities(opportunities);
      return of({ success: true, data: opportunities[index] });
    }
    return of({ success: false, message: 'Opportunity not found' });
  }

  deleteOpportunity(id: string): Observable<any> {
    let opportunities = this.getStoredOpportunities();
    opportunities = opportunities.filter(o => o.id !== id);
    this.saveOpportunities(opportunities);
    return of({ success: true, message: 'Opportunity deleted successfully' });
  }

  updateStage(id: string, stage: number): Observable<any> {
    const opportunities = this.getStoredOpportunities();
    const opp = opportunities.find(o => o.id === id);
    if (opp) {
      opp.stage = Number(stage);
      this.saveOpportunities(opportunities);
      return of({ success: true, data: opp });
    }
    return of({ success: false, message: 'Opportunity not found' });
  }

  winOpportunity(id: string, winData: any): Observable<any> {
    const opportunities = this.getStoredOpportunities();
    const opp = opportunities.find(o => o.id === id);
    if (opp) {
      opp.stage = 5; // Standard 'Closed Won' Stage
      opp.isWon = true;
      opp.winData = winData;
      this.saveOpportunities(opportunities);
      return of({ success: true, message: 'Opportunity won successfully', data: opp });
    }
    return of({ success: false, message: 'Opportunity not found' });
  }
}