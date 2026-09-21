import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LeadService {
  private readonly LEADS_KEY = 'crm_leads';
  private readonly OPP_KEY = 'crm_opportunities';
  private readonly CUST_KEY = 'crm_customers';

  constructor() {
    this.initStorage();
  }

  private initStorage(): void {
    if (!localStorage.getItem(this.LEADS_KEY)) {
      const initialLeads = [
        {
          id: 'lead-1',
          leadName: 'Cloud Infrastructure Migration',
          companyName: 'Nexus Logistics',
          email: 'robert@nexus.com',
          mobile: '+1 555-0143',
          leadStatus: 0, // 'New'
          leadSource: 0  // 'Website'
        },
        {
          id: 'lead-2',
          leadName: 'ERP Custom Integration',
          companyName: 'Apex Retailers',
          email: 'cody@apex.com',
          mobile: '+1 555-0188',
          leadStatus: 1, // 'Contacted'
          leadSource: 1  // 'Referral'
        }
      ];
      localStorage.setItem(this.LEADS_KEY, JSON.stringify(initialLeads));
    }
  }

  private getStoredLeads(): any[] {
    const data = localStorage.getItem(this.LEADS_KEY);
    return data ? JSON.parse(data) : [];
  }

  private saveLeads(leads: any[]): void {
    localStorage.setItem(this.LEADS_KEY, JSON.stringify(leads));
  }

  getLeads(): Observable<any> {
    const leads = this.getStoredLeads();
    
    // Wrapped structure matches what fetchLeadsFromAPI() in Leads component checks
    return of({
      data: {
        items: leads,
        totalCount: leads.length
      },
      items: leads
    });
  }

  addLead(leadData: any): Observable<any> {
    const leads = this.getStoredLeads();
    const newLead = {
      ...leadData,
      id: leadData.id || `lead-${Date.now()}`,
      leadStatus: leadData.leadStatus !== undefined ? leadData.leadStatus : 0
    };
    leads.unshift(newLead);
    this.saveLeads(leads);
    return of({ success: true, data: newLead });
  }

  updateLead(id: string, leadData: any): Observable<any> {
    const leads = this.getStoredLeads();
    const index = leads.findIndex(l => l.id === id);
    if (index !== -1) {
      leads[index] = { ...leads[index], ...leadData, id };
      this.saveLeads(leads);
      return of({ success: true, data: leads[index] });
    }
    return of({ success: false, message: 'Lead not found' });
  }

  deleteLead(id: string): Observable<any> {
    let leads = this.getStoredLeads();
    leads = leads.filter(l => l.id !== id);
    this.saveLeads(leads);
    return of({ success: true, message: 'Lead deleted successfully' });
  }

  convertLead(leadId: string, conversionData: any): Observable<any> {
    const leads = this.getStoredLeads();
    const index = leads.findIndex(l => l.id === leadId);

    if (index !== -1) {
      // Mark as Converted (Status 3)
      leads[index].leadStatus = 3;
      leads[index].isConverted = true;
      this.saveLeads(leads);

      return of({
        success: true,
        message: 'Lead converted successfully',
        data: leads[index]
      });
    }

    return of({ success: false, message: 'Lead not found' });
  }
}