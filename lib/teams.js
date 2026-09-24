// Teams messages via a Teams "Workflows" webhook, which posts as the Flow bot.

function adaptiveCard(text) {
  return {
    type: 'message',
    attachments: [{
      contentType: 'application/vnd.microsoft.card.adaptive',
      content: {
        $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
        type: 'AdaptiveCard',
        version: '1.4',
        body: [{ type: 'TextBlock', text, wrap: true }],
      },
    }],
  };
}

async function postCard(url, text) {
  if (!isAllowedWebhookUrl(url)) throw new Error('Not a Teams workflow webhook URL');
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(adaptiveCard(text)),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`Teams webhook HTTP ${res.status}`);
}

// Returns true if a message was sent, false if Teams is off or has no quips for this action.
async function postQuip(action, now) {
  const { teams, account } = await browser.storage.local.get(['teams', 'account']);
  if (!teams || !teams.enabled || !teams.webhookUrl) return false;
  const quips = (teams.quips && teams.quips[action]) || [];
  if (!quips.length) return false;

  const text = renderQuip(pickRandom(quips), account ? account.firstName : '', formatTime(now.toISOString()));
  await postCard(teams.webhookUrl, text);
  return true;
}
