import { ConfigService } from '@nestjs/config';
import { EmailService } from './email.service';

describe('EmailService activity alerts', () => {
  function createService(
    values: Record<string, string | undefined>,
    send = jest
      .fn()
      .mockResolvedValue({ data: { id: 'email-1' }, error: null }),
  ) {
    const config = {
      get: jest.fn((key: string) => values[key]),
    } as unknown as ConfigService;
    const service = new EmailService(config);
    (service as unknown as { resend: { emails: { send: jest.Mock } } }).resend =
      {
        emails: { send },
      };
    return { service, send };
  }

  it('does not call Resend when activity email is not configured', async () => {
    const { service, send } = createService({});

    await expect(
      service.sendActivityEmail(
        'candidate@example.test',
        'APPLICATION_MESSAGE',
        '/applications/app-1?tab=messages',
      ),
    ).resolves.toBe(false);
    expect(send).not.toHaveBeenCalled();
  });

  it('sends a generic account link without application or message content', async () => {
    const { service, send } = createService({
      RESEND_API_KEY: 'test-key',
      FRONTEND_URL: 'https://jobs.example.test',
      RESEND_FROM: 'JobSeeker <alerts@example.test>',
    });

    await expect(
      service.sendActivityEmail(
        'candidate@example.test',
        'APPLICATION_MESSAGE',
        '/applications/app-1?tab=messages',
      ),
    ).resolves.toBe(true);
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'candidate@example.test',
        subject: 'New application activity on JobSeeker',
        text: expect.stringContaining(
          'https://jobs.example.test/applications/app-1?tab=messages',
        ),
      }),
    );
    const payload = send.mock.calls[0][0] as unknown as {
      text: string;
      html: string;
    };
    expect(payload.text).not.toContain('message body');
    expect(payload.html).toContain('does not include application details');
  });

  it('treats mail provider failures as best-effort rather than failing the saved activity', async () => {
    const { service } = createService(
      { RESEND_API_KEY: 'test-key' },
      jest.fn().mockRejectedValue(new Error('provider unavailable')),
    );

    await expect(
      service.sendActivityEmail(
        'company@example.test',
        'APPLICATION_RECEIVED',
        '/company/applications/app-1',
      ),
    ).resolves.toBe(false);
  });
});
