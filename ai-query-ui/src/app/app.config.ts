import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';

export const appConfig: ApplicationConfig = {
  providers: [provideRouter(routes), provideFirebaseApp(() => initializeApp({"projectId":"ai-integration-ui","appId":"1:218584238724:web:bfd870268cbb4a4adad0d1","storageBucket":"ai-integration-ui.firebasestorage.app","apiKey":"AIzaSyBzFZOzPggQH4uea7lNjDw7glHWUcC3fDk","authDomain":"ai-integration-ui.firebaseapp.com","messagingSenderId":"218584238724","measurementId":"G-RJP3NHCXJG"})), provideFirestore(() => getFirestore())]
};
