// n8n Code node: "Build audit report email" (Mode: Run Once for Each Item)
// Turns the PageSpeed result into a plain-language email, a SendGrid request,
// and a Telegram note. If the scan failed, it builds a "we'll check by hand" email.
const SITE = 'https://wayfaredigital.com';
const FROM_EMAIL = 'hello@wayfaredigital.com';
const MAILING_ADDRESS = 'YOUR_MAILING_ADDRESS';

const sub = $('Clean submission').item.json;
const psi = $input.item.json || {};
const lr = psi.lighthouseResult;
const host = sub.site_url.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '');

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clean = (s) => String(s ?? '').replace(/\u00a0/g, ' ');
const score = (key) => (lr && lr.categories && lr.categories[key] && lr.categories[key].score != null)
  ? Math.round(lr.categories[key].score * 100) : null;
const rating = (n) => n == null ? 'not measured' : n >= 90 ? 'Good' : n >= 50 ? 'Needs work' : 'Poor';

// Plain-language versions of the most common PageSpeed findings.
const PLAIN = {
  'render-blocking-resources': 'Files are blocking your page from showing up until they finish loading.',
  'unused-javascript': 'Your site downloads code it never uses.',
  'unused-css-rules': 'Your site downloads styling it never uses.',
  'unminified-javascript': 'Your code is shipped uncompressed.',
  'unminified-css': 'Your styling is shipped uncompressed.',
  'uses-responsive-images': 'Images are much bigger than the screens showing them.',
  'modern-image-formats': 'Images use older, heavier file formats.',
  'uses-optimized-images': 'Images are not compressed.',
  'offscreen-images': 'Images below the fold load before anyone scrolls to them.',
  'efficient-animated-content': 'Animated images are heavy. Short videos would load faster.',
  'redirects': 'Visitors get bounced through extra redirects before the page loads.',
  'server-response-time': 'Your server is slow to respond.',
  'uses-text-compression': 'Your server is not compressing files before sending them.',
  'uses-long-cache-ttl': 'Returning visitors re-download files that could be saved on their phone.',
  'third-party-summary': 'Outside scripts like trackers, chat widgets, and ads are slowing your page.',
  'bootup-time': 'Your page makes phones do too much work before it responds.',
  'mainthread-work-breakdown': 'Your page makes phones do too much work before it responds.',
  'long-tasks': 'Your page freezes in short bursts while it loads.',
  'layout-shifts': 'Things jump around while the page loads, so people tap the wrong thing.',
  'total-byte-weight': 'The page is heavy to download on a phone connection.',
  'dom-size': 'The page is built with far more pieces than it needs.',
  'font-display': 'Text stays invisible while fonts load.',
  'uses-rel-preconnect': 'Your page is slow to connect to the other services it relies on.',
  'legacy-javascript': 'Your site ships old code that modern phones do not need.',
  'duplicated-javascript': 'Your site downloads some of the same code twice.'
};

let ok = Boolean(lr) && !lr.runtimeError && score('performance') != null;
let subject, html, textBody, telegram;
const quoteLink = SITE + '/#signup';

