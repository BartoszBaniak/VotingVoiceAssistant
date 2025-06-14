import { Component, ChangeDetectorRef, ViewChild, ElementRef, OnDestroy, NgZone, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogueService } from '../../services/dialogue.service';
import { DialogueRequest, DialogueResponse } from '../../models/dialogue.model';
import * as faceapi from 'face-api.js';

declare var webkitSpeechRecognition: any;

interface ChatMessage {
  sender: 'user' | 'assistant';
  text: string;
}

@Component({
  selector: 'app-voice-assistant',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './voice-assistant.component.html',
  styleUrls: ['./voice-assistant.component.css']
})
export class VoiceAssistantComponent implements OnInit, OnDestroy {
  @ViewChild('videoElement') videoElement?: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasElement') canvasElement?: ElementRef<HTMLCanvasElement>;
  @ViewChild('chatContainer') private chatContainer?: ElementRef;

  faceScanned: boolean = false;
  isScanningFace: boolean = false;
  cameraStarted: boolean = false;
  status: string = 'Inicjalizacja...';
  isListening: boolean = false;
  recognition: any;
  finalScreen: boolean = false;
  
  conversationHistory: ChatMessage[] = [];
  candidates: string[] = [];

  modelsLoaded: boolean = false;
  private detectionInterval: any;
  private stream?: MediaStream;
  private currentAudio: HTMLAudioElement | null = null;
  
  constructor(private cdr: ChangeDetectorRef, private dialogueService: DialogueService, private zone: NgZone) {
    if ('webkitSpeechRecognition' in window) {
      this.recognition = new webkitSpeechRecognition();
      this.setupRecognition();
    } else {
      this.status = 'Twoja przeglądarka nie wspiera rozpoznawania mowy.';
    }
  }

  ngOnInit() {
    this.status = "Przygotowywanie asystenta... Proszę czekać.";
    this.loadModels();
  }

