// Teams messages via Microsoft Graph (ChatMessage.Send): posted as the signed-in user
// into the chat chosen in settings. No webhook or workflow involved.

// Switches the sign-in to include the Teams permissions (asks for consent once).
async function enableTeams() {
  await browser.storage.local.set({ teamsConsent: true });
  try {
    return await signIn(true);
  } catch (e) {
    await browser.storage.local.set({ teamsConsent: false });
    throw e;
  }
}

function chatLabel(chat, me) {
  if (chat.topic) return chat.topic;
  const others = (chat.members || []).map((m) => m.displayName).filter((n) => n && n !== me);
  if (others.length) return others.join(', ');
  return chat.chatType === 'oneOnOne' ? 'Chat (1:1)' : 'Unnamed chat';
}

async function listChats() {
  const { account } = await browser.storage.local.get('account');
  let data;
  try {
    data = await graph('/me/chats?$expand=members&$top=50');
  } catch {
    // Some tenants refuse the member expansion; fall back to topics only.
    data = await graph('/me/chats?$top=50');
  }
  const chats = data.value
    .filter((c) => c.chatType !== 'meeting')
    .map((c) => ({ id: c.id, name: chatLabel(c, account && account.name), type: c.chatType }));
  return { chats };
}

async function postChatMessage(chatId, text) {
  if (chatIdFromInput(chatId || '') !== chatId) throw new Error('Invalid Teams chat ID');
  await graph(`/chats/${chatId}/messages`, {
    method: 'POST',
    body: { body: { contentType: 'text', content: text } },
  });
}

// Returns true if a message was sent, false if Teams is off or has no quips for this action.
async function postQuip(action, now) {
  const { teams, account } = await browser.storage.local.get(['teams', 'account']);
  if (!teams || !teams.enabled || !teams.chatId) return false;
  const quips = (teams.quips && teams.quips[action]) || [];
  if (!quips.length) return false;

  const text = renderQuip(pickRandom(quips), account ? account.firstName : '', formatTime(now.toISOString()));
  await postChatMessage(teams.chatId, text);
  return true;
}
