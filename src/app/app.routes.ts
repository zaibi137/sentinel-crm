import { Routes } from '@angular/router';
import { LoginComponent } from './login/login'; // Aapka login component jo outside pages folder hai
import { Dashboard } from './pages/dashboard/dashboard';
import { Leads } from './pages/leads/leads';
import { CustomersComponent } from './pages/customers/customers';
import { Opportunities } from './pages/opportunities/opportunities';
import { Agents } from './pages/agents/agents';
import { Activities } from './pages/activities/activities';
import { Users } from './pages/users/users';

export const routes: Routes = [
  // 1. Jab website bilkul pehli baar open ho, toh user ko direct login screen par bhejo
  { path: '', redirectTo: 'login', pathMatch: 'full' }, 

  // 2. Login page ka valid standalone route registry
  { path: 'login', component: LoginComponent },

  // 3. Saare internal dashboard management dynamic pages ke links
  { path: 'dashboard', component: Dashboard },
  { path: 'leads', component: Leads },
  { path: 'customers', component: CustomersComponent },
  { path: 'opportunities', component: Opportunities },
  { path: 'agents', component: Agents },
  { path: 'activities', component: Activities },
  { path: 'users', component: Users },

  // 4. Wildcard Catch-all: Agar koi random ya galat URL type kare, toh crash hone ke bajaye direct login par phenk do
  { path: '**', redirectTo: 'login' }
];