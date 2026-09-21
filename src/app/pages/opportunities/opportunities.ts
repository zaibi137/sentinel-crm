import { Component, OnInit, ViewChild, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import { OpportunityService } from '../../services/opportunities.service';
import { LeadService } from '../../services/leads.service';
import { CustomerService } from '../../services/customers.service';
import { UserService } from '../../services/users.service';

const STORAGE_KEY = 'opportunities_pipeline';

export interface Opportunity {
  id: string;
  displayId?: string;
  leadId: string;
  customerId?: string;
  leadName?: string;
  companyName?: string;
  leadRef?: string;
  assignee?: string;
  revenue: number;
  probability: number;
  closingDate: string;
  stage: string;
  competitor?: string;
  notes?: string;
}

@Component({
  selector: 'app-opportunities',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './opportunities.html'
})
export class Opportunities implements OnInit {
  @ViewChild('oppForm') oppForm!: NgForm;

  opportunities: Opportunity[] = [];
  searchQuery: string = '';
  selectedStageFilter: string = 'ALL';
  isModalOpen: boolean = false;
  isConvertModalOpen: boolean = false;
  isSubmitting: boolean = false;
  modalTitle: string = 'Create New Opportunity';

  leadSnapshot: any[] = [];
  customerSnapshot: any[] = [];
  assigneeOptions: Array<{ id: string; name: string }> = [];

  oForm: Opportunity = this.getEmptyFormState();
  convertPreviewData: any = {};

  private editingOppId: string | null = null;

  private stageToNumMap: { [key: string]: number } = {
    'New': 0, 'Qualified': 1, 'Proposal Sent': 2, 'Negotiation': 3, 'Won': 4, 'Lost': 5, 'Quotation': 6
  };

  private numToStageMap: { [key: number]: string } = {
    0: 'New', 1: 'Qualified', 2: 'Proposal Sent', 3: 'Negotiation', 4: 'Won', 5: 'Lost', 6: 'Quotation'
  };

  constructor(
    private router: Router,
    private opportunityService: OpportunityService,
    private leadService: LeadService,
    private customerService: CustomerService,
    private userService: UserService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.purgeCorruptLocalEntries();

    this.fetchRealLeadsForDropdown();
    this.fetchRealCustomersForDropdown();
    this.fetchRealUsersForDropdown();

    this.fetchOpportunitiesFromAPI();

    this.syncGlobalLeadSnapshots();
    this.loadOpportunitiesFromStorage();
    this.checkForIncomingLeadConversion();
  }

  public isValidGuid(val: string | undefined | null): boolean {
    if (!val) return false;
    return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/i.test(val.trim());
  }

  public truncateUUID(uuid: string): string {
    if (!uuid) return 'LD-001';
    if (uuid.startsWith('LD-') || uuid.startsWith('OPP-')) return uuid;
    return `LD-${uuid.substring(0, 4).toUpperCase()}`;
  }

  private checkForIncomingLeadConversion(): void {
    try {
      const incomingData = localStorage.getItem('pending_lead_conversion') || localStorage.getItem('converting_lead_to_opp');
      if (incomingData) {
        const parsed = JSON.parse(incomingData);
        this.openCreateOpportunity();
        this.oForm.leadRef = parsed.id || parsed.leadId || '';
        if (parsed.revenue || parsed.budget) {
          this.oForm.revenue = Number(parsed.revenue || parsed.budget);
        }
        localStorage.removeItem('pending_lead_conversion');
        localStorage.removeItem('converting_lead_to_opp');
      }
    } catch (e) {}
  }

  fetchRealLeadsForDropdown(): void {
    this.leadService.getLeads().subscribe({
      next: (res: any) => {
        let itemsArray = Array.isArray(res?.data?.items) ? res.data.items : Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];

        itemsArray.forEach((item: any) => {
          const leadId = item.id || item.leadId;
          const leadName = item.leadName || item.name || '';
          const companyName = item.companyName || item.company || '';

          if (leadId && leadName && this.isValidGuid(leadId)) {
            const exists = this.leadSnapshot.some(l => l.id === leadId);
            if (!exists) {
              this.leadSnapshot.push({
                id: leadId,
                displayId: this.truncateUUID(leadId),
                name: leadName,
                company: companyName,
                industry: item.industry || 'General',
                isRealApiLead: true
              });
            }
          }
        });
        this.syncGlobalLeadSnapshots();
      },
      error: () => this.syncGlobalLeadSnapshots()
    });
  }

  fetchRealCustomersForDropdown(): void {
    this.customerService.getCustomers(1, 100).subscribe({
      next: (res: any) => {
        let itemsArray = [];
        if (res && res.data && Array.isArray(res.data.items)) {
          itemsArray = res.data.items;
        } else if (res && Array.isArray(res.items)) {
          itemsArray = res.items;
        } else if (Array.isArray(res)) {
          itemsArray = res;
        }

        this.customerSnapshot = itemsArray
          .filter((c: any) => this.isValidGuid(c.id))
          .map((c: any) => {
            const exactName = c.customerName || c.customerCode || 'Unknown Customer';
            return {
              id: c.id,
              name: exactName.trim()
            };
          });
      },
      error: (err) => console.error("Could not fetch real customers", err)
    });
  }

  fetchRealUsersForDropdown(): void {
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

        this.assigneeOptions = usersArray
          .filter((u: any) => u && this.isValidGuid(u.id))
          .map((u: any) => ({
            id: String(u.id),
            name: u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'Sales Agent'
          }));

        this.cdr.detectChanges();
      },
      error: (err) => console.error("Could not fetch real users", err)
    });
  }

  private purgeCorruptLocalEntries(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const items: Opportunity[] = JSON.parse(raw);
        const cleanItems = items.filter(o => {
          if (!o || o.id.includes('2026-0016')) return false;
          const display = this.getDisplayLeadName(o);
          return display.trim().length > 0;
        });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cleanItems));
      }
    } catch (e) {}
  }

  fetchOpportunitiesFromAPI(): void {
    let stageParam: number | undefined = undefined;
    if (this.selectedStageFilter !== 'ALL' && this.stageToNumMap[this.selectedStageFilter] !== undefined) {
      stageParam = this.stageToNumMap[this.selectedStageFilter];
    }

    this.opportunityService.getOpportunities(1, 100, this.searchQuery, stageParam).subscribe({
      next: (response: any) => {
        let rawItems: any[] = [];
        if (response?.data?.items && Array.isArray(response.data.items)) rawItems = response.data.items;
        else if (Array.isArray(response?.data)) rawItems = response.data;
        else if (Array.isArray(response)) rawItems = response;

        const apiItems: Opportunity[] = rawItems.map((apiOpp: any) => {
          let formattedDate = apiOpp.expectedClosingDate ? String(apiOpp.expectedClosingDate).split('T')[0] : '';
          let resolvedName = (apiOpp.leadName || '').trim();
          let resolvedCompany = (apiOpp.companyName || '').trim();

          if (!resolvedName || resolvedName.includes('Corporate') || resolvedName.includes('Unknown')) {
            const match = this.leadSnapshot.find(l => l.id === apiOpp.leadId);
            if (match) {
              resolvedName = match.name;
              resolvedCompany = match.company || match.name;
            }
          }

          let stageLabel = 'New';
          if (typeof apiOpp.salesStage === 'number' || typeof apiOpp.stage === 'number') {
            const sNum = Number(apiOpp.salesStage ?? apiOpp.stage);
            stageLabel = this.numToStageMap[sNum] || 'New';
          } else if (apiOpp.salesStage || apiOpp.stage) {
            stageLabel = String(apiOpp.salesStage || apiOpp.stage);
          }

          return {
            id: String(apiOpp.id),
            displayId: apiOpp.opportunityNumber || this.truncateUUID(String(apiOpp.id)),
            leadId: apiOpp.leadId || '',
            customerId: apiOpp.customerId || '',
            leadName: resolvedName,
            companyName: resolvedCompany,
            leadRef: apiOpp.leadId || '',
            assignee: apiOpp.assignedToUserId || '',
            revenue: Number(apiOpp.expectedRevenue || 0),
            probability: Number(apiOpp.probabilityPct || 0),
            closingDate: formattedDate,
            stage: stageLabel,
            competitor: apiOpp.competitor || '',
            notes: apiOpp.notes || ''
          };
        });

        const localItems = this.getStoredOpportunitiesRaw();
        const mergedList: Opportunity[] = [...apiItems];

        localItems.forEach((localOpp: Opportunity) => {
          if (localOpp.id.includes('2026-0016')) return;
          const existsInApi = mergedList.some(
            apiOpp => apiOpp.id === localOpp.id || (apiOpp.leadId && apiOpp.leadId === localOpp.leadId)
          );
          if (!existsInApi) {
            mergedList.unshift(localOpp);
          }
        });

        this.opportunities = mergedList;
        this.saveOpportunitiesToStorage();
        this.cdr.detectChanges();
      },
      error: () => {
        this.loadOpportunitiesFromStorage();
      }
    });
  }

  private syncGlobalLeadSnapshots(): void {
    const rawList: any[] = [...this.leadSnapshot];
    try {
      const storedSnap = localStorage.getItem('sentinel_lead_snapshot');
      if (storedSnap) rawList.push(...JSON.parse(storedSnap));
    } catch (e) {}

    const uniqueLeads: any[] = [];
    const seenIds = new Set<string>();

    rawList.forEach((item: any) => {
      if (!item) return;
      const name = (item.name || item.leadName || '').trim();
      if (!name || name.includes('Corporate') || name.includes('Unknown') || name.includes('Prospect')) return;
      if (!this.isValidGuid(item.id)) return;

      if (!seenIds.has(item.id)) {
        seenIds.add(item.id);
        uniqueLeads.push({
          id: item.id,
          displayId: item.displayId || this.truncateUUID(item.id || ''),
          name: name,
          company: (item.company || item.companyName || name).trim(),
          industry: item.industry || 'General',
          isRealApiLead: true
        });
      }
    });

    this.leadSnapshot = uniqueLeads;
  }

  private saveOpportunitiesToStorage(): void {
    const cleanList = this.opportunities.filter(o => {
      if (!o || o.id.includes('2026-0016')) return false;
      const display = this.getDisplayLeadName(o);
      return display.trim().length > 0;
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cleanList));
  }

  private getStoredOpportunitiesRaw(): Opportunity[] {
    try {
      const storedData = localStorage.getItem(STORAGE_KEY);
      return storedData ? JSON.parse(storedData) : [];
    } catch (e) {
      return [];
    }
  }

  private loadOpportunitiesFromStorage(): void {
    const raw = this.getStoredOpportunitiesRaw();
    this.opportunities = raw.filter(o => !o.id.includes('2026-0016'));
  }

  getDisplayLeadName(opp: Opportunity): string {
    if (!opp) return '';
    let name = (opp.leadName || '').trim();
    let company = (opp.companyName || '').trim();
    if (name.includes('Corporate') || name.includes('Unknown') || name.includes('Prospect')) name = '';
    if (company.includes('Corporate') || company === '--' || company.includes('Unknown')) company = '';

    if (!name && opp.leadId) {
      const snap = this.leadSnapshot.find(l => l.id === opp.leadId);
      if (snap) {
        name = (snap.name || snap.leadName || '').trim();
        company = (snap.company || snap.companyName || '').trim();
      }
    }
    if (name && company) {
      if (name.toLowerCase() === company.toLowerCase()) return name;
      return `${name} - ${company}`;
    }
    return name || company || (opp.leadId ? opp.leadId : '');
  }

  getFilteredOpportunities(): Opportunity[] {
    let list = this.opportunities.filter(o => {
      if (o.id.includes('2026-0016')) return false;
      return this.getDisplayLeadName(o).trim().length > 0;
    });

    if (this.selectedStageFilter !== 'ALL') {
      list = list.filter(o => o.stage === this.selectedStageFilter);
    }
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      list = list.filter(o => {
        const displayLabel = this.getDisplayLeadName(o).toLowerCase();
        const searchId = (o.displayId || o.id).toLowerCase();
        return searchId.includes(q) || o.stage.toLowerCase().includes(q) || displayLabel.includes(q);
      });
    }
    return list;
  }

  clearAllFilters(): void {
    this.searchQuery = '';
    this.selectedStageFilter = 'ALL';
    this.fetchOpportunitiesFromAPI();
  }

  applySearch(): void {
    this.fetchOpportunitiesFromAPI();
  }

  openCreateOpportunity(): void {
    this.syncGlobalLeadSnapshots();
    this.modalTitle = 'Create New Opportunity';
    this.editingOppId = null;
    this.isSubmitting = false;

    if (!this.oForm.leadRef) {
      this.oForm = this.getEmptyFormState();
      if (this.leadSnapshot.length > 0) {
        this.oForm.leadRef = this.leadSnapshot[0].id;
      }
    }
    this.isModalOpen = true;
  }

  openEditOpportunity(opp: Opportunity): void {
    this.syncGlobalLeadSnapshots();
    this.modalTitle = 'Modify Pipeline Parameters';
    this.editingOppId = opp.id;
    this.isSubmitting = false;
    this.oForm = { ...opp, leadRef: opp.leadId, assignee: opp.assignee || '' };
    this.isModalOpen = true;
  }

  onStageChange(): void {
    switch (this.oForm.stage) {
      case 'New': this.oForm.probability = 10; break;
      case 'Qualified': this.oForm.probability = 30; break;
      case 'Proposal Sent': this.oForm.probability = 50; break;
      case 'Quotation': this.oForm.probability = 70; break;
      case 'Negotiation': this.oForm.probability = 85; break;
      case 'Won': this.oForm.probability = 100; break;
      case 'Lost': this.oForm.probability = 0; break;
    }
  }

  saveOpportunity(): void {
    if (this.isSubmitting) return;

    if (!this.oForm.leadRef) {
      alert("⚠️ Please choose a Lead from the dropdown.");
      return;
    }

    this.isSubmitting = true;
    this.oForm.leadId = this.oForm.leadRef;

    const matchingLead = this.leadSnapshot.find(l => l.id === this.oForm.leadRef);
    const resolvedLeadName = matchingLead ? matchingLead.name : (this.oForm.leadName || 'Unknown Lead');
    const resolvedCompanyName = matchingLead ? (matchingLead.company || matchingLead.name) : (this.oForm.companyName || 'Unknown Company');

    this.oForm.leadName = resolvedLeadName;
    this.oForm.companyName = resolvedCompanyName;

    let cleanDate = this.oForm.closingDate || '';
    if (cleanDate.includes('T')) cleanDate = cleanDate.split('T')[0];
    if (!cleanDate) {
      const d = new Date();
      const month = ('0' + (d.getMonth() + 1)).slice(-2);
      const day = ('0' + d.getDate()).slice(-2);
      cleanDate = `${d.getFullYear()}-${month}-${day}`;
    }

    const apiPayload: any = {
      expectedRevenue: Number(this.oForm.revenue || 0),
      probabilityPct: Number(this.oForm.probability || 0),
      expectedClosingDate: cleanDate,
      competitor: (this.oForm.competitor || "").trim(),
      notes: (this.oForm.notes || "").trim(),
      leadId: this.oForm.leadRef.trim(),
      salesStage: this.stageToNumMap[this.oForm.stage || 'New'] || 0,

      customerId: this.isValidGuid(this.oForm.customerId) ? this.oForm.customerId : null,
      assignedToUserId: this.isValidGuid(this.oForm.assignee) ? this.oForm.assignee : null
    };

    const handleSuccess = (res: any) => {
      this.isSubmitting = false;
      const returnedId = res?.data?.id || res?.id;
      this.executeLocalSaveAndRefresh(resolvedLeadName, resolvedCompanyName, returnedId);
      this.fetchOpportunitiesFromAPI();
    };

    const handleError = (err: any) => {
      this.isSubmitting = false;
      console.warn("Opportunity save failed, falling back to local-only save.", err);
      this.executeLocalSaveAndRefresh(resolvedLeadName, resolvedCompanyName);
    };

    if (this.editingOppId && this.isValidGuid(this.editingOppId)) {
      this.opportunityService.updateOpportunity(this.editingOppId, apiPayload).subscribe({
        next: handleSuccess,
        error: handleError
      });
    } else {
      this.opportunityService.addOpportunity(apiPayload).subscribe({
        next: handleSuccess,
        error: handleError
      });
    }
  }

  private executeLocalSaveAndRefresh(leadName: string, companyName: string, newApiId?: string): void {
    if (this.editingOppId) {
      const index = this.opportunities.findIndex(o => o.id === this.editingOppId);
      if (index !== -1) {
        this.opportunities[index] = {
          ...this.oForm, leadName: leadName, companyName: companyName, displayId: this.oForm.displayId || this.truncateUUID(this.oForm.id)
        };
      }
    } else {
      const nextIdNum = this.opportunities.length > 0
        ? Math.max(...this.opportunities.map(o => {
            const num = parseInt((o.displayId || o.id).replace('OPP-', ''));
            return isNaN(num) ? 0 : num;
          })) + 1
        : 1;

      const generatedId = newApiId ? String(newApiId) : `OPP-${String(nextIdNum).padStart(3, '0')}`;
      this.opportunities.unshift({
        ...this.oForm, id: generatedId, displayId: newApiId ? this.truncateUUID(String(newApiId)) : generatedId, leadName: leadName, companyName: companyName
      });
    }

    this.saveOpportunitiesToStorage();
    this.isModalOpen = false;
    this.cdr.detectChanges();
  }

  deleteOpportunity(id: string): void {
    if (confirm('Are you certain you want to delete this opportunity?')) {
      if (this.isValidGuid(id)) {
        this.opportunityService.deleteOpportunity(id).subscribe({
          next: () => {
            this.opportunities = this.opportunities.filter(o => o.id !== id);
            this.saveOpportunitiesToStorage();
            this.cdr.detectChanges();
          },
          error: () => {
            this.opportunities = this.opportunities.filter(o => o.id !== id);
            this.saveOpportunitiesToStorage();
            this.cdr.detectChanges();
          }
        });
      } else {
        this.opportunities = this.opportunities.filter(o => o.id !== id);
        this.saveOpportunitiesToStorage();
        this.cdr.detectChanges();
      }
    }
  }

  goCreateCustomer(opp: Opportunity): void {
    this.convertPreviewData = {
      fromOpp: opp.displayId || opp.id,
      name: this.getDisplayLeadName(opp),
      industry: 'General',
      contactPerson: '',
      budget: opp.revenue,
      owner: opp.assignee || 'Unassigned',
      assignee: opp.assignee || 'Unassigned'
    };
    this.isConvertModalOpen = true;
  }

  confirmAndNavigateCustomer(): void {
    localStorage.setItem('pending_won_opportunity', JSON.stringify(this.convertPreviewData));
    this.isConvertModalOpen = false;
    this.router.navigate(['/customers']);
  }

  private getEmptyFormState(): Opportunity {
    return {
      id: '', displayId: '', leadId: '', leadRef: '', customerId: '', assignee: '',
      revenue: 0, probability: 10, closingDate: '', stage: 'New', competitor: '', notes: ''
    };
  }
}