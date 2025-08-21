"use server";

import { auth, db } from "@/firebase/admin";
import { cookies } from "next/headers";

const SESSION_DURATION = 60 * 60 * 24 * 7; // 1 week

export async function setSessionCookie(idToken: string) {
  if (!idToken) throw new Error("idToken is required");

  const cookieStore = await cookies();
  const sessionCookie = await auth.createSessionCookie(idToken, {
    expiresIn: SESSION_DURATION * 1000,
  });

  cookieStore.set("session", sessionCookie, {
    maxAge: SESSION_DURATION,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    sameSite: "lax",
  });
}

export async function signUp(params: SignUpParams) {
  const { uid, name, email } = params;
  if (!uid || !name || !email)
    return { success: false, message: "Missing required parameters" };

  try {
    const userDoc = await db.collection("users").doc(uid).get();
    if (userDoc.exists)
      return { success: false, message: "User already exists. Please sign in." };

    await db.collection("users").doc(uid).set({ name, email });

    return { success: true, message: "Account created successfully. Please sign in." };
  } catch (error: any) {
    console.error("Error creating user:", error);
    if (error.code === "auth/email-already-exists") {
      return { success: false, message: "This email is already in use" };
    }
    return { success: false, message: "Failed to create account. Please try again." };
  }
}

export async function signIn(params: SignInParams) {
  const { email, idToken } = params;
  if (!email || !idToken)
    return { success: false, message: "Email and idToken are required" };

  try {
    const userRecord = await auth.getUserByEmail(email);
    if (!userRecord)
      return { success: false, message: "User does not exist. Create an account." };

    await setSessionCookie(idToken);
    return { success: true };
  } catch (error: any) {
    console.error("SignIn error:", error);
    return { success: false, message: "Failed to log into account. Please try again." };
  }
}

export async function signOut() {
  const cookieStore = await cookies();
  cookieStore.delete("session");
}

export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("session")?.value;
  if (!sessionCookie) return null;

  try {
    const decodedClaims = await auth.verifySessionCookie(sessionCookie, true);
    const userDoc = await db.collection("users").doc(decodedClaims.uid).get();
    if (!userDoc.exists) return null;

    return { id: userDoc.id, ...userDoc.data() } as User;
  } catch (error) {
    console.error("getCurrentUser error:", error);
    return null;
  }
}

export async function isAuthenticated() {
  const user = await getCurrentUser();
  return !!user;
}
