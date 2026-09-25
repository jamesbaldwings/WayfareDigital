// n8n Code node: "Build intake emails" (Mode: Run Once for Each Item)
// Confirmation email to the business owner, plus a Telegram note to Avi with every detail.
const FROM_EMAIL = 'hello@wayfaredigital.com';
const MAILING_ADDRESS = 'YOUR_MAILING_ADDRESS';

const sub = $('Clean submission').item.json;
const d = sub.data;
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const first = (d.name || '').split(/\s+/)[0] || 'there';
const updates = d.updates === 'managed' ? 'Frequent updates (you want us to handle them)' : 'Occasional edits you make yourself';

const lines = [
  ['Business', d.business],
  ['Type of business', d.business_type],
  ['Current website', d.current_site],
  ['What the site needs to do', d.needs],
  ['Sites you like', d.inspiration],
  ['Updates', updates],
  ['Phone', d.phone]
].filter(([, v]) => v);

const html = `<!DOCTYPE html><html><body style="margin:0;background:#FAF7F0;font-family:Arial,Helvetica,sans-serif;color:#1C2B3A">
<div style="max-width:600px;margin:0 auto;padding:28px 22px">
<h1 style="font-family:Georgia,serif;font-size:22px;margin:0 0 14px">Got it, ${esc(first)}.</h1>
<p style="font-size:16px;line-height:1.55">Thanks for telling us about ${esc(d.business || 'your business')}. We'll send your custom quote within one business day: the monthly cost, the setup cost, and which upkeep plan we'd recommend, with our reasoning.</p>
<p style="font-size:16px;line-height:1.55">No hidden fees. What you see is what you pay.</p>
<h2 style="font-family:Georgia,serif;font-size:17px;margin:22px 0 8px">What you sent us</h2>
<table style="font-size:15px;border-collapse:collapse">
${lines.map(([k, v]) => `<tr><td style="padding:5px 16px 5px 0;vertical-align:top;color:#3A4C5C">${esc(k)}</td><td style="padding:5px 0">${esc(v)}</td></tr>`).join('')}
</table>
<p style="font-size:15px;line-height:1.55;margin-top:20px">Anything to add or change? Just reply to this email.</p>
<p style="font-size:13px;color:#3A4C5C;margin-top:26px">Wayfare Digital, ${esc(MAILING_ADDRESS)}</p>
</div></body></html>`;

const textBody = `Got it, ${first}.

Thanks for telling us about ${d.business || 'your business'}. We'll send your custom quote within one business day: the monthly cost, the setup cost, and which upkeep plan we'd recommend, with our reasoning.

No hidden fees. What you see is what you pay.

What you sent us:
${lines.map(([k, v]) => `${k}: ${v}`).join('\n')}

Anything to add or change? Just reply to this email.
Wayfare Digital, ${MAILING_ADDRESS}`;

const telegram = `New quote request (reply within 1 business day)
${d.name} - ${d.business}
${d.email}${d.phone ? ' | ' + d.phone : ''}
Type: ${d.business_type || '-'}
Current site: ${d.current_site || 'none'}
Updates: ${d.updates === 'managed' ? 'Managed (frequent)' : 'Basic (self-edit)'}
Needs: ${d.needs || '-'}
Inspiration: ${d.inspiration || '-'}`;

return {
  json: {
    telegram,
    sendgrid: {
      personalizations: [{ to: [{ email: d.email }] }],
      from: { email: FROM_EMAIL, name: 'Wayfare Digital' },
      reply_to: { email: FROM_EMAIL, name: 'Wayfare Digital' },
      subject: `Got it: your Wayfare Digital quote is on the way`,
      content: [
        { type: 'text/plain', value: textBody },
        { type: 'text/html', value: html }
      ]
    }
  }
};
