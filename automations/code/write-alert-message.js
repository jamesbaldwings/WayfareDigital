// n8n Code node: "Write alert message" (Mode: Run Once for Each Item)
const r = $input.item.json;
const site = `${r.site_name}\n${r.url}`;
let text;
if (r.kind === 'down' && r.action === 'opened') {
  text = `DOWN: ${site}\nProblem: ${r.detail}\nFailed two checks in a row, 5 minutes apart.`;
} else if (r.kind === 'down' && r.action === 'resolved') {
  text = `BACK UP: ${site}\nIt was down for about ${r.minutes_open} minutes.`;
} else if (r.kind === 'ssl' && r.action === 'opened') {
  text = `SSL WARNING: ${site}\n${r.detail}. Browsers will show visitors a security warning if it lapses.`;
} else {
  text = `SSL OK again: ${site}`;
}
return { json: { text } };