if (ok) {
  const audits = lr.audits || {};
  const perf = score('performance');
  const a11y = score('accessibility');
  const bp = score('best-practices');
  const seo = score('seo');
  const lcp = clean(audits['largest-contentful-paint'] && audits['largest-contentful-paint'].displayValue);
  const lcpSec = audits['largest-contentful-paint'] ? audits['largest-contentful-paint'].numericValue / 1000 : null;

  // "Est savings of 1,170 ms" -> "Fixing this could save about 1.2 seconds."
  const savingsText = (dv) => {
    const m = /Est savings of ([\d.,]+)\s*(ms|s|KiB|MiB)/.exec(clean(dv || ''));
    if (!m) return '';
    const n = parseFloat(m[1].replace(/,/g, ''));
    if (m[2] === 'ms') return n >= 100 ? `Fixing this could save about ${(n / 1000).toFixed(1)} seconds.` : '';
    if (m[2] === 's') return `Fixing this could save about ${n.toFixed(1)} seconds.`;
    if (m[2] === 'KiB') return `Fixing this could cut about ${Math.round(n).toLocaleString('en-US')} KB from the page.`;
    return `Fixing this could cut about ${n.toFixed(1)} MB from the page.`;
  };
  // Rank problems by how much time fixing them would save.
  const weight = (a) => {
    const m = a.metricSavings || {};
    return (m.LCP || 0) + (m.FCP || 0) + (m.TBT || 0) + (m.CLS || 0) * 10000
      + ((a.details && a.details.overallSavingsMs) || 0);
  };
  const seen = new Set();
  const problems = Object.entries(audits)
    .filter(([id, a]) => PLAIN[id] && a.score !== null && a.score < 0.9 && weight(a) > 0)
    .sort((x, y) => weight(y[1]) - weight(x[1]))
    .map(([id, a]) => ({ plain: PLAIN[id], detail: savingsText(a.displayValue) }))
    .filter((p) => (seen.has(p.plain) ? false : seen.add(p.plain)))
    .slice(0, 3);

  const speedLine = lcpSec != null
    ? `On a phone, your main content took ${lcp} to appear. Google counts anything over 2.5 seconds as slow.`
    : '';
  const verdict = perf >= 90
    ? `Good news: ${host} is fast on phones. There is still room to tighten things up.`
    : perf >= 50
      ? `${host} works, but it is slower on phones than it should be, and that costs you customers.`
      : `${host} is slow on phones. Most of your visitors are on phones, and a slow page sends them to a competitor.`;

  subject = `Your website report: ${host} scored ${perf}/100 on phones`;

  const problemsHtml = problems.length
    ? '<ol style="padding-left:20px;margin:8px 0 0">' + problems.map((p) =>
        `<li style="margin:0 0 10px"><strong>${esc(p.plain)}</strong>${p.detail ? `<br><span style="color:#3A4C5C">${esc(p.detail)}</span>` : ''}</li>`).join('') + '</ol>'
    : '<p style="margin:8px 0 0">No major speed problems stood out.</p>';
  const problemsText = problems.length
    ? problems.map((p, i) => `${i + 1}. ${p.plain}${p.detail ? ' ' + p.detail : ''}`).join('\n')
    : 'No major speed problems stood out.';

  const row = (label, n) => `<tr><td style="padding:6px 16px 6px 0">${label}</td><td style="padding:6px 16px 6px 0"><strong>${n == null ? '-' : n + '/100'}</strong></td><td style="padding:6px 0;color:#3A4C5C">${rating(n)}</td></tr>`;

  html = `<!DOCTYPE html><html><body style="margin:0;background:#FAF7F0;font-family:Arial,Helvetica,sans-serif;color:#1C2B3A">
<div style="max-width:600px;margin:0 auto;padding:28px 22px">
<p style="font-size:13px;color:#96601F;margin:0 0 6px;font-weight:bold">Wayfare Digital website report</p>
<h1 style="font-family:Georgia,serif;font-size:24px;margin:0 0 14px">${esc(host)}: ${perf}/100 on phones</h1>
<p style="font-size:16px;line-height:1.55;margin:0 0 10px">${esc(verdict)}</p>
${speedLine ? `<p style="font-size:16px;line-height:1.55;margin:0 0 18px">${esc(speedLine)}</p>` : ''}
<table style="font-size:15px;border-collapse:collapse;margin:0 0 20px">
${row('Speed on phones', perf)}${row('Accessibility', a11y)}${row('Best practices', bp)}${row('Search engine basics', seo)}
</table>
<h2 style="font-family:Georgia,serif;font-size:19px;margin:0">The biggest problems</h2>
<div style="font-size:15px;line-height:1.5">${problemsHtml}</div>
${problems.length ? `<p style="font-size:15px;line-height:1.55;margin:14px 0 0"><strong>What we'd fix first:</strong> ${esc(problems[0].plain)}</p>` : ''}
<div style="margin:26px 0 0;padding:20px;background:#EFE9DC;border-radius:6px">
<p style="font-family:Georgia,serif;font-size:18px;margin:0 0 6px"><strong>Want a free quote to fix it?</strong></p>
<p style="font-size:15px;line-height:1.5;margin:0 0 14px">No hidden fees. What you see is what you pay.</p>
<a href="${quoteLink}" style="display:inline-block;background:#1C2B3A;color:#FAF7F0;text-decoration:none;padding:12px 18px;border-radius:4px;font-weight:bold">Yes, send me a quote</a>
</div>
<p style="font-size:13px;color:#3A4C5C;line-height:1.5;margin:26px 0 0">Scores come from Google PageSpeed Insights, tested as a phone on a mobile connection. Results can move a few points between runs.<br><br>
Questions? Just reply to this email.<br>Wayfare Digital, ${esc(MAILING_ADDRESS)}</p>
</div></body></html>`;

  textBody = `Wayfare Digital website report for ${host}

Speed on phones: ${perf}/100 (${rating(perf)})
${verdict}
${speedLine}

Accessibility: ${a11y}/100 | Best practices: ${bp}/100 | Search engine basics: ${seo}/100

The biggest problems:
${problemsText}
${problems.length ? '\nWhat we\'d fix first: ' + problems[0].plain + '\n' : ''}
Want a free quote to fix it? No hidden fees. What you see is what you pay.
${quoteLink}

Scores come from Google PageSpeed Insights, tested as a phone on a mobile connection.
Questions? Just reply to this email.
Wayfare Digital, ${MAILING_ADDRESS}`;

  telegram = `New free audit\n${host}: ${perf}/100 on phones (${rating(perf)})${lcp ? ', main content in ' + lcp : ''}\nEmail: ${sub.email}\nReport sent.`;
} else {
  const why = (psi.error && (psi.error.message || psi.error.description)) || (lr && lr.runtimeError && lr.runtimeError.message) || 'unknown error';
  subject = `Your website report for ${host}`;
  html = `<!DOCTYPE html><html><body style="margin:0;background:#FAF7F0;font-family:Arial,Helvetica,sans-serif;color:#1C2B3A">
<div style="max-width:600px;margin:0 auto;padding:28px 22px">
<h1 style="font-family:Georgia,serif;font-size:22px;margin:0 0 14px">We couldn't scan ${esc(host)} automatically</h1>
<p style="font-size:16px;line-height:1.55">Some sites block automated scanners or take too long to respond. That's worth knowing on its own, because it can affect how search engines see you too.</p>
<p style="font-size:16px;line-height:1.55">We'll look at it by hand and send your report within one business day.</p>
<p style="font-size:13px;color:#3A4C5C;margin-top:26px">Questions? Just reply to this email.<br>Wayfare Digital, ${esc(MAILING_ADDRESS)}</p>
</div></body></html>`;
  textBody = `We couldn't scan ${host} automatically. Some sites block automated scanners or take too long to respond.\n\nWe'll look at it by hand and send your report within one business day.\n\nQuestions? Just reply to this email.\nWayfare Digital, ${MAILING_ADDRESS}`;
  telegram = `Free audit NEEDS A MANUAL REPORT\n${host}\nEmail: ${sub.email}\nScan failed: ${String(why).slice(0, 200)}\nThey were told: report within one business day.`;
}

return {
  json: {
    scan_ok: ok,
    telegram,
    sendgrid: {
      personalizations: [{ to: [{ email: sub.email }] }],
      from: { email: FROM_EMAIL, name: 'Wayfare Digital' },
      reply_to: { email: FROM_EMAIL, name: 'Wayfare Digital' },
      subject,
      content: [
        { type: 'text/plain', value: textBody },
        { type: 'text/html', value: html }
      ]
    }
  }
};
