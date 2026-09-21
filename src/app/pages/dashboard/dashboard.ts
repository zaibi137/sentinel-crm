import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { forkJoin } from 'rxjs';
import { LeadService } from '../../services/leads.service';
import { OpportunityService } from '../../services/opportunities.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './dashboard.html',
  styles: [`
    .table-row-hover:hover { background-color: #F8FAFC !important; }
    span, .badge, .status {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 100%;
    }
    div { min-width: 0; }
    .table-responsive { overflow-x: auto; max-width: 100%; }
  `]
})
export class Dashboard implements OnInit {
  leadsList: any[] = [];
  opportunitiesList: any[] = [];
  upcomingTasks: any[] = [];

  isLoading = true;
  loadError = '';

  taskSortCriterion: 'dueDate' | 'priority' = 'priority';
  nextTaskId = 1;
  editingId: string | null = null;
  searchQuery = '';
  isFormOpen = false;
  isTaskFormOpen = false;
  formTitle = 'Add New Sale Deal';

  lForm = { name: '', phone: '', source: 'Website', stage: 'New', value: 0, lastInteraction: 'Call', interactionNotes: '', leadId: '' };
  tForm = { title: '', relatedTo: '', dueDate: '', priority: 'High' };

  leadErrors = { name: '', phone: '', value: '' };
  taskErrors = { title: '', dueDate: '' };

  private sourceMapping = ['Website', 'Referral', 'Social Media', 'Walk-in', 'Cold Call'];
  private sourceToNum: { [key: string]: number } = {
    'Website': 0, 'Referral': 1, 'Social Media': 2, 'Walk-in': 3, 'Cold Call': 4
  };

  constructor(
    private router: Router,
    private leadService: LeadService,
    private opportunityService: OpportunityService
  ) {}

  ngOnInit(): void {
    this.loadTasksFromStorage();
    this.fetchDashboardData();
  }

  fetchDashboardData(): void {
    this.isLoading = true;
    this.loadError = '';

    forkJoin({
      leadsRes: this.leadService.getLeads(),
      oppsRes: this.opportunityService.getOpportunities(1, 100)
    }).subscribe({
      next: ({ leadsRes, oppsRes }) => {
        const rawLeads = this.extractItems(leadsRes);
        const rawOpps = this.extractItems(oppsRes);

        const oppByLeadId = new Map<string, any>();
        rawOpps.forEach((o: any) => {
          if (o.leadId) oppByLeadId.set(o.leadId, o);
        });

        this.opportunitiesList = rawOpps;

        this.leadsList = rawLeads.map((apiLead: any) => {
          const matchedOpp = oppByLeadId.get(apiLead.id);
          return {
            id: apiLead.id,
            leadId: apiLead.id,
            name: apiLead.leadName || apiLead.name || 'No Name',
            phone: apiLead.mobile || '--',
            source: this.sourceMapping[apiLead.leadSource] || apiLead.leadSource || 'Website',
            stage: matchedOpp ? this.resolveStage(matchedOpp) : this.resolveLeadStage(apiLead),
            value: matchedOpp ? Number(matchedOpp.expectedRevenue || 0) : 0,
            lastInteraction: 'System',
            interactionNotes: apiLead.remarks || '',
            interactionDate: new Date().toISOString().slice(0, 10)
          };
        });

        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to load dashboard data', err);
        this.loadError = 'Could not load live data from the server.';
        this.isLoading = false;
      }
    });
  }

  private extractItems(res: any): any[] {
    if (Array.isArray(res)) return res;
    if (Array.isArray(res?.data?.items)) return res.data.items;
    if (Array.isArray(res?.data)) return res.data;
    if (Array.isArray(res?.items)) return res.items;
    return [];
  }

  private resolveStage(opp: any): string {
    if (opp.salesStage !== undefined && opp.salesStage !== null) {
      if (typeof opp.salesStage === 'string' && isNaN(Number(opp.salesStage))) {
        return opp.salesStage;
      }
      const stageNum = Number(opp.salesStage);
      const numToStage: { [key: number]: string } = {
        0: 'New',
        1: 'Contacted',
        2: 'Proposal Sent',
        3: 'Quotation',
        4: 'Negotiation',
        5: 'Won',
        6: 'Lost'
      };
      if (numToStage[stageNum] !== undefined) {
        return numToStage[stageNum];
      }
    }
    return 'New';
  }

  private resolveLeadStage(lead: any): string {
    const rawStage = lead.leadStatus !== undefined ? lead.leadStatus : (lead.salesStage || lead.status);
    if (rawStage !== undefined && rawStage !== null) {
      if (typeof rawStage === 'string' && isNaN(Number(rawStage))) {
        return rawStage;
      }
      const statusNum = Number(rawStage);
      const leadStatusMap: { [key: number]: string } = {
        0: 'New',
        1: 'Contacted',
        2: 'Proposal Sent',
        3: 'Quotation',
        4: 'Negotiation',
        5: 'Won',
        6: 'Lost'
      };
      if (leadStatusMap[statusNum] !== undefined) {
        return leadStatusMap[statusNum];
      }
    }
    return 'New';
  }

