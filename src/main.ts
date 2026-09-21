import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config'; // Ensure this path is correct
import { App } from './app/app';

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));