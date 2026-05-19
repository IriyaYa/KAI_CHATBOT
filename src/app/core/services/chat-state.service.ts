import { Injectable, inject, signal, computed } from '@angular/core';
import { ChatApiService } from './chat-api.service';
import { Message, ChatSession } from '../models/chat.models';

@Injectable({ providedIn: 'root' })
export class ChatStateService {
  private readonly api = inject(ChatApiService);

  readonly sessions       = signal<ChatSession[]>([]);
  readonly activeSessionId = signal<string | null>(null);
  readonly isLoading      = signal(false);
  readonly error          = signal<string | null>(null);

  readonly activeSession = computed(() =>
    this.sessions().find(s => s.id === this.activeSessionId()) ?? null
  );
  readonly messages = computed(() => this.activeSession()?.messages ?? []);

  createSession(): void {
    const id = crypto.randomUUID();
    this.sessions.update(s => [{
      id, title: 'Новый диалог',
      createdAt: new Date(), updatedAt: new Date(), messages: [],
    }, ...s]);
    this.activeSessionId.set(id);
    this.error.set(null);
  }

  selectSession(id: string): void {
    this.activeSessionId.set(id);
    this.error.set(null);
  }

  deleteSession(id: string): void {
    this.sessions.update(s => s.filter(x => x.id !== id));
    if (this.activeSessionId() === id) {
      this.activeSessionId.set(this.sessions()[0]?.id ?? null);
    }
  }

  sendMessage(text: string): void {
    if (!text.trim() || this.isLoading()) return;
    if (!this.activeSessionId()) this.createSession();

    const sessionId = this.activeSessionId()!;
    const userMsg: Message = {
      id: crypto.randomUUID(), role: 'user',
      content: text.trim(), timestamp: new Date(), status: 'sending',
    };
    this.addMessage(sessionId, userMsg);
    this.updateSessionTitle(sessionId, text.trim());
    this.isLoading.set(true);
    this.error.set(null);

    this.api.ask(text.trim()).subscribe({
      next: (res) => {
        this.updateMessageStatus(sessionId, userMsg.id, 'sent');
        this.addMessage(sessionId, {
          // используем messageID от бэкенда как id
          id:        res.messageID,
          role:      'bot',
          content:   res.content,
          timestamp: new Date(res.timestamp),
          rating:    null,
        });
        this.isLoading.set(false);
      },
      error: (err: Error) => {
        this.updateMessageStatus(sessionId, userMsg.id, 'error');
        this.error.set(err.message ?? 'Не удалось получить ответ. Проверьте соединение.');
        this.isLoading.set(false);
      },
    });
  }

  rateMessage(messageId: string, rating: 'good' | 'bad'): void {
    const session = this.activeSession();
    if (!session) return;
    const msg = session.messages.find(m => m.id === messageId);
    if (!msg || msg.role !== 'bot') return;

    const idx = session.messages.indexOf(msg);
    const question = idx > 0 ? session.messages[idx - 1].content : '';

    this.sessions.update(sessions => sessions.map(s => {
      if (s.id !== session.id) return s;
      return { ...s, messages: s.messages.map(m =>
        m.id === messageId ? { ...m, rating } : m
      )};
    }));

    this.api.submitRating({ question, answer: msg.content, rating }).subscribe();
  }

  private addMessage(sessionId: string, message: Message): void {
    this.sessions.update(sessions => sessions.map(s => {
      if (s.id !== sessionId) return s;
      return { ...s, messages: [...s.messages, message], updatedAt: new Date() };
    }));
  }

  private updateMessageStatus(sessionId: string, msgId: string, status: Message['status']): void {
    this.sessions.update(sessions => sessions.map(s => {
      if (s.id !== sessionId) return s;
      return { ...s, messages: s.messages.map(m =>
        m.id === msgId ? { ...m, status } : m
      )};
    }));
  }

  private updateSessionTitle(sessionId: string, text: string): void {
    this.sessions.update(sessions => sessions.map(s => {
      if (s.id !== sessionId || s.messages.length > 0) return s;
      return { ...s, title: text.length > 40 ? text.slice(0, 40) + '...' : text };
    }));
  }
}
