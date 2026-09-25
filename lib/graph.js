// Entra ID sign-in (auth code + PKCE, SPA platform) and a small Graph fetch helper.

const LOGIN = 'https://login.microsoftonline.com';
const GRAPH = 'https://graph.microsoft.com/v1.0';
const BASE_SCOPES = 'openid profile offline_access User.Read Files.ReadWrite.All';
// Only requested once Teams messages are switched on, so Excel-only users never need to consent to them.
const TEAMS_SCOPES = 'ChatMessage.Send Chat.ReadBasic';

async function scopes() {
  const { teamsConsent } = await browser.storage.local.get('teamsConsent');
  return teamsConsent ? `${BASE_SCOPES} ${TEAMS_SCOPES}` : BASE_SCOPES;
}
const REQUEST_TIMEOUT_MS = 20000;

class NeedsSignIn extends Error {
  constructor(message = 'Sign-in required') {
    super(message);
    this.name = 'NeedsSignIn';
  }
}

function base64url(bytes) {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function randomString(length) {
  return base64url(crypto.getRandomValues(new Uint8Array(length)));
}

async function authConfig() {
  const { clientId, tenantId } = await browser.storage.local.get(['clientId', 'tenantId']);
  if (!clientId || !tenantId) throw new NeedsSignIn('Entra app not configured');
  return { clientId, tenantId };
}

async function signIn(interactive = true) {
  const { clientId, tenantId } = await authConfig();
  const verifier = randomString(48);
  const challenge = base64url(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)));
  const state = randomString(16);
  const redirectUri = browser.identity.getRedirectURL();

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    response_mode: 'query',
    redirect_uri: redirectUri,
    scope: await scopes(),
    code_challenge: challenge,
    code_challenge_method: 'S256',
    state,
  });
  if (!interactive) params.set('prompt', 'none');

  let redirect;
  try {
    redirect = await browser.identity.launchWebAuthFlow({
      url: `${LOGIN}/${tenantId}/oauth2/v2.0/authorize?${params}`,
      interactive,
    });
  } catch (e) {
    throw new NeedsSignIn(interactive ? `Sign-in cancelled or failed: ${e.message}` : 'Sign-in required');
  }

  const result = new URL(redirect).searchParams;
  if (result.get('error')) throw new NeedsSignIn(result.get('error_description') || result.get('error'));
  if (result.get('state') !== state) throw new NeedsSignIn('Sign-in state mismatch');

  await redeem({
    grant_type: 'authorization_code',
    code: result.get('code'),
    redirect_uri: redirectUri,
    code_verifier: verifier,
  });

  const me = await graph('/me?$select=displayName,givenName,mail,userPrincipalName');
  const account = {
    name: me.displayName,
    firstName: me.givenName || me.displayName,
    username: me.mail || me.userPrincipalName,
  };
  await browser.storage.local.set({ account });
  return account;
}

async function signOut() {
  await browser.storage.local.remove(['tokens', 'account']);
}

async function redeem(fields) {
  const { clientId, tenantId } = await authConfig();
  const res = await fetch(`${LOGIN}/${tenantId}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: clientId, scope: await scopes(), ...fields }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new NeedsSignIn((body.error_description || 'Token request failed').split(/\r?\n/)[0]);
  }
  const tokens = {
    accessToken: body.access_token,
    refreshToken: body.refresh_token,
    expiresAt: Date.now() + (body.expires_in - 60) * 1000,
  };
  await browser.storage.local.set({ tokens });
  return tokens;
}

async function getAccessToken() {
  const { tokens } = await browser.storage.local.get('tokens');
  if (tokens && tokens.expiresAt > Date.now()) return tokens.accessToken;

  if (tokens && tokens.refreshToken) {
    try {
      return (await redeem({ grant_type: 'refresh_token', refresh_token: tokens.refreshToken })).accessToken;
    } catch { /* fall through to silent sign-in */ }
  }

  // SPA refresh tokens expire after 24 h; try a silent re-auth using the browser's Microsoft session.
  try {
    await signIn(false);
    return (await browser.storage.local.get('tokens')).tokens.accessToken;
  } catch {
    await browser.storage.local.remove('tokens');
    throw new NeedsSignIn('Microsoft sign-in expired');
  }
}

async function graph(path, { method = 'GET', body } = {}) {
  const token = await getAccessToken();
  const res = await fetch(GRAPH + path, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => null);
  if (res.status === 401) {
    await browser.storage.local.remove('tokens');
    throw new NeedsSignIn('Microsoft sign-in expired');
  }
  if (!res.ok) {
    throw new Error((data && data.error && data.error.message) || `Graph HTTP ${res.status}`);
  }
  return data;
}
