import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http'; // <-- KROK 1: Importuj HttpClient
import { Observable } from 'rxjs';
import { DialogueRequest, DialogueResponse } from '../models/dialogue.model';


@Injectable({
  providedIn: 'root'
})
export class DialogueService {

  // Definiujemy URL do Twojego API
  private apiUrl = 'http://127.0.0.1:5000/api/dialog';

  // KROK 2: Wstrzykujemy HttpClient do konstruktora
  constructor(private http: HttpClient) { }

  // KROK 3: Zastępujemy logikę zaślepki prawdziwym zapytaniem HTTP
  sendMessage(request: DialogueRequest): Observable<DialogueResponse> {
    console.log('Wysyłam do prawdziwego API:', request);
    return this.http.post<DialogueResponse>(this.apiUrl, request);
  }
}