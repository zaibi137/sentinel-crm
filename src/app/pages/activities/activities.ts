import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

interface TaskItem {
  id: number;
  title: string;
  relatedTo: string;
  dueDate: string;
  priority: string;
  assignedTo: string;
  status: string;
  notes: string;
}

interface ActivityItem {
  id: number;
  type: string;
  date: string;
  relatedTo: string;
  loggedBy: string;
  description: string;
}

@Component({
  selector: 'app-activities',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './activities.html',
  styleUrl: './activities.css' // Safely keep it if you have it
})
export class Activities implements OnInit {
  @ViewChild('taskForm') taskForm!: NgForm;
  @ViewChild('actForm') actForm!: NgForm;

  activeTab: 'tasks' | 'activities' = 'tasks';

  // Core Data Arrays
  tasksList: TaskItem[] = [];
  activitiesList: ActivityItem[] = [];

  // Dynamic Context Dropdown Data (Mapped across system entities)
  contextSnapshot: any[] = [
    { id: 'LD-0001', name: 'Ahmed Al Mansoori (Lead)' },
    { id: 'LD-0003', name: 'Khalid bin Rashid (Lead)' },
    { id: 'LD-0006', name: 'Mariam Al Qasimi (Lead)' },
    { id: 'OPP-001', name: 'Al Futtaim - Negotiation (Opp)' },
    { id: 'OPP-002', name: 'Emaar Properties - Won (Opp)' },
    { id: 'OPP-003', name: 'Falasi Construction (Opp)' }
  ];

  isTaskModalOpen = false;
  isActivityModalOpen = false;
  
  taskModalTitle = 'Create task';
  activityModalTitle = 'Log activity';
  
  private editingTaskId: number | null = null;
  private editingActivityId: number | null = null;

  // Bound Form Data Structures
  tForm: TaskItem = this.getEmptyTaskState();
  aForm: ActivityItem = this.getEmptyActivityState();

  constructor(private router: Router) {}

  ngOnInit() {
    this.loadStateFromStorage();
  }

  switchTab(tabName: 'tasks' | 'activities') {
    this.activeTab = tabName;
  }

  // Overdue Analytical Calculation Engine
  isOverdue(dueDateStr: string, status: string): boolean {
    if (status === 'Completed' || !dueDateStr) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(dueDateStr);
    dueDate.setHours(0, 0, 0, 0);
    return dueDate < today;
  }

  // --- LOCAL STORAGE DATA SYNC ---
  private saveStateToStorage(): void {
    localStorage.setItem('crm_tasks_list', JSON.stringify(this.tasksList));
    localStorage.setItem('crm_activities_list', JSON.stringify(this.activitiesList));
  }

  private loadStateFromStorage(): void {
    const storedTasks = localStorage.getItem('crm_tasks_list');
    const storedActs = localStorage.getItem('crm_activities_list');

    if (storedTasks && storedTasks !== '[]') {
      this.tasksList = JSON.parse(storedTasks);
    } else {
      this.tasksList = [
        { id: 1, title: "Follow up with Ahmed Al Mansoori on bulk order", relatedTo: "LD-0001", dueDate: "2026-06-25", priority: "High", assignedTo: "Ali Akbar", status: "Pending", notes: "Confirm quantity and pricing." },
        { id: 2, title: "Send proposal to Falasi Construction", relatedTo: "OPP-003", dueDate: "2026-07-02", priority: "Medium", assignedTo: "Sara Ahmed", status: "In Progress", notes: "" },
        { id: 3, title: "Schedule meeting with Qasimi Hospitality", relatedTo: "LD-0006", dueDate: "2026-07-10", priority: "Low", assignedTo: "Omar Khalid", status: "Completed", notes: "Introductory session." }
      ];
    }

    if (storedActs && storedActs !== '[]') {
      this.activitiesList = JSON.parse(storedActs);
    } else {
      this.activitiesList = [
        { id: 1, type: "Call", date: "2026-06-20", relatedTo: "LD-0001", loggedBy: "Ali Akbar", description: "Called to introduce Sentinel corporate lineup. Requested follow-up catalog." },
        { id: 2, type: "Meeting", date: "2026-06-22", relatedTo: "OPP-001", loggedBy: "Sara Ahmed", description: "Met with Fatima at their studio. Walked through the structural layout proposal." },
        { id: 3, type: "Email", date: "2026-06-24", relatedTo: "LD-0003", loggedBy: "Omar Khalid", description: "Sent breakdown quotes sheet as discussed via WhatsApp logs." }
      ];
    }
    this.saveStateToStorage();
  }

