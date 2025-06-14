import { Component, ChangeDetectorRef, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogueService } from '../../services/dialogue.service';
import { DialogueRequest } from '../../models/dialogue.model';

declare var webkitSpeechRecognition: any;

@Component({
  selector: 'app-voice-assistant',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './voice-assistant.component.html',
  styleUrls: ['./voice-assistant.component.css']
})
export class VoiceAssistantComponent implements OnDestroy {
  // Referencja do elementu <video> z naszego pliku HTML
  @ViewChild('videoElement') videoElement?: ElementRef<HTMLVideoElement>;

  // --- ZMIENNE STANU ---
  faceScanned: boolean = false;
  isScanningFace: boolean = false;
  cameraStarted: boolean = false;
  status: string = 'Aby rozpocząć, zweryfikuj swoją tożsamość.';
  isListening: boolean = false;
  recognizedText: string = '';
  recognition: any;
  private stream?: MediaStream;

  constructor(private cdr: ChangeDetectorRef, private dialogueService: DialogueService) {
    if ('webkitSpeechRecognition' in window) {
      this.recognition = new webkitSpeechRecognition();
      this.setupRecognition();
    }
  }

  // --- NOWA LOGIKA KAMERY ---
  async startCamera(): Promise<void> {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        this.stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (this.videoElement && this.videoElement.nativeElement) {
          this.videoElement.nativeElement.srcObject = this.stream;
          this.cameraStarted = true;
          this.cdr.detectChanges();
        }
      } catch (err) {
        console.error("Błąd dostępu do kamery: ", err);
        this.status = 'Nie można uzyskać dostępu do kamery. Sprawdź pozwolenia.';
        this.isScanningFace = false;
        this.cdr.detectChanges();
      }
    } else {
      this.status = 'Twoja przeglądarka nie wspiera dostępu do kamery.';
    }
  }

  stopCamera(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
    }
    this.cameraStarted = false;
  }

  async scanFace(): Promise<void> {
    this.isScanningFace = true;
    this.status = 'Uruchamianie kamery...';
    await this.startCamera();

    // Sprawdzamy, czy kamera poprawnie się uruchomiła
    if (!this.cameraStarted) return; 

    this.status = 'Weryfikacja w toku... Proszę patrzeć w kamerę.';
    this.cdr.detectChanges();

    // Symulujemy proces weryfikacji trwający 10 sekund
    setTimeout(() => {
      this.stopCamera();
      this.faceScanned = true;
      this.isScanningFace = false;
      this.status = 'Weryfikacja pomyślna. Naciśnij przycisk, aby rozpocząć głosowanie.';
      this.cdr.detectChanges();
    }, 10000);
  }

  // --- LOGIKA ASYSTENTA GŁOSOWEGO (bez zmian) ---
  setupRecognition(): void {
    this.recognition.continuous = false;
    this.recognition.interimResults = false;
    this.recognition.lang = 'pl-PL';
    this.recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      this.recognizedText = transcript;
      this.status = 'Przetwarzanie odpowiedzi...';
      this.cdr.detectChanges();
      const request: DialogueRequest = { text: transcript };
      this.dialogueService.sendMessage(request).subscribe({
        next: (response) => {
          this.status = response.displayText;
          const audio = new Audio('http://127.0.0.1:5000${response.audioUrl}');
          audio.play();
          this.isListening = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.status = 'Błąd połączenia z serwerem. Sprawdź konsolę.';
          this.isListening = false;
          this.cdr.detectChanges();
        }
      });
    };
    this.recognition.onerror = (event: any) => {
      this.isListening = false;
      this.cdr.detectChanges();
    };
    this.recognition.onend = () => {
      if (this.isListening) {
        this.isListening = false;
        this.cdr.detectChanges();
      }
    };
  }
  startListening(): void {
    if (!this.recognition) return;
    this.isListening = true;
    this.status = 'Słucham...';
    this.recognizedText = '';
    this.recognition.start();
  }

  // --- CYKL ŻYCIA KOMPONENTU ---
  // Upewniamy się, że kamera zostanie wyłączona, gdy komponent jest niszczony
  ngOnDestroy(): void {
    this.stopCamera();
  }
}