import { Component, inject, ViewChild, ElementRef, AfterViewChecked, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatStateService } from '@core/services/chat-state.service';
import { MessageBubbleComponent } from '../message-bubble/message-bubble.component';
import { TypingIndicatorComponent } from '../typing-indicator/typing-indicator.component';
import { QuickActionsComponent } from '../quick-actions/quick-actions.component';
import { MessageInputComponent } from '../message-input/message-input.component';

@Component({
  selector: 'app-chat-window',
  standalone: true,
  imports: [CommonModule, MessageBubbleComponent, TypingIndicatorComponent, QuickActionsComponent, MessageInputComponent],
  templateUrl: './chat-window.component.html',
  styleUrls: ['./chat-window.component.scss'],
})
export class ChatWindowComponent implements AfterViewChecked {
  readonly chatState = inject(ChatStateService);
  @ViewChild('messagesEnd') private messagesEnd!: ElementRef<HTMLDivElement>;
  private shouldScroll = false;

  constructor() {
    effect(() => { const _ = this.chatState.messages(); this.shouldScroll = true; });
  }

  ngAfterViewChecked(): void {
    if (this.shouldScroll) { this.scrollToBottom(); this.shouldScroll = false; }
  }

  onSend(text: string): void { this.chatState.sendMessage(text); }
  onQuickAction(text: string): void { this.chatState.sendMessage(text); }
  onRating(messageId: string, rating: 'good' | 'bad'): void {
    this.chatState.rateMessage(messageId, rating);
  }

  private scrollToBottom(): void {
    this.messagesEnd?.nativeElement.scrollIntoView({ behavior: 'smooth' });
  }
}