  // --- TASKS METHODS ---
  openCreateTask() {
    this.editingTaskId = null;
    this.taskModalTitle = 'Create New Task';
    this.tForm = this.getEmptyTaskState();
    if (this.contextSnapshot.length > 0) {
      this.tForm.relatedTo = this.contextSnapshot[0].id;
    }
    this.isTaskModalOpen = true;
    if (this.taskForm) this.taskForm.resetForm(this.tForm);
  }

  openEditTask(task: TaskItem) {
    this.editingTaskId = task.id;
    this.taskModalTitle = 'Modify Task Parameters';
    this.tForm = { ...task };
    this.isTaskModalOpen = true;
  }

  saveTask() {
    if (!this.tForm.title.trim()) return;

    if (this.editingTaskId === null) {
      const nextId = this.tasksList.length > 0 ? Math.max(...this.tasksList.map(t => t.id)) + 1 : 1;
      this.tasksList.push({ ...this.tForm, id: nextId });
    } else {
      const idx = this.tasksList.findIndex(t => t.id === this.editingTaskId);
      if (idx !== -1) this.tasksList[idx] = { ...this.tForm, id: this.editingTaskId };
    }
    
    this.saveStateToStorage();
    this.isTaskModalOpen = false;
  }

  deleteTask(id: number) {
    if (confirm("Are you sure you want to delete this task record?")) {
      this.tasksList = this.tasksList.filter(t => t.id !== id);
      this.saveStateToStorage();
    }
  }

  // --- ACTIVITIES METHODS ---
  openLogActivity() {
    this.editingActivityId = null;
    this.activityModalTitle = 'Log Interaction Activity';
    this.aForm = this.getEmptyActivityState();
    if (this.contextSnapshot.length > 0) {
      this.aForm.relatedTo = this.contextSnapshot[0].id;
    }
    this.isActivityModalOpen = true;
    if (this.actForm) this.actForm.resetForm(this.aForm);
  }

  openEditActivity(act: ActivityItem) {
    this.editingActivityId = act.id;
    this.activityModalTitle = 'Edit Activity Logs';
    this.aForm = { ...act };
    this.isActivityModalOpen = true;
  }

  saveActivity() {
    if (!this.aForm.description.trim()) return;

    if (this.editingActivityId === null) {
      const nextId = this.activitiesList.length > 0 ? Math.max(...this.activitiesList.map(a => a.id)) + 1 : 1;
      this.activitiesList.push({ ...this.aForm, id: nextId });
    } else {
      const idx = this.activitiesList.findIndex(a => a.id === this.editingActivityId);
      if (idx !== -1) this.activitiesList[idx] = { ...this.aForm, id: this.editingActivityId };
    }

    this.saveStateToStorage();
    this.isActivityModalOpen = false;
  }

  deleteActivity(id: number) {
    if (confirm("Are you sure you want to permanently delete this logged record?")) {
      this.activitiesList = this.activitiesList.filter(a => a.id !== id);
      this.saveStateToStorage();
    }
  }

  // Context Display Resolution Mapping Expression
  getContextLabel(id: string): string {
    const match = this.contextSnapshot.find(c => c.id === id);
    return match ? `${match.id} - ${match.name.split(' (')[0]}` : id;
  }

  private getEmptyTaskState(): TaskItem {
    return {
      id: 0,
      title: '',
      relatedTo: '',
      dueDate: new Date().toISOString().substring(0, 10),
      priority: 'Medium',
      assignedTo: 'Ali Akbar',
      status: 'Pending',
      notes: ''
    };
  }

  private getEmptyActivityState(): ActivityItem {
    return {
      id: 0,
      type: 'Call',
      date: new Date().toISOString().substring(0, 10),
      relatedTo: '',
      loggedBy: 'Ali Akbar',
      description: ''
    };
  }

  logout() {
    this.router.navigate(['/']);
  }
}