  private async loadModels() {
    try {
      const MODEL_URL = '/assets/models'; 
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
      ]);
      this.modelsLoaded = true;
      this.status = 'Kliknij przycisk, aby rozpocząć.';
      this.cdr.detectChanges();
    } catch (e) {
      console.error("Błąd ładowania modeli face-api.js", e);
      this.status = "Błąd krytyczny: Nie można załadować plików modeli AI.";
      this.cdr.detectChanges();
    }
  }

  async startCamera(): Promise<void> {
    if (this.cameraStarted) return;
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (this.videoElement) {
        this.videoElement.nativeElement.srcObject = this.stream;
        this.cameraStarted = true;
      }
    } catch (err) {
      this.status = 'Nie można uzyskać dostępu do kamery. Sprawdź pozwolenia.';
      this.isScanningFace = false;
    }
  }

  stopCamera(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
    }
    this.cameraStarted = false;
  }

  async scanFace(): Promise<void> {
    if (!this.modelsLoaded || this.isScanningFace) return;
    this.isScanningFace = true;
    this.status = 'Uruchamianie kamery...';
    await this.startCamera();
    
    this.videoElement?.nativeElement.addEventListener('play', () => {
      this.status = 'Patrz w kamerę. Szukam twarzy...';
      this.cdr.detectChanges();
      
      this.detectionInterval = setInterval(async () => {
        if (!this.videoElement || !this.videoElement.nativeElement) return;
        const detections = await faceapi.detectAllFaces(this.videoElement.nativeElement, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks();
        if (this.canvasElement && this.videoElement) {
            const video = this.videoElement.nativeElement;
            const canvas = this.canvasElement.nativeElement;
            const displaySize = { width: video.videoWidth, height: video.videoHeight };
            faceapi.matchDimensions(canvas, displaySize);
            const resizedDetections = faceapi.resizeResults(detections, displaySize);
            const context = canvas.getContext('2d');
            context?.clearRect(0, 0, canvas.width, canvas.height);
            faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);
        }
        
        if (detections.length > 0) {
          clearInterval(this.detectionInterval);
          this.cdr.detectChanges();
          setTimeout(() => {
              if (!this.isScanningFace) return;
              this.faceScanned = true;
              this.isScanningFace = false;
              this.stopCamera();
              this.startConversation();
          }, 500);
        }
      }, 50);
    });
  }

  private startConversation(): void {
    this.status = 'Asystent uruchamia się...';
    this.cdr.detectChanges();
    const request: DialogueRequest = { text: '__START_CONVERSATION__' };
    this.dialogueService.sendMessage(request).subscribe({
        next: (response) => this.handleAssistantResponse(response),
        error: (err) => {
            console.error("Błąd inicjalizacji dialogu:", err);
            this.status = 'Nie udało się rozpocząć rozmowy. Sprawdź konsolę.';
        }
    });
  }

  private handleAssistantResponse(response: DialogueResponse): void {
    this.zone.run(() => {
        this.addMessageToHistory('assistant', response.displayText);
        console.log(response.displayText)

        if (response.payload && Array.isArray(response.payload)) {
          this.candidates = response.payload;
        }

        if (response.payload?.status === 'finished') {
          console.log(response)
          this.currentAudio = new Audio(`http://127.0.0.1:5000${response.audioUrl}`);
          this.currentAudio.onended = () => this.zone.run(() => {this.finalScreen = true; this.isListening = false; this.recognition.stop();});
          this.currentAudio.play().catch(e => console.error("Błąd odtwarzania audio:", e));
        } else {
          this.currentAudio = new Audio(`http://127.0.0.1:5000${response.audioUrl}`);
          this.currentAudio.onended = () => this.zone.run(() => this.startListening());
          this.currentAudio.play().catch(e => console.error("Błąd odtwarzania audio:", e));
        }
    });
  }

  setupRecognition(): void {
    const recognition = new webkitSpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'pl-PL';

    recognition.onresult = (event: any) => { 
        const transcript = event.results[0][0].transcript;
        this.zone.run(() => {
            this.addMessageToHistory('user', transcript);
            this.status = 'Przetwarzanie odpowiedzi...';
            this.isListening = false;
            const request: DialogueRequest = { text: transcript };
            this.dialogueService.sendMessage(request).subscribe({
              next: (response) => this.handleAssistantResponse(response),
              error: (err) => {
                  console.error("Błąd API:", err);
                  this.status = 'Błąd połączenia z serwerem. Sprawdź konsolę.';
              }
            });
        });
     };

    recognition.onerror = (event: any) => { 
        this.zone.run(() => {
            console.error('Błąd rozpoznawania mowy:', event);
            if (event.error === 'no-speech') {
              this.status = 'Nie wykryto mowy. Spróbuj ponownie.';
              setTimeout(() => this.startListening(), 2000);
            } else {
              this.status = 'Wystąpił błąd rozpoznawania mowy.';
            }
            this.isListening = false;
        });
    };
    
    recognition.onend = () => {
      this.zone.run(() => {
        if (this.isListening) {
          this.cdr.detectChanges();
          setTimeout(() => this.startListening(), 200);
        }
      }); 
    };

    this.recognition = recognition;
  }

  startListening(): void { 
      if (this.isListening) return;
      this.isListening = true;
      this.status = 'Słucham...';
      this.cdr.detectChanges();
      this.recognition.start();
  }

  private addMessageToHistory(sender: 'user' | 'assistant', text: string): void {
    this.conversationHistory.push({ sender, text });
    this.status = sender === 'assistant' ? 'Asystent mówi...' : 'Czekam na Twoją odpowiedź...';
    this.cdr.detectChanges();
    this.scrollToBottom();
  }

  private scrollToBottom(): void {
    try {
        if (this.chatContainer) {
            this.chatContainer.nativeElement.scrollTop = this.chatContainer.nativeElement.scrollHeight;
        }
    } catch (err) {
        console.error("Nie udało się przewinąć czatu:", err);
    }
  }

  restartApp(): void {
    window.location.reload();
  }
  
  ngOnDestroy(): void {
    clearInterval(this.detectionInterval);
    this.stopCamera();
    if (this.recognition) { this.recognition.stop(); }
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio = null;
    }
  }
}
