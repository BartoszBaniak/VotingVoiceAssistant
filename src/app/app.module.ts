import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { routes } from './app.routes';
import { DialogueRequest } from './models/dialogue.model';
import { DialogueResponse } from './models/dialogue.model';
import { AppComponent } from './app.component';

import { VoiceAssistantComponent } from './components/voice-assistant/voice-assistant.component';

@NgModule({
  declarations: [
  ],
  imports: [
    BrowserModule,
    routes
  ],
  providers: [],
})
export class AppModule { }