  private loadTasksFromStorage(): void {
    const savedTasks = localStorage.getItem('crm_tasks_list');
    const savedNextTaskId = localStorage.getItem('crm_next_task_id');
    this.upcomingTasks = savedTasks ? JSON.parse(savedTasks) : [];
    this.nextTaskId = savedNextTaskId ? parseInt(savedNextTaskId, 10) : 1;
  }

  private saveTasksToStorage(): void {
    localStorage.setItem('crm_tasks_list', JSON.stringify(this.upcomingTasks));
    localStorage.setItem('crm_next_task_id', this.nextTaskId.toString());
  }

  getTotalLeadsCount(): number {
    return this.leadsList.length;
  }

  getPipelineValueSum(): number {
    return this.leadsList
      .filter(l => (l.stage || '').toLowerCase() !== 'won' && (l.stage || '').toLowerCase() !== 'lost')
      .reduce((sum, l) => sum + l.value, 0);
  }

  getWonRevenueSum(): number {
    return this.leadsList
      .filter(l => (l.stage || '').toLowerCase() === 'won')
      .reduce((sum, l) => sum + l.value, 0);
  }

  getConversionWinRate(): number {
    const closedDeals = this.leadsList.filter(l => {
      const st = (l.stage || '').toLowerCase();
      return st === 'won' || st === 'lost';
    }).length;
    if (closedDeals === 0) return 0;
    const wonDeals = this.leadsList.filter(l => (l.stage || '').toLowerCase() === 'won').length;
    return Math.round((wonDeals / closedDeals) * 100);
  }

  private normalizeStage(stageStr: string): string {
    return (stageStr || '').toLowerCase().replace(/[\s_-]+/g, '');
  }

  getStageCount(stage: string): number {
    const target = this.normalizeStage(stage);
    return this.leadsList.filter(l => this.normalizeStage(l.stage) === target).length;
  }

  getLeadsByStage(stage: string) {
    const target = this.normalizeStage(stage);
    return this.leadsList.filter(l => this.normalizeStage(l.stage) === target);
  }

  getInteractionCount(type: string): number {
    return this.leadsList.filter(l => (l.source || '').toLowerCase() === type.toLowerCase()).length;
  }

  getInteractionWidth(type: string): string {
    return this.getInteractionPercentage(type) + '%';
  }

  getInteractionPercentage(type: string): number {
    if (!this.leadsList.length) return 0;
    return Math.round((this.getInteractionCount(type) / this.leadsList.length) * 100);
  }

