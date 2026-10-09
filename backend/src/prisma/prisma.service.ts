import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { condominiumFilter, condominiumMiddleware } from './condominium.middleware';
import { systemScope } from '../common/condominium-context';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super();
    this.$use(
      condominiumMiddleware(async (model, id, condominiumId) => {
        const where = { id, ...condominiumFilter(model, condominiumId) };
        return systemScope(async () => {
          switch (model) {
            case 'User':
              return !!(await this.user.findFirst({ where }));
            case 'Announcement':
              return !!(await this.announcement.findFirst({ where }));
            case 'Visitor':
              return !!(await this.visitor.findFirst({ where }));
            case 'Ticket':
              return !!(await this.ticket.findFirst({ where }));
            case 'Provider':
              return !!(await this.provider.findFirst({ where }));
            case 'CommonArea':
              return !!(await this.commonArea.findFirst({ where }));
            case 'Poll':
              return !!(await this.poll.findFirst({ where }));
            case 'PollOption':
              return !!(await this.pollOption.findFirst({ where }));
            case 'ExpenseCategory':
              return !!(await this.expenseCategory.findFirst({ where }));
            default:
              return false;
          }
        });
      }),
    );
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
