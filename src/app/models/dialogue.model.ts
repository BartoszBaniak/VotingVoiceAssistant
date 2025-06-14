export interface DialogueRequest {
  text: string;
}

export interface DialogueResponse {
  displayText: string;
  audioUrl: string;
  payload?: any;
}
