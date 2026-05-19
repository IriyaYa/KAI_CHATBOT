import { Component, inject, computed } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { filter, map } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from './shared/components/header/header.component';
import { FooterComponent } from './shared/components/footer/footer.component';
import { SidebarComponent } from './shared/components/sidebar/sidebar.component';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule, HeaderComponent, FooterComponent, SidebarComponent],
  template: `
    @if (showShell()) {
      <div class="app-shell">
        <app-header [userName]="userName()" (logout)="onLogout()" />
        <div class="app-body">
          <app-sidebar />
          <main class="app-main"><router-outlet /></main>
        </div>
        <app-footer />
      </div>
    } @else {
      <router-outlet />
    }
  `,
  styles: [`
    .app-shell { height: 100vh; display: flex; flex-direction: column; overflow: hidden; }
    .app-body { flex: 1; display: flex; overflow: hidden; }
    .app-main { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
  `],
})
export class AppComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      map(e => (e as NavigationEnd).urlAfterRedirects)
    ),
    { initialValue: this.router.url }
  );

  readonly showShell = computed(() => !this.currentUrl().startsWith('/login'));
  readonly userName = computed(() => this.auth.user()?.fullName ?? '');

  onLogout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