  getSortedTasks() {
    const priorityWeight: Record<string, number> = { High: 3, Medium: 2, Low: 1 };
    return [...this.upcomingTasks].sort((a, b) => {
      if (this.taskSortCriterion === 'dueDate') {
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
      return (priorityWeight[b.priority] ?? 0) - (priorityWeight[a.priority] ?? 0);
    });
  }

  changeTaskSorting(criterion: 'dueDate' | 'priority'): void {
    this.taskSortCriterion = criterion;
  }

  openAddTaskForm(): void {
    this.taskErrors = { title: '', dueDate: '' };
    this.tForm = { title: '', relatedTo: '', dueDate: new Date().toISOString().slice(0, 10), priority: 'High' };
    this.isTaskFormOpen = true;
    this.isFormOpen = false;
    setTimeout(() => {
      const element = document.getElementById('taskFormPanel');
      if (element) element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  }

  saveTask(): void {
    this.taskErrors = { title: '', dueDate: '' };
    let hasError = false;

    if (!this.tForm.title.trim()) {
      this.taskErrors.title = 'Task title note required.';
      hasError = true;
    }
    if (!this.tForm.dueDate) {
      this.taskErrors.dueDate = 'Due date required.';
      hasError = true;
    }
    if (hasError) return;

    this.upcomingTasks.push({
      id: this.nextTaskId++,
      title: this.tForm.title.trim(),
      relatedTo: this.tForm.relatedTo.trim() || 'General Object',
      dueDate: this.tForm.dueDate,
      priority: this.tForm.priority
    });

    this.saveTasksToStorage();
    this.isTaskFormOpen = false;
  }

  deleteTask(id: number): void {
    this.upcomingTasks = this.upcomingTasks.filter(t => t.id !== id);
    this.saveTasksToStorage();
  }

  getFilteredLeads() {
    const q = this.searchQuery.toLowerCase().trim();
    if (!q) return this.leadsList;
    return this.leadsList.filter(l =>
      (l.name || '').toLowerCase().includes(q) ||
      (l.stage || '').toLowerCase().includes(q) ||
      (l.source || '').toLowerCase().includes(q)
    );
  }

  openAddLeadForm(): void {
    this.leadErrors = { name: '', phone: '', value: '' };
    this.editingId = null;
    this.formTitle = 'Add New Sale Deal';
    this.lForm = { name: '', phone: '', source: 'Website', stage: 'New', value: 0, lastInteraction: 'Call', interactionNotes: '', leadId: '' };
    this.isFormOpen = true;
    this.isTaskFormOpen = false;
    setTimeout(() => {
      const element = document.getElementById('dealFormPanel');
      if (element) element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  }

  openEditLeadForm(lead: any): void {
    this.leadErrors = { name: '', phone: '', value: '' };
    this.editingId = lead.id;
    this.formTitle = `Edit Deal Context — ${lead.name}`;
    this.lForm = {
      name: lead.name,
      phone: lead.phone === '--' ? '' : lead.phone,
      source: lead.source || 'Website',
      stage: lead.stage,
      value: lead.value,
      lastInteraction: lead.lastInteraction,
      interactionNotes: lead.interactionNotes,
      leadId: lead.leadId
    };
    this.isFormOpen = true;
    this.isTaskFormOpen = false;
    setTimeout(() => {
      const element = document.getElementById('dealFormPanel');
      if (element) element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  }

  saveLead(): void {
    this.leadErrors = { name: '', phone: '', value: '' };
    let hasError = false;

    if (!this.lForm.name.trim()) {
      this.leadErrors.name = 'Legitimate Deal name/entity identifier is required.';
      hasError = true;
    }

    const phoneRegex = /^\+?[0-9\s\-]{7,15}$/;
    if (!this.lForm.phone.trim()) {
      this.leadErrors.phone = 'Phone contact number required.';
      hasError = true;
    } else if (!phoneRegex.test(this.lForm.phone.trim())) {
      this.leadErrors.phone = 'Invalid phone sequence (use numerical values/spaces only).';
      hasError = true;
    }

    if (this.lForm.value === null || this.lForm.value < 0) {
      this.leadErrors.value = 'Deal value must be 0 or greater.';
      hasError = true;
    }

    if (hasError) return;

    const leadPayload = {
      leadName: this.lForm.name.trim(),
      companyName: '',
      contactPerson: '',
      mobile: this.lForm.phone.trim(),
      whatsApp: '',
      email: '',
      website: '',
      address: '',
      city: 'Dubai',
      country: 'UAE',
      industry: 'General',
      leadSource: this.sourceToNum[this.lForm.source] ?? 0,
      remarks: this.lForm.interactionNotes.trim() || ''
    };

    if (this.editingId === null) {
      this.leadService.addLead(leadPayload).subscribe({
        next: (res: any) => {
          const newLeadId = res?.data?.id || res?.id;
          if (newLeadId && this.lForm.value > 0) {
            this.opportunityService.addOpportunity({
              leadId: newLeadId,
              expectedRevenue: Number(this.lForm.value),
              probabilityPct: 10,
              expectedClosingDate: new Date().toISOString().slice(0, 10),
              salesStage: this.sourceStageNum(this.lForm.stage),
              competitor: '',
              notes: ''
            }).subscribe({
              next: () => this.fetchDashboardData(),
              error: (err) => { console.error('Deal value could not be saved as an Opportunity', err); this.fetchDashboardData(); }
            });
          } else {
            this.fetchDashboardData();
          }
          this.isFormOpen = false;
        },
        error: (err) => {
          console.error('Failed to create lead', err);
          alert('Could not save this deal — the server rejected the request. Check the console for details.');
        }
      });
    } else {
      this.leadService.updateLead(this.editingId, leadPayload).subscribe({
        next: () => {
          this.fetchDashboardData();
          this.isFormOpen = false;
        },
        error: (err) => {
          console.error('Failed to update lead', err);
          alert('Could not update this deal — the server rejected the request. Check the console for details.');
        }
      });
    }
  }

  private sourceStageNum(stage: string): number {
    const map: { [key: string]: number } = {
      'New': 0, 'Contacted': 1, 'Proposal Sent': 2, 'Quotation': 3, 'Negotiation': 4, 'Won': 5, 'Lost': 6
    };
    return map[stage] ?? 0;
  }

  deleteLead(id: string): void {
    if (confirm('Delete profile log permanently?')) {
      this.leadService.deleteLead(id).subscribe({
        next: () => this.fetchDashboardData(),
        error: (err) => {
          console.error('Failed to delete lead', err);
          alert('Could not delete — the server rejected the request.');
        }
      });
    }
  }

  logout(): void {
    this.router.navigate(['/']);
  }
}