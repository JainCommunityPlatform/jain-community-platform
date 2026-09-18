import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
  it('connects when the Nest module initializes', async () => {
    const service = new PrismaService();
    const connect = jest
      .spyOn(service, '$connect')
      .mockResolvedValue(undefined);

    await service.onModuleInit();

    expect(connect).toHaveBeenCalledTimes(1);
    await service.$disconnect();
  });

  it('disconnects when the Nest module is destroyed', async () => {
    const service = new PrismaService();
    const disconnect = jest
      .spyOn(service, '$disconnect')
      .mockResolvedValue(undefined);

    await service.onModuleDestroy();

    expect(disconnect).toHaveBeenCalledTimes(1);
  });
});
