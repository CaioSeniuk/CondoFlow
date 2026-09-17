export class NotificationManager {
  private static instance: NotificationManager;

  private notifications: string[] = [];

  // Impede que outras classes criem novas instâncias
  private constructor() {
    console.log('[Singleton] Gerenciador de Notificações criado');
  }

  // Retorna sempre a mesma instância
  public static getInstance(): NotificationManager {
    if (!NotificationManager.instance) {
      NotificationManager.instance = new NotificationManager();
    }

    return NotificationManager.instance;
  }

  // Envia e armazena uma notificação
  public enviarNotificacao(mensagem: string): void {
    this.notifications.push(mensagem);

    console.log(`[Notificação] ${mensagem}`);
  }

  // Retorna o histórico de notificações
  public listarNotificacoes(): string[] {
    return this.notifications;
  }
}