import { ValidationPipe } from '@nestjs/common';
import { LinkContactDto } from './link-contact.dto';

describe('LinkContactDto', () => {
  const pipe = new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
  });

  it('accepts the contact value used by the mobile-link endpoint', async () => {
    await expect(
      pipe.transform({ value: '9876543210' }, {
        type: 'body',
        metatype: LinkContactDto,
      }),
    ).resolves.toEqual({ value: '9876543210' });
  });

  it('rejects unexpected request properties', async () => {
    await expect(
      pipe.transform({ value: '9876543210', phone: '9876543210' }, {
        type: 'body',
        metatype: LinkContactDto,
      }),
    ).rejects.toThrow();
  });
});
