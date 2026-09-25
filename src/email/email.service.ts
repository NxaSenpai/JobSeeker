import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CreateEmailOptions, Resend } from 'resend';

export type ActivityEmailKind =
  | 'APPLICATION_RECEIVED'
  | 'APPLICATION_STATUS'
  | 'APPLICATION_WITHDRAWN'
  | 'INTERVIEW_SCHEDULED'
  | 'INTERVIEW_UPDATED'
  | 'INTERVIEW_CANCELLED'
  | 'APPLICATION_MESSAGE';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend: Resend | null;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    this.resend = apiKey ? new Resend(apiKey) : null;
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
      const { error, data } = await this.resend!.emails.send(emailPayload);

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

  async sendPasswordResetEmail(email: string, token: string, name = 'there') {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');

    if (!apiKey) {
      throw new ServiceUnavailableException(
        'Email delivery is not configured.',
      );
    }

    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') ?? 'http://localhost:5173';
    const resetUrl = new URL('/reset-password', frontendUrl);
    resetUrl.searchParams.set('token', token);
    const resetUrlValue = resetUrl.toString();

    const from =
      this.configService.get<string>('RESEND_FROM')?.trim() ??
      'JobSeeker <jobs@send.nakry-tang.me>';
    const templateId = this.configService
      .get<string>('RESEND_PASSWORD_RESET_TEMPLATE_ID')
      ?.trim();

    const emailPayload: CreateEmailOptions = templateId
      ? {
          from,
          to: email,
          subject: 'Reset your JobSeeker password',
          template: {
            id: templateId,
            variables: {
              name,
              resetUrl: resetUrlValue,
              expiresIn: 30,
            },
          },
        }
      : {
          from,
          to: email,
          subject: 'Reset your JobSeeker password',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 30px; color: #171717;">
              <h2>Reset your JobSeeker password</h2>
              <p>We received a request to create a new password for your account.</p>
              <a href="${resetUrlValue}" style="display: inline-block; padding: 12px 20px; background: #171717; color: white; text-decoration: none; border-radius: 8px;">Reset password</a>
              <p style="margin-top: 24px; color: #666;">This link expires in 30 minutes. If you did not request this, you can ignore this email.</p>
            </div>
          `,
          text: `Reset your JobSeeker password: ${resetUrlValue}. This link expires in 30 minutes. If you did not request this, you can ignore this email.`,
        };

    try {
      const { error, data } = await this.resend!.emails.send(emailPayload);

      if (error) {
        this.logger.error(
          `Resend rejected password reset email: ${error.name} - ${error.message}`,
        );
        throw new ServiceUnavailableException(
          'Password reset email could not be sent.',
        );
      }

      return data;
    } catch (error) {
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }

      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Resend password reset request failed: ${message}`);
      throw new ServiceUnavailableException(
        'Password reset email could not be sent.',
      );
    }
  }

  /**
   * Sends a privacy-preserving activity alert. These alerts are deliberately
   * best-effort: the underlying application/message/interview is committed
   * before this method is called, so a mail-provider outage must not make the
   * user retry a successful write and accidentally duplicate it.
   */
  async sendActivityEmail(
    email: string,
    kind: ActivityEmailKind,
    relativePath: string,
  ): Promise<boolean> {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    if (!apiKey || !this.resend) {
      this.logger.debug(
        `Skipping ${kind} alert because email is not configured.`,
      );
      return false;
    }

    const subjects: Record<ActivityEmailKind, string> = {
      APPLICATION_RECEIVED: 'New application activity on JobSeeker',
      APPLICATION_STATUS: 'Application status updated on JobSeeker',
      APPLICATION_WITHDRAWN: 'Application activity on JobSeeker',
      INTERVIEW_SCHEDULED: 'Interview activity on JobSeeker',
      INTERVIEW_UPDATED: 'Interview activity on JobSeeker',
      INTERVIEW_CANCELLED: 'Interview activity on JobSeeker',
      APPLICATION_MESSAGE: 'New application activity on JobSeeker',
    };
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') ?? 'http://localhost:5173';
    const from =
      this.configService.get<string>('RESEND_FROM')?.trim() ??
      'JobSeeker <jobs@send.nakry-tang.me>';

    try {
      // Callers supply only application-relative paths, not arbitrary links.
      const activityUrl = new URL(relativePath, frontendUrl).toString();
      const escapedUrl = activityUrl
        .replaceAll('&', '&amp;')
        .replaceAll('"', '&quot;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;');
      const subject = subjects[kind];
      const { error } = await this.resend.emails.send({
        from,
        to: email,
        subject,
        text: `There is new activity in your JobSeeker account. Sign in to review it: ${activityUrl}`,
        html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 30px; color: #171717;"><h2>${subject}</h2><p>There is new activity in your JobSeeker account.</p><p><a href="${escapedUrl}">Sign in to review it</a></p><p style="color: #666;">For your privacy, this email does not include application details or message contents.</p></div>`,
      });
      if (error) {
        this.logger.warn(
          `Resend rejected ${kind} alert: ${error.name} - ${error.message}`,
        );
        return false;
      }
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Could not send ${kind} alert: ${message}`);
      return false;
    }
  }
}
