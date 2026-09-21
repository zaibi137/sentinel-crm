import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { LeadService } from '../../services/leads.service';
import { UserService } from '../../services/users.service';

interface LeadItem {
  id: string;
  name: string;
  company: string;
  contact: string;
  mobile: string;
  whatsapp: string;
  email: string;
  website: string;
  address: string;
  city: string;
  country: string;
  industry: string;
  source: string;
  status: string;
  assignedTo: string;
  assignedToId: string;
  isConverted: boolean;
  remarks: string;
  history: Array<{ text: string; time: string }>;
  documents: any[];
}

const LEAD_STATUS_MAP: { [key: string]: number } = {
  'New': 0,
  'Contacted': 1,
  'Qualified': 2,
  'Converted': 3,
  'Lost': 4
};
const LEAD_STATUS_REVERSE: { [key: number]: string } = {
  0: 'New', 1: 'Contacted', 2: 'Qualified', 3: 'Converted', 4: 'Lost'
};
const LEAD_SOURCE_MAP: { [key: string]: number } = {
  'Website': 0, 'Referral': 1, 'Social Media': 2, 'Walk-in': 3, 'Cold Call': 4
};
const LEAD_SOURCE_REVERSE = ['Website', 'Referral', 'Social Media', 'Walk-in', 'Cold Call'];

@Component({
  selector: 'app-leads',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './leads.html',
  styleUrl: './leads.css'
})
export class Leads implements OnInit {

  leadsList: LeadItem[] = [];
  salesRoster: { id: string, name: string }[] = [];
  searchQuery = '';

  isFormModalOpen = false;
  isDetailModalOpen = false;
  isConvertModalOpen = false;
  formModalTitle = 'Create new lead';

  editingLeadId: string | null = null;
  selectedLead: LeadItem | null = null;
  formErrors: { [key: string]: string } = {};

  lForm = this.getEmptyFormState();

  convertForm = {
    leadId: '',
    leadName: '',
    companyName: '',
    assignedToName: '',
    expectedRevenue: 0,
    probabilityPct: 10,
    expectedClosingDate: '',
    salesStage: 'New',
    competitor: '',
    notes: ''
  };

  constructor(
    private router: Router,
    private leadService: LeadService,
    private userService: UserService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadSalesRosterFromAPI();
  }

  fetchLeadsFromAPI(): void {
    this.leadService.getLeads().subscribe({
      next: (response: any) => {
        let rawLeadsArray: any[] = [];

        if (response && response.data && Array.isArray(response.data.items)) {
          rawLeadsArray = response.data.items;
        } else if (response && Array.isArray(response.items)) {
          rawLeadsArray = response.items;
        } else if (response && Array.isArray(response.data)) {
          rawLeadsArray = response.data;
        } else if (Array.isArray(response)) {
          rawLeadsArray = response;
        }

        const mappedLeads = rawLeadsArray.map((apiLead: any) => {
          const statusText = typeof apiLead.leadStatus === 'number'
            ? (LEAD_STATUS_REVERSE[apiLead.leadStatus] || 'New')
            : (apiLead.leadStatus || apiLead.status || 'New');

          return {
            id: apiLead.id || apiLead.leadId,
            name: apiLead.leadName || apiLead.name || 'No Name',
            company: apiLead.companyName || apiLead.company || '--',
            contact: apiLead.contactPerson || apiLead.contact || '',
            mobile: apiLead.mobile || '',
            whatsapp: apiLead.whatsApp || apiLead.whatsapp || '',
            email: apiLead.email || '',
            website: apiLead.website || '',
            address: apiLead.address || '',
            city: apiLead.city || '',
            country: apiLead.country || '',
            industry: apiLead.industry || 'General',
            source: typeof apiLead.leadSource === 'number'
              ? (LEAD_SOURCE_REVERSE[apiLead.leadSource] || 'Website')
              : (apiLead.leadSource || 'Website'),
            status: statusText,
            assignedToId: apiLead.assignedToUserId || '',
            assignedTo: this.salesRoster.find(r => r.id === apiLead.assignedToUserId)?.name
              || apiLead.assignedToName
              || 'Unassigned',
            isConverted: statusText.toLowerCase() === 'converted' || !!apiLead.isConverted,
            remarks: apiLead.remarks || '',
            history: apiLead.history || [],
            documents: apiLead.documents || []
          } as LeadItem;
        });

        this.leadsList = mappedLeads;
        this.cdr.detectChanges();
      },
      error: (err) => console.error("Error fetching leads:", err)
    });
  }

