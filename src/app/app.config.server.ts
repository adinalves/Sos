import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
import { provideServerRendering, withRoutes } from '@angular/ssr';
import { provideHttpClient, withFetch, withNoXsrfProtection } from '@angular/common/http';
import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(withRoutes(serverRoutes)),
    // Provide HttpClient for server-side rendering
    provideHttpClient(withFetch(), withNoXsrfProtection())
  ]
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
