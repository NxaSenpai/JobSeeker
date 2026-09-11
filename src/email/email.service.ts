import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend: Resend;

  constructor(private readonly configService: ConfigService) {
    this.resend = new Resend(this.configService.get<string>('RESEND_API_KEY'));
  }

  async sendVerificationEmail(email: string, token: string, name = 'there') {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');

    if (!apiKey) {
      throw new ServiceUnavailableException(
        'Email delivery is not configured.',
      );
    }

    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') ?? 'http://localhost:5173';
    const verificationUrl = new URL('/verify-email', frontendUrl);
    verificationUrl.searchParams.set('token', token);
    const verificationUrlValue = verificationUrl.toString();

    const from =
      this.configService.get<string>('RESEND_FROM')?.trim() ??
      'JobSeeker <jobs@send.nakry-tang.me>';
    const templateId = this.configService
      .get<string>('RESEND_TEMPLATE_ID')
      ?.trim();

    const emailPayload = templateId
      ? {
          from,
          to: email,
          subject: 'Verify your JobSeeker account',
          template: {
            id: templateId,
            variables: {
              name,
              verificationUrl: verificationUrlValue,
              expiresIn: 60,
            },
          },
        }
      : {
          from,
          to: email,
          subject: 'Verify your JobSeeker account',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 30px; color: #171717;">
              <h2>Welcome to JobSeeker</h2>
              <p>Thank you for creating your account.</p>
              <p>Please verify your email address to activate your account.</p>
              <a href="${verificationUrlValue}" style="display: inline-block; padding: 12px 20px; background: #171717; color: white; text-decoration: none; border-radius: 8px;">Verify email</a>
              <p style="margin-top: 24px; color: #666;">This verification link expires in 1 hour.</p>
            </div>
          `,
          text: `Welcome to JobSeeker. Verify your email: ${verificationUrlValue}. This link expires in 1 hour.`,
        };

    try {
      const { error, data } = await this.resend.emails.send(emailPayload);

      if (error) {
        this.logger.error(
          `Resend rejected verification email: ${error.name} - ${error.message}`,
        );
        throw new ServiceUnavailableException(
          'Verification email could not be sent.',
        );
      }

      return data;
    } catch (error) {
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }

      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Resend request failed: ${message}`);
      throw new ServiceUnavailableException(
        'Verification email could not be sent.',
      );
    }
  }
}
