import { Component, OnInit, OnDestroy } from '@angular/core';
import * as ClassicEditorImport from '@ckeditor/ckeditor5-build-classic';
import { WebsocketService } from '../../services/websocket.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-editor',
  templateUrl: './editor.component.html',
  styleUrls: ['./editor.component.css']
})
export class EditorComponent implements OnInit, OnDestroy {
  activeUsers: string[] = [];

  public Editor: any = ClassicEditorImport;
  public content = '<p>Start typing...</p>';

  username = '';
  private wsSubscription!: Subscription;
  private isUpdatingFromServer = false;

  private lastTypingSent = 0;

  currentTypingUser = '';
  typingTimeout: any;
  private typingSent = false;

  constructor(private wsService: WebsocketService) { }

  ngOnInit(): void {
    this.username = prompt('Enter your username')?.trim() || 'Anonymous';

    this.wsService.connect('ws://localhost:8080/ws/document');

    this.wsSubscription = this.wsService.onMessage().subscribe(message => {
      if (message.startsWith('users:')) {
        this.activeUsers = message.substring(6).split(',').filter(u => u);
        return;
      }

      if (message.startsWith('typing:')) {
        const typingUser = message.substring('typing:'.length);
        if (typingUser !== this.username) {
          this.showTypingIndicator(typingUser);
        }
        return;
      }

      this.isUpdatingFromServer = true;
      this.content = message;
      this.isUpdatingFromServer = false;
    });

    setTimeout(() => {
      this.wsService.sendMessage(`username:${this.username}`);
    }, 500);
  }

  onChange({ editor }: any): void {
    if (this.isUpdatingFromServer) {
      return;
    }
    const data = editor.getData();
    this.wsService.sendMessage(data);
    this.sendTypingNotification();
    console.log('Sent message:', data);
  }

  sendTypingNotification(): void {
    if (!this.username) return;

    if (!this.typingSent) {
      this.wsService.sendMessage('typing');
      this.typingSent = true;
    }

    // Clear previous timeout if any
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
    }

    // Reset typingSent after 2 seconds of inactivity
    this.typingTimeout = setTimeout(() => {
      this.typingSent = false;
    }, 2000);
  }

  showTypingIndicator(user: string) {
    this.currentTypingUser = user;

    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
    }

    this.typingTimeout = setTimeout(() => {
      this.currentTypingUser = '';
    }, 3000);
  }

  ngOnDestroy(): void {
    this.wsSubscription.unsubscribe();
  }
}