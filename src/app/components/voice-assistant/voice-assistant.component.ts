import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';

// Poprawne ścieżki do importów
import { DialogueService } from '../../services/dialogue.service';
import { DialogueRequest } from '../../models/dialogue.model';

// Deklarujemy 'webkitSpeechRecognition' na poziomie globalnym
declare var webkitSpeechRecognition: any;

@Component({
  selector: 'app-voice-assistant',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './voice-assistant.component.html',
  styleUrls: ['./voice-assistant.component.css']
})
export class VoiceAssistantComponent {
  status: string = 'Naciśnij przycisk i rozpocznij głosowanie';
  isListening: boolean = false;
  recognizedText: string = '';
  recognition: any;

  // Wstrzykujemy zarówno ChangeDetectorRef, jak i nasz DialogueService
  constructor(private cdr: ChangeDetectorRef, private dialogueService: DialogueService) {
    if ('webkitSpeechRecognition' in window) {
      this.recognition = new webkitSpeechRecognition();
      this.setupRecognition();
    }
  }

  // Konfiguracja silnika rozpoznawania mowy
  setupRecognition(): void {
    this.recognition.continuous = false;
    this.recognition.interimResults = false;
    this.recognition.lang = 'pl-PL';

    // Event handler: co się dzieje, gdy mowa zostanie pomyślnie rozpoznana
    this.recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      this.recognizedText = transcript;
      this.status = 'Przetwarzanie odpowiedzi...';
      this.cdr.detectChanges();

      const request: DialogueRequest = { text: transcript };
      this.dialogueService.sendMessage(request).subscribe({
        next: (response) => {
          console.log('Otrzymano odpowiedź z API:', response);
          this.status = response.displayText;
          
          // --- POPRAWIONA LINIA ---
          // Tworzymy pełny URL, dodając adres serwera backendu
          const audio = new Audio(`http://127.0.0.1:5000${response.audioUrl}`);
          audio.play();
          
          this.isListening = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Błąd komunikacji z API:', err);
          this.status = 'Błąd połączenia z serwerem. Sprawdź konsolę.';
          this.isListening = false;
          this.cdr.detectChanges();
        }
      });
    };

    // Event handler: co się dzieje, gdy wystąpi błąd
    this.recognition.onerror = (event: any) => {
      console.error('Błąd rozpoznawania mowy:', event.error);
      if (event.error === 'no-speech') {
        this.status = 'Nie usłyszałem. Spróbuj ponownie.';
      } else {
        this.status = 'Wystąpił błąd rozpoznawania. Spróbuj ponownie.';
      }
      this.isListening = false;
      this.cdr.detectChanges();
    };

    // Event handler: co się dzieje, gdy nasłuchiwanie się zakończy
    this.recognition.onend = () => {
      if (this.isListening) {
        this.isListening = false;
        this.status = 'Naciśnij, aby mówić.';
        this.cdr.detectChanges();
      }
    };
  }

  // Funkcja wywoływana po kliknięciu przycisku
  startListening(): void {
    if (!this.recognition) {
        this.status = 'Twoja przeglądarka nie wspiera rozpoznawania mowy.';
        return;
    }
    this.isListening = true;
    this.status = 'Słucham...';
    this.recognizedText = '';
    this.recognition.start();
  }
}