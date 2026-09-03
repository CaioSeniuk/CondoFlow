import { Visitor } from '@prisma/client';
import { Handler } from '../common/handler';
import { VisitorNotFoundError, VisitorTokenInvalidError } from './visitors.errors';

export interface TokenValidationRequest {
  visitor: Visitor | null;
  now: Date;
}

export function isWithinValidityWindow(visitor: Visitor, now: Date): boolean {
  return visitor.validFrom <= now && now <= visitor.validUntil;
}

export abstract class TokenValidationHandler extends Handler<TokenValidationRequest, void> {}

export class VisitorExistsHandler extends TokenValidationHandler {
  handle(request: TokenValidationRequest): void {
    if (!request.visitor) throw new VisitorNotFoundError();
    return super.handle(request);
  }
}

export class TokenWithinValidityWindowHandler extends TokenValidationHandler {
  handle(request: TokenValidationRequest): void {
    if (!isWithinValidityWindow(request.visitor as Visitor, request.now)) {
      throw new VisitorTokenInvalidError();
    }
    return super.handle(request);
  }
}

export function buildTokenValidationChain(): TokenValidationHandler {
  const exists = new VisitorExistsHandler();
  const withinWindow = new TokenWithinValidityWindowHandler();
  exists.setNext(withinWindow);
  return exists;
}