  loadSalesRosterFromAPI(): void {
    this.userService.getUsers().subscribe({
      next: (response: any) => {
        let usersArray = [];

        if (Array.isArray(response)) {
          usersArray = response;
        } else if (response && response.data && Array.isArray(response.data.items)) {
          usersArray = response.data.items;
        } else if (response && Array.isArray(response.items)) {
          usersArray = response.items;
        } else if (response && Array.isArray(response.data)) {
          usersArray = response.data;
        }

        this.salesRoster = usersArray.map((u: any) => {
          const fullName = `${u.firstName || ''} ${u.lastName || ''}`.trim();
          return {
            id: u.id,
            name: fullName || u.username || u.name || u.email || 'Unknown User'
          };
        });

        this.cdr.detectChanges();
        this.fetchLeadsFromAPI(); 
      },
      error: (err) => {
        console.error('Failed to load live sales roster', err);
        this.fetchLeadsFromAPI(); 
      }
    });
  }

  getStatusCount(status: string): number {
    return this.leadsList.filter((l: any) => {
      const currentStatus = l.status || '';
      return currentStatus.toLowerCase() === status.toLowerCase();
    }).length;
  }

  getPieChartStyles(): string {
    const total = this.leadsList.length;
    if (total === 0) return '#E5E7EB';
    const pNew = (this.getStatusCount('New') / total) * 360;
    const pContacted = (this.getStatusCount('Contacted') / total) * 360;
    const pQualified = (this.getStatusCount('Qualified') / total) * 360;
    const r1 = pNew, r2 = r1 + pContacted, r3 = r2 + pQualified;
    return `conic-gradient(#3B82F6 0deg ${r1}deg, #F59E0B ${r1}deg ${r2}deg, #10B981 ${r2}deg ${r3}deg, #EF4444 ${r3}deg 360deg)`;
  }

  getCurrentDateStr(): string {
    const d = new Date();
    return d.getDate() + ' ' + d.toLocaleString('en-US', { month: 'short' }) + ' ' + d.getFullYear();
  }

  formatDisplayId(rawId: string): string {
    if (!rawId) return '--';
    if (rawId.startsWith('LD-')) return rawId; 
    return 'LD-' + rawId.substring(0, 8).toUpperCase();
  }

  getFilteredLeads(): LeadItem[] {
    const q = this.searchQuery.toLowerCase().trim();
    const active = this.leadsList; 
    if (!q) return active;
    return active.filter((l: any) => {
      const nameStr = (l.name || '').toLowerCase();
      const companyStr = (l.company || '').toLowerCase();
      const idStr = (l.id || '').toLowerCase();
      return nameStr.includes(q) || companyStr.includes(q) || idStr.includes(q);
    });
  }

  addHistoryLog(lead: LeadItem, textMessage: string): void {
    if (lead) {
      if (!lead.history) lead.history = [];
      lead.history.unshift({ text: textMessage, time: this.getCurrentDateStr() });
    }
  }

  private validateForm(): boolean {
    const errors: { [key: string]: string } = {};

    if (!this.lForm.name.trim()) {
      errors['name'] = 'Lead name is required.';
    }

    if (this.lForm.mobile && !/^[+0-9\s-]{7,15}$/.test(this.lForm.mobile.trim())) {
      errors['mobile'] = 'Enter a valid mobile number.';
    }

    if (this.lForm.whatsapp && !/^[+0-9\s-]{7,15}$/.test(this.lForm.whatsapp.trim())) {
      errors['whatsapp'] = 'Enter a valid WhatsApp number.';
    }

    if (this.lForm.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.lForm.email.trim())) {
      errors['email'] = 'Enter a valid email address.';
    }

    if (this.lForm.website && !/^(https?:\/\/)?([\w-]+\.)+[\w-]{2,}(\/\S*)?$/.test(this.lForm.website.trim())) {
      errors['website'] = 'Enter a valid website URL.';
    }

