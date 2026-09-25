// n8n Code node: "Clean submission" (Mode: Run Once for Each Item)
// Checks and tidies what the website form sent. Bots that fill the hidden
// "nickname" field, or anything malformed, get skip: true and go no further.
const body = $input.item.json.body || {};
const text = (v, max = 500) => String(v ?? '').trim().slice(0, max);

const type = text(body.type, 20);
const email = text(body.email, 200).toLowerCase();
const nickname = text(body.nickname, 200); // hidden honeypot field; people never see it

// n8n 2.x Code nodes have no URL global, so the address is checked with a pattern.
// Returns '' for blank, null for invalid, or a tidy https:// address.
function normalizeUrl(value) {
  let url = text(value, 300);
  if (/\s/.test(url)) return null;
  if (!url) return '';
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
  const m = /^(https?):\/\/((?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63})(:\d{1,5})?(\/[^\s]*)?$/i.exec(url);
  if (!m) return null;
  const path = (m[4] || '').replace(/\/$/, '');
  return m[1].toLowerCase() + '://' + m[2].toLowerCase() + (m[3] || '') + path;
}

let reason = '';
if (nickname) reason = 'honeypot filled';
else if (!['audit', 'intake'].includes(type)) reason = 'unknown form type';
else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) reason = 'bad email';

const siteUrl = normalizeUrl(type === 'audit' ? body.url : body.current_site);
if (!reason && siteUrl === null) reason = 'bad website address';
if (!reason && type === 'audit' && !siteUrl) reason = 'audit with no website';

const data = {
  email,
  name: text(body.name, 120),
  business: text(body.business, 160),
  phone: text(body.phone, 40),
  business_type: text(body.business_type, 120),
  current_site: type === 'intake' ? (siteUrl || '') : '',
  needs: text(body.needs, 2000),
  inspiration: text(body.inspiration, 500),
  updates: text(body.updates, 20),
  url: type === 'audit' ? siteUrl : '',
  page: text(body.page, 300),
  submitted_at: text(body.submitted_at, 40)
};

return {
  json: {
    skip: Boolean(reason),
    skip_reason: reason,
    type,
    email,
    name: data.name,
    business: data.business,
    site_url: siteUrl || '',
    data
  }
};
