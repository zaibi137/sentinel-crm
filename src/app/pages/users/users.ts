import { Component, OnInit, ViewChild, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { UserService, UserItem } from '../../services/users.service';
import { LeadService } from '../../services/leads.service'; // Added to count assigned accounts
import { OpportunityService } from '../../services/opportunities.service'; // Added to count closed won deals

// Extended UserItem interface to hold dynamically calculated stats
export interface SalesAgent extends UserItem {
  dynamicAccountsHandled: number;
  dynamicClosedWon: number;
}

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './users.html',
  styleUrl: './users.css'
})
export class Users implements OnInit {
  @ViewChild('agentForm') agentForm?: NgForm;

  userList: SalesAgent[] = [];
  isModalOpen = false;
  modalTitle = 'Register New Salesperson';
  editingId: string | null = null;
  isSubmitting = false;

  // Cached data for dynamic calculations
  private allLeads: any[] = [];
  private allOpps: any[] = [];

  uForm: any = {
    id: '',
    name: '',
    email: '',
    accountsHandled: 0,
    closedWon: 0,
    tier: 'Junior'
  };

  constructor(
    private router: Router,
    private userService: UserService,
    private leadService: LeadService,
    private opportunityService: OpportunityService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // We fetch everything in parallel and calculate stats when all are loaded
    this.loadAllData();
  }

  loadAllData(): void {
    // 1. Fetch Users
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

        // Initialize user list with 0 stats temporarily
        this.userList = usersArray.map((user: any) => ({
          ...user,
          dynamicAccountsHandled: 0,
          dynamicClosedWon: 0,
          tier: user.tier || 'Junior'
        }));
        
        this.cdr.detectChanges();
        this.fetchRelatedStats(); // Trigger the stat calculation!
      },
      error: (err) => {
        console.error("❌ Could not fetch users", err);
        alert('Failed to load users. Please try again.');
      }
    });
  }

  // Fetches leads & opps to calculate the real numbers
  private fetchRelatedStats(): void {
    // 1. Fetch Leads
    this.leadService.getLeads().subscribe({
      next: (res: any) => {
        let itemsArray = [];
        if (res && res.data && res.data.items) {
          itemsArray = res.data.items;
        } else if (Array.isArray(res)) {
          itemsArray = res;
        }
        this.allLeads = itemsArray;
        console.log("🔍 DEBUG - Fetched Leads for Stats:", this.allLeads);
        this.recalculateAgentStats();
      },
      error: (err) => console.error("❌ Failed to fetch leads for stats", err)
    });

    // 2. Fetch Opportunities
    this.opportunityService.getOpportunities(1, 200, '').subscribe({
      next: (res: any) => {
        let itemsArray = [];
        if (res && res.data && res.data.items) {
          itemsArray = res.data.items;
        } else if (Array.isArray(res)) {
          itemsArray = res;
        }
        this.allOpps = itemsArray;
        console.log("🔍 DEBUG - Fetched Opportunities for Stats:", this.allOpps);
        this.recalculateAgentStats();
      },
      error: (err) => console.error("❌ Failed to fetch opportunities for stats", err)
    });
  }

  // Maps the fetched leads and opps          directly to the respective user IDs
  private recalculateAgentStats(): void {
    this.userList = this.userList.map(user => {
      
      const userName = (user.name || '').trim().toLowerCase();
      const userId = String(user.id || '').trim();

      // 1. Calculate Accounts Handled (Matches by ID or Name)
      const leadsForUser = this.allLeads.filter(lead => {
        const leadAssigneeId = String(lead.assignedToUserId || lead.assignee || '').trim();
        const leadAssigneeName = String(lead.assignedToName || lead.assignedTo || '').trim().toLowerCase();
        
        return (userId && leadAssigneeId === userId) || 
               (userName && leadAssigneeName === userName) ||
               (leadAssigneeName.includes(userName) && userName.length > 2);
      }).length;

      // 2. Calculate Closed Won (Matches by ID or Name, and stage is Won)
      const wonOppsForUser = this.allOpps.filter(opp => {
        const oppAssigneeId = String(opp.assignedToUserId || opp.assignee || '').trim();
        const oppAssigneeName = String(opp.assignedToName || '').trim().toLowerCase();

        const isAssignedToUser = (userId && oppAssigneeId === userId) || 
                                 (userName && oppAssigneeName === userName);

        const isWonStage = opp.salesStage === 4 || 
                           String(opp.salesStage).toLowerCase() === 'won' || 
                           String(opp.stage).toLowerCase() === 'won';

        return isAssignedToUser && isWonStage;
      }).length;

      return {
        ...user,
        dynamicAccountsHandled: leadsForUser,
        dynamicClosedWon: wonOppsForUser
      };
    });
    
    this.cdr.detectChanges();
  }

  // FIX: Updated to accept undefined values so the HTML template compiles without TS2345 errors
  calculateConversionRate(handled: number | undefined, won: number | undefined): number {
    const h = handled || 0;
    const w = won || 0;
    
    if (h <= 0) return 0;
    return Math.round((w / h) * 100);
  }

  getTotalAccountsHandled(): number {
    return this.userList.reduce((sum, u) => sum + (Number(u.dynamicAccountsHandled) || 0), 0);
  }

  getTotalClosedWon(): number {
    return this.userList.reduce((sum, u) => sum + (Number(u.dynamicClosedWon) || 0), 0);
  }

  openCreateUser(): void {
    this.editingId = null;
    this.modalTitle = 'Register New Salesperson';
    this.uForm = {
      id: '',
      name: '',
      email: '',
      accountsHandled: 0,
      closedWon: 0,
      tier: 'Junior'
    };
    this.isModalOpen = true;
    if (this.agentForm) {
      this.agentForm.resetForm(this.uForm);
    }
  }

  openEditUser(user: SalesAgent): void {
    this.editingId = user.id;
    this.modalTitle = `Modify Performance Ledger`;
    this.uForm = {
      ...user,
      password: '' 
    };
    this.isModalOpen = true;
  }

  saveUser(): void {
    if (Number(this.uForm.closedWon) > Number(this.uForm.accountsHandled)) {
      alert("Validation Error: Closed Won cases cannot exceed total active accounts assigned.");
      return;
    }

    const fullName = (this.uForm.name || '').trim();
    const email = (this.uForm.email || '').trim().toLowerCase();

    const nameParts = fullName.split(' ');
    const firstName = nameParts[0] || 'Unknown';
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'User';
    const generatedUsername = email.split('@')[0];

    this.isSubmitting = true;

    const apiPayload: any = {
      firstName: firstName,
      lastName: lastName,
      username: generatedUsername,
      email: email
    };

    if (!this.editingId) {
      apiPayload.password = 'Default@123!'; 
    }

    console.log('📤 Sending payload:', apiPayload);

    const handleSuccess = () => {
      this.isSubmitting = false;
      this.isModalOpen = false;
      this.loadAllData(); // Reloads users AND recalculates stats!
    };

    const handleError = (err: any) => {
      this.isSubmitting = false;
      console.error('❌ API Error:', err);
      const msg = err.error?.message || err.message || 'Unknown error';
      alert(`Failed to save user: ${msg}`);
    };

    if (this.editingId) {
      this.userService.updateUser(this.editingId, apiPayload).subscribe({
        next: handleSuccess,
        error: handleError
      });
    } else {
      this.userService.createUser(apiPayload).subscribe({
        next: handleSuccess,
        error: handleError
      });
    }
  }

  logout(): void {
    this.router.navigate(['/']);
  }
}