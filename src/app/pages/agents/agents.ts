import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { UserService } from '../../services/users.service';
import { LeadService } from '../../services/leads.service';
import { OpportunityService } from '../../services/opportunities.service';
import { forkJoin } from 'rxjs';

interface AgentRow {
  id: string;
  name: string;
  role: string;
  initials: string;
  leadCount: number;
  oppCount: number;
  wonCount: number;
  lostCount: number;
  revenue: number;
  pipelineValue: number;
}

@Component({
  selector: 'app-agents',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './agents.html',
  styleUrl: './agents.css'
})
export class Agents implements OnInit {
  agents: AgentRow[] = [];

  teamKPIs = {
    totalRevenue: 0,
    winRate: '0%',
    openPipeline: 0
  };

  isLoading = true;
  loadError = '';

  constructor(
    private router: Router,
    private userService: UserService,
    private leadService: LeadService,
    private opportunityService: OpportunityService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.fetchAgentsData();
  }

  fetchAgentsData(): void {
    this.isLoading = true;
    this.loadError = '';

    forkJoin({
      users: this.userService.getUsers(),
      leads: this.leadService.getLeads(),
      opportunities: this.opportunityService.getOpportunities(1, 500)
    }).subscribe({
      next: (result: any) => {
        // ✅ Safe extraction with proper type checking
        const usersList = this.extractItems(result.users);
        const leadsList = this.extractItems(result.leads);
        const oppsList = this.extractItems(result.opportunities);

        // Build agent rows from the User list
        this.agents = usersList.map((user: any) => {
          const id = user.id || user.userId;
          const name = user.name || user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Sales Agent';
          const role = user.role || user.designation || user.roleName || 'Sales Executive';

          // Count leads assigned to this user
          const leadCount = leadsList.filter((l: any) => l.assignedSalespersonId === id).length;

          // Count opportunities assigned to this user
          const oppsForAgent = oppsList.filter((o: any) => o.assignedToUserId === id);
          const oppCount = oppsForAgent.length;

          // Won / Lost / Revenue / Pipeline
          let wonCount = 0, lostCount = 0, revenue = 0, pipelineValue = 0;
          oppsForAgent.forEach((o: any) => {
            const stage = (o.salesStage ?? o.stage ?? '').toString().toLowerCase();
            const rev = Number(o.expectedRevenue || o.revenue || 0);
            if (stage === 'won' || stage === '4') {
              wonCount++;
              revenue += rev;
            } else if (stage === 'lost' || stage === '5') {
              lostCount++;
            } else {
              pipelineValue += rev;
            }
          });

          return {
            id,
            name,
            role,
            initials: this.getInitials(name),
            leadCount,
            oppCount,
            wonCount,
            lostCount,
            revenue,
            pipelineValue
          };
        });

        this.calculateTeamKPIs();
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load agent data', err);
        this.loadError = 'Could not load agent performance data. Please try again.';
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  // ✅ SAFE extraction – handles any response shape
  private extractItems(response: any): any[] {
    if (!response) return [];
    
    // If it's already an array, return it
    if (Array.isArray(response)) return response;
    
    // Check for nested data structures
    if (response.data && Array.isArray(response.data)) return response.data;
    if (response.data && response.data.items && Array.isArray(response.data.items)) {
      return response.data.items;
    }
    if (response.items && Array.isArray(response.items)) return response.items;
    
    // If it has a value property (some APIs use this)
    if (response.value && Array.isArray(response.value)) return response.value;
    
    // If it's an object with numeric keys (array-like), convert it
    if (typeof response === 'object') {
      const values = Object.values(response);
      if (values.length > 0 && Array.isArray(values[0])) {
        return values[0];
      }
    }
    
    // Return empty array if nothing works
    console.warn('Unexpected response format:', response);
    return [];
  }

  private getInitials(name: string): string {
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length === 0) return '??';
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  private calculateTeamKPIs(): void {
    let totalWon = 0, totalLost = 0, totalRevenue = 0, totalPipeline = 0;
    this.agents.forEach(agent => {
      totalWon += agent.wonCount;
      totalLost += agent.lostCount;
      totalRevenue += agent.revenue;
      totalPipeline += agent.pipelineValue;
    });

    const totalDecided = totalWon + totalLost;
    const winRate = totalDecided > 0 ? Math.round((totalWon / totalDecided) * 100) : 0;

    this.teamKPIs.totalRevenue = totalRevenue;
    this.teamKPIs.openPipeline = totalPipeline;
    this.teamKPIs.winRate = winRate + '%';
  }

  getWinRatePercent(agent: AgentRow): number {
    const decided = agent.wonCount + agent.lostCount;
    return decided > 0 ? Math.round((agent.wonCount / decided) * 100) : 0;
  }

  logout() {
    this.router.navigate(['/']);
  }
}