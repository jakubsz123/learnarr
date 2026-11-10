import { describe, expect, it } from "vitest";
import { addUser, testDb } from "./helpers";
import { schema } from "../server/db";
import { loginEmail } from "../shared/username";
import { createAuth } from "../server/utils/auth";
import { asAdminCreatingAccount } from "../server/utils/userAccess";
import {
  acceptInvite,
  createInvite,
  findInvite,
  INVITE_TTL_MS,
  pendingInvites,
} from "../server/utils/invites";

function setup() {
  const db = testDb();
  const admin = addUser(db, { isAdmin: true });
  return { db, admin, auth: createAuth(db) };
}

describe("invites", () => {
  it("lets someone create their own account, once", async () => {
    const { db, admin, auth } = setup();
    const { token } = createInvite(db, admin.id);
    expect(findInvite(db, token)).toMatchObject({ userId: null });

    const { email } = await acceptInvite(db, auth, token, {
      username: "Victor",
      password: "correct-horse-9",
    });
    expect(email).toBe("victor@learnarr.local");
    const signedIn = await auth.api.signInEmail({ body: { email, password: "correct-horse-9" } });
    expect(signedIn.user.name).toBe("Victor");

    // The link is spent.
    await expect(
      acceptInvite(db, auth, token, {
        username: "again",
        password: "correct-horse-9",
      }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("keeps the link working when the username is already taken", async () => {
    const { db, admin, auth } = setup();
    addUser(db, { email: loginEmail("taken") });
    const { token } = createInvite(db, admin.id);
    await expect(
      acceptInvite(db, auth, token, { username: "Taken", password: "correct-horse-9" }),
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(findInvite(db, token)).not.toBeNull();
  });

  it("needs a username for a new account", async () => {
    const { db, admin, auth } = setup();
    const { token } = createInvite(db, admin.id);
    await expect(acceptInvite(db, auth, token, { password: "correct-horse-9" })).rejects.toMatchObject({
      statusCode: 400,
    });
    expect(findInvite(db, token)).not.toBeNull();
  });

  it("stops working after a week, and can be cancelled", async () => {
    const { db, admin } = setup();
    const now = Date.now();
    const old = createInvite(db, admin.id, undefined, now);
    expect(findInvite(db, old.token, now + INVITE_TTL_MS - 1000)).not.toBeNull();
    expect(findInvite(db, old.token, now + INVITE_TTL_MS + 1000)).toBeNull();

    const cancelled = createInvite(db, admin.id);
    db.delete(schema.invites).run();
    expect(findInvite(db, cancelled.token)).toBeNull();
  });

  it("stores only a hash of the token", () => {
    const { db, admin } = setup();
    const { token } = createInvite(db, admin.id);
    const [row] = db.select().from(schema.invites).all();
    expect(JSON.stringify(row)).not.toContain(token);
  });

  it("lets someone choose a new password, and signs them out everywhere", async () => {
    const { db, admin, auth } = setup();
    const { user: ana } = await asAdminCreatingAccount(() =>
      auth.api.signUpEmail({ body: { name: "Ana", email: "ana@example.com", password: "old-password-1" } }),
    );
    const first = createInvite(db, admin.id, ana.id);
    const listed = pendingInvites(db);
    expect(listed).toMatchObject([{ userId: ana.id }]);

    await auth.api.signInEmail({ body: { email: "ana@example.com", password: "old-password-1" } });
    expect(db.select().from(schema.session).all().length).toBeGreaterThan(0);

    await acceptInvite(db, auth, first.token, { password: "new-password-2" });
    expect(db.select().from(schema.session).all()).toHaveLength(0);
    await expect(
      auth.api.signInEmail({ body: { email: "ana@example.com", password: "old-password-1" } }),
    ).rejects.toBeTruthy();
    expect(
      (await auth.api.signInEmail({ body: { email: "ana@example.com", password: "new-password-2" } })).user
        .id,
    ).toBe(ana.id);
  });
});
