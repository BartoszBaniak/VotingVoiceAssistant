import { Component } from '@angular/core';
import { VoiceAssistantComponent } from './components/voice-assistant/voice-assistant.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [VoiceAssistantComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'VotingVoiceAssistant';
}