    this.formErrors = errors;
    return Object.keys(errors).length === 0;
  }

  openCreateLead(): void {
    this.editingLeadId = null;
    this.formModalTitle = 'Create new lead';
    this.formErrors = {};
    this.lForm = this.getEmptyFormState();
    this.isFormModalOpen = true;
    this.cdr.detectChanges();
  }

  openEditLead(lead: LeadItem): void {
    if (lead.isConverted) {
      alert("This lead has already been converted and can no longer be edited.");
      return;
    }
    this.editingLeadId = lead.id;
    this.formModalTitle = 'Edit lead — ' + lead.id;
    this.formErrors = {};
    this.lForm = {
      name: lead.name,
      company: lead.company,
      contact: lead.contact,
      mobile: lead.mobile,
      whatsapp: lead.whatsapp,
      email: lead.email,
      website: lead.website,
      address: lead.address,
      city: lead.city,
      country: lead.country,
      industry: lead.industry,
      source: lead.source,
      status: lead.status,
      assignedTo: lead.assignedToId || '',
      remarks: lead.remarks
    };
    this.isFormModalOpen = true;
    this.cdr.detectChanges();
  }

  saveLead(): void {
    if (!this.validateForm()) return;

    let assignedUserId = null;
    if (this.lForm.assignedTo && this.lForm.assignedTo !== 'Unassigned' && this.lForm.assignedTo.trim() !== '') {
      assignedUserId = this.lForm.assignedTo;
    }

    const apiPayload: any = {
      leadName: this.lForm.name.trim(),
      companyName: this.lForm.company ? this.lForm.company.trim() : '',
      contactPerson: this.lForm.contact ? this.lForm.contact.trim() : '',
      mobile: this.lForm.mobile || '',
      whatsApp: this.lForm.whatsapp || '', 
      email: this.lForm.email ? this.lForm.email.trim().toLowerCase() : '',
      website: this.lForm.website || '',
      address: this.lForm.address || '',
      city: this.lForm.city || 'Dubai',
      country: this.lForm.country || 'UAE',
      industry: this.lForm.industry || 'General',
      leadSource: LEAD_SOURCE_MAP[this.lForm.source] !== undefined ? LEAD_SOURCE_MAP[this.lForm.source] : 0,
      remarks: this.lForm.remarks || '',
      assignedToUserId: assignedUserId 
    };

    if (this.editingLeadId === null) {
      this.leadService.addLead(apiPayload).subscribe({
        next: () => {
          alert("Success: Lead record has been saved successfully!");
          this.isFormModalOpen = false;
          this.fetchLeadsFromAPI();
        },
        error: (err) => {
          console.error("Error saving lead:", err.error || err);
          alert("Error: " + (err.error?.message || 'Failed to save lead.'));
        }
      });
    } else {
      const updatePayload = {
        ...apiPayload,
        leadStatus: LEAD_STATUS_MAP[this.lForm.status] !== undefined ? LEAD_STATUS_MAP[this.lForm.status] : 0
      };
      this.leadService.updateLead(this.editingLeadId, updatePayload).subscribe({
        next: () => {
          alert("Success: Lead record has been updated successfully!");
          this.isFormModalOpen = false;
          this.fetchLeadsFromAPI();
        },
        error: (err) => {
          console.error("Error updating lead:", err.error || err);
          alert("Error: " + (err.error?.message || 'Failed to update lead.'));
        }
      });
    }
  }

  viewLeadDetails(id: string): void {
    const match = this.leadsList.find(l => l.id === id);
    if (match) {
      this.selectedLead = match;
      this.isDetailModalOpen = true;
      this.cdr.detectChanges();
    }
  }

  startLeadConversion(lead: LeadItem): void {
    if (lead.isConverted) {
      alert("This lead has already been converted.");
      return;
    }
    this.convertForm = {
      leadId: lead.id,
      leadName: lead.name,
      companyName: lead.company || '',
      assignedToName: lead.assignedTo || 'Unassigned',
      expectedRevenue: 0,
      probabilityPct: 10,
      expectedClosingDate: '',
      salesStage: 'New',
      competitor: '',
      notes: lead.remarks || ''
    };
    this.isConvertModalOpen = true;
    this.cdr.detectChanges();
  }

  onConvertStageChange(): void {
    switch (this.convertForm.salesStage) {
      case 'New': this.convertForm.probabilityPct = 10; break;
      case 'Qualified': this.convertForm.probabilityPct = 30; break;
      case 'Proposal Sent': this.convertForm.probabilityPct = 50; break;
      case 'Quotation': this.convertForm.probabilityPct = 70; break;
      case 'Negotiation': this.convertForm.probabilityPct = 85; break;
      case 'Won': this.convertForm.probabilityPct = 100; break;
      case 'Lost': this.convertForm.probabilityPct = 0; break;
    }
    this.cdr.detectChanges();
  }

  validateProb(): void {
    if (this.convertForm.probabilityPct > 100) this.convertForm.probabilityPct = 100;
    if (this.convertForm.probabilityPct < 0) this.convertForm.probabilityPct = 0;
  }

  executeConversion(): void {
    const targetLeadId = this.convertForm.leadId;
    const targetLeadName = this.convertForm.leadName || 'Converted Lead';
    const targetCompanyName = this.convertForm.companyName || '--';

    const apiPayload = {
      leadId: targetLeadId,
      leadName: targetLeadName,
      companyName: targetCompanyName,
      expectedRevenue: this.convertForm.expectedRevenue,
      probabilityPct: this.convertForm.probabilityPct,
      expectedClosingDate: this.convertForm.expectedClosingDate,
      salesStage: this.convertForm.salesStage,
      assignedToName: this.convertForm.assignedToName
    };

    this.leadService.convertLead(targetLeadId, apiPayload).subscribe({
      next: () => {
        let currentOpps = [];
        try {
          const stored = localStorage.getItem('opportunities_pipeline');
          if (stored) currentOpps = JSON.parse(stored);
        } catch (e) {}

        const nextIdNum = currentOpps.length > 0
          ? Math.max(...currentOpps.map((o: any) => isNaN(parseInt(o.id.replace('OPP-', ''))) ? 0 : parseInt(o.id.replace('OPP-', '')))) + 1
          : 1;
        const newOppId = `OPP-${String(nextIdNum).padStart(3, '0')}`;

        currentOpps.unshift({
          id: newOppId,
          leadId: targetLeadId,
          leadName: targetLeadName,
          name: targetLeadName,
          companyName: targetCompanyName,
          company: targetCompanyName,
          leadRef: `${targetLeadName} (${targetLeadId})`,
          assignee: apiPayload.assignedToName,
          revenue: apiPayload.expectedRevenue,
          probability: apiPayload.probabilityPct,
          closingDate: apiPayload.expectedClosingDate,
          stage: apiPayload.salesStage,
          competitor: this.convertForm.competitor,
          notes: this.convertForm.notes
        });
        localStorage.setItem('opportunities_pipeline', JSON.stringify(currentOpps));

        let globalLeadSnap: any[] = [];
        try {
          const snapStored = localStorage.getItem('sentinel_lead_snapshot');
          if (snapStored) globalLeadSnap = JSON.parse(snapStored);
        } catch (e) {}

        const snapIndex = globalLeadSnap.findIndex((l: any) => l.id === targetLeadId);
        const snapObj = {
          id: targetLeadId,
          name: targetLeadName,
          leadName: targetLeadName,
          company: targetCompanyName,
          companyName: targetCompanyName
        };
        if (snapIndex >= 0) {
          globalLeadSnap[snapIndex] = { ...globalLeadSnap[snapIndex], ...snapObj };
        } else {
          globalLeadSnap.push(snapObj);
        }
        localStorage.setItem('sentinel_lead_snapshot', JSON.stringify(globalLeadSnap));

        alert("Success: Lead converted to Opportunity!");
        this.isConvertModalOpen = false;
        this.cdr.detectChanges();

        this.fetchLeadsFromAPI();
        this.router.navigate(['/opportunities']);
      },
      error: (err) => {
        console.error("Conversion failed:", err.error || err);
        alert("Error: " + (err.error?.message || 'Failed to convert lead to Opportunity.'));
        this.isConvertModalOpen = false;
        this.cdr.detectChanges();
      }
    });
  }

  deleteLead(id: string): void {
    const lead = this.leadsList.find(l => l.id === id);
    if (lead?.isConverted) {
      alert("This lead has already been converted and can no longer be deleted.");
      return;
    }
    if (confirm('Are you sure you want to delete this lead record?')) {
      this.leadService.deleteLead(id).subscribe({
        next: () => {
          alert("Success: Lead record has been deleted successfully!");
          this.fetchLeadsFromAPI();
        },
        error: (err) => {
          console.error("Error deleting lead:", err.error || err);
          alert("Error: " + (err.error?.message || 'Failed to delete lead.'));
        }
      });
    }
  }

  private getEmptyFormState() {
    return {
      name: '', company: '', contact: '', mobile: '', whatsapp: '', email: '',
      website: '', address: '', city: 'Dubai', country: 'UAE', industry: 'General',
      source: 'Website', status: 'New', assignedTo: '', remarks: ''
    };
  }
}