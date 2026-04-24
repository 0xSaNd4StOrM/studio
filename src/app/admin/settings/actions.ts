'use server';

import { sendEmail } from '@/lib/email';
import { getAgencySettings } from '@/lib/supabase/agency-content';

export async function sendTestEmail(): Promise<{ ok: boolean; error?: string }> {
  const settings = await getAgencySettings({ skipTranslation: true });
  const agencyData = settings?.data;
  const emailSettings = agencyData?.emailSettings;
  const to = agencyData?.contactEmail;

  if (!to) {
    return { ok: false, error: 'No Contact Email set. Add one in the General Settings section.' };
  }

  const agencyName = agencyData?.agencyName || 'Your Agency';

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head><meta charset="UTF-8" /><title>Test Email</title></head>
    <body style="margin:0;padding:0;background:#f5f5f5;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 20px;">
        <tr><td align="center">
          <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;max-width:600px;width:100%;">
            <tr>
              <td style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:32px 40px;text-align:center;">
                <h1 style="color:#fff;margin:0;font-size:24px;font-weight:700;">${agencyName}</h1>
                <p style="color:rgba(255,255,255,0.8);margin:6px 0 0;font-size:14px;">Email Configuration Test</p>
              </td>
            </tr>
            <tr>
              <td style="padding:36px 40px;">
                <h2 style="font-size:20px;color:#111;margin:0 0 12px;">✅ Your email is working!</h2>
                <p style="color:#555;font-size:15px;line-height:1.6;margin:0 0 24px;">
                  This is a test email sent from your <strong>${agencyName}</strong> admin panel.
                  If you received this, your Resend integration is configured correctly and customers
                  will receive booking confirmations automatically.
                </p>
                <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px 20px;font-size:14px;color:#166534;">
                  <strong>What happens next?</strong><br />
                  Every new booking will trigger a confirmation email to the customer and
                  (if enabled) an alert email to this address.
                </div>
              </td>
            </tr>
            <tr>
              <td style="background:#f9fafb;padding:16px 40px;text-align:center;font-size:12px;color:#888;">
                Sent by ${agencyName} · Powered by Resend
              </td>
            </tr>
          </table>
        </td></tr>
      </table>
    </body>
    </html>
  `;

  return sendEmail({
    agencyEmailSettings: emailSettings,
    to,
    subject: `✅ Test Email — ${agencyName} email is working`,
    html,
  });
}
