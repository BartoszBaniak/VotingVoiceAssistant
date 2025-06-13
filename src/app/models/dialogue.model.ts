/**
 * Definiuje strukturę obiektu wysyłanego z frontendu (Angular) 
 * do backendu (API w Pythonie).
 */
export interface DialogueRequest {
  text: string;
}

/**
 * Definiuje strukturę obiektu, jakiej frontend (Angular)
 * spodziewa się w odpowiedzi od backendu (API w Pythonie).
 */
export interface DialogueResponse {
  displayText: string;
  audioUrl: string;
}
