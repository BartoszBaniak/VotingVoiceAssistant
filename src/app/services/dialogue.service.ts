import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http'; // <-- KROK 1: Importuj HttpClient
import { Observable } from 'rxjs';
import { DialogueRequest, DialogueResponse } from '../models/dialogue.model';


@Injectable({
  providedIn: 'root'
})
export class DialogueService {

  private apiUrl = 'http://127.0.0.1:5000/api/dialog';

  constructor(private http: HttpClient) { }

  sendMessage(request: DialogueRequest): Observable<DialogueResponse> {
    console.log('Wysyłam do prawdziwego API:', request);
    return this.http.post<DialogueResponse>(this.apiUrl, request);
  }
}