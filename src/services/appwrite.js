const { Client, Account, Users, Messaging, ID } = require("node-appwrite");
const { pool } = require("../config/database");

// Appwrite replaces Firebase: social login (JWT verify) + push (Messaging).
// Needs APPWRITE_API_KEY with users/sessions/messages scopes; without it
// social login and push return 503, everything else keeps working.
const endpoint =
  process.env.APPWRITE_ENDPOINT || "https://sgp.cloud.appwrite.io/v1";
const projectId = process.env.APPWRITE_PROJECT_ID;
const apiKey = process.env.APPWRITE_API_KEY;

const appwriteReady = () => Boolean(projectId && apiKey);

const serverClient = () =>
  new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);

const users = appwriteReady() ? new Users(serverClient()) : null;
const messaging = appwriteReady() ? new Messaging(serverClient()) : null;

/** Verifies a client-created Appwrite JWT and returns the account behind it. */
async function verifyJwt(jwt) {
  const client = new Client()
    .setEndpoint(endpoint)
    .setProject(projectId)
    .setJWT(jwt);
  const account = await new Account(client).get();
  return {
    appwriteId: account.$id,
    email: account.email,
    name: account.name || account.email?.split("@")[0] || "User",
  };
}

async function ensureAppwriteColumn() {
  await pool.query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS appwrite_id TEXT UNIQUE;
  `);
}

/**
 * Makes sure the local user has a matching Appwrite user and returns a
 * one-time session secret the mobile app redeems with account.createSession.
 * Fail-soft: returns null when Appwrite is not configured or unreachable,
 * so login never breaks because of push.
 */
async function sessionForUser(user) {
  if (!appwriteReady()) return null;
  try {
    await ensureAppwriteColumn();
    let appwriteId = user.appwrite_id;
    if (!appwriteId) {
      // Reuse an Appwrite user with the same email, else create one.
      const found = await users.list({ search: user.email });
      const match = found.users.find((u) => u.email === user.email);
      const appwriteUser =
        match ||
        (await users.create({
          userId: ID.unique(),
          email: user.email,
          name: user.name,
        }));
      appwriteId = appwriteUser.$id;
      await pool.query(`UPDATE users SET appwrite_id = $1 WHERE id = $2`, [
        appwriteId,
        user.id,
      ]);
    }
    const token = await users.createToken(appwriteId);
    return { userId: token.userId, secret: token.secret };
  } catch (err) {
    console.error("[appwrite] sessionForUser failed:", err.message);
    return null;
  }
}

async function getAppwriteIds(userIds) {
  if (userIds.length === 0) return [];
  const { rows } = await pool.query(
    `SELECT appwrite_id FROM users
     WHERE appwrite_id IS NOT NULL AND id = ANY($1::int[])`,
    [userIds],
  );
  return rows.map((r) => r.appwrite_id);
}

async function getAllAppwriteIds() {
  const { rows } = await pool.query(
    `SELECT appwrite_id FROM users WHERE appwrite_id IS NOT NULL`,
  );
  return rows.map((r) => r.appwrite_id);
}

// Fire-and-forget tolerant like the FCM version before it: a push problem
// never breaks the API response that triggered it.
async function sendPush(appwriteIds, { title, body, data }) {
  if (!appwriteReady() || appwriteIds.length === 0) return { sent: 0, failed: 0 };
  try {
    await messaging.createPush({
      messageId: ID.unique(),
      title,
      body,
      users: appwriteIds,
      data: Object.fromEntries(
        Object.entries(data || {}).map(([k, v]) => [k, String(v)]),
      ),
    });
    return { sent: appwriteIds.length, failed: 0 };
  } catch (err) {
    console.error("[appwrite] push failed:", err.message);
    return { sent: 0, failed: appwriteIds.length };
  }
}

/** Push one local user (same signature as the old FCM notifyUser). */
async function notifyUser(userId, payload) {
  return sendPush(await getAppwriteIds([Number(userId)]), payload);
}

module.exports = {
  appwriteReady,
  verifyJwt,
  sessionForUser,
  sendPush,
  notifyUser,
  getAppwriteIds,
  getAllAppwriteIds,
};
