export class ReservationManager {
  private static instance: ReservationManager;

  // Construtor privado impede a criação de novas instâncias
  private constructor() {
    console.log('[Singleton] Gerenciador de Reservas criado');
  }

  // Retorna sempre a mesma instância
  public static getInstance(): ReservationManager {
    if (!ReservationManager.instance) {
      ReservationManager.instance = new ReservationManager();
    }

    return ReservationManager.instance;
  }

  // Registra a criação de uma reserva
  public registrarReserva(commonAreaId: bigint): void {
    console.log(
      `[Singleton] Reserva registrada para a área ${commonAreaId}`,
    );
  }

  // Registra o cancelamento de uma reserva
  public cancelarReserva(reservationId: bigint): void {
    console.log(
      `[Singleton] Reserva ${reservationId} cancelada`,
    );
  }
}