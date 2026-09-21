import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterModule, CommonModule],
  templateUrl: './app.html',
  styleUrls: [] 
})
export class App implements OnInit {
  showSidebar = true;
  isCollapsed = false;

  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit() {
    const savedState = localStorage.getItem('sidebar_collapsed');
    if (savedState !== null) {
      this.isCollapsed = savedState === 'true';
    }

    this.checkRouteState(this.router.url);

    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.checkRouteState(event.urlAfterRedirects || event.url);
    });
  }

  toggleSidebar(): void {
    this.isCollapsed = !this.isCollapsed;
    localStorage.setItem('sidebar_collapsed', String(this.isCollapsed));
  }

  private checkRouteState(url: string) {
    if (!url || url === '/' || url.includes('/login')) {
      this.showSidebar = false;
    } else {
      this.showSidebar = true;
    }
  }

  logout(): void {
    console.log('De-authenticating executive session data profile...');
    
    // Clean Session Removal using AuthService
    this.authService.logout();
    localStorage.removeItem('sidebar_collapsed');
    
    this.router.navigate(['/login']).then(() => {
      this.showSidebar = false;
      this.isCollapsed = false;
    }).catch(err => {
      console.error('Fatal core router tracking deflection error:', err);
    });
  }
}