/**
 * Handler abstrato do padrão Chain of Responsibility, reutilizado pelas 3 chains do
 * projeto (visitantes, chamados, comunicados). Cada handler concreto decide se resolve
 * o pedido ou delega para o próximo elo via `super.handle(request)`.
 */
export abstract class Handler<TRequest, TResult = void> {
  private next: Handler<TRequest, TResult> | null = null;

  setNext(handler: Handler<TRequest, TResult>): Handler<TRequest, TResult> {
    this.next = handler;
    return handler;
  }

  handle(request: TRequest): TResult | undefined {
    return this.next?.handle(request);
  }
}
