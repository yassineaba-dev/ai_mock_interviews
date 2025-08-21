"use server";

import { generateObject } from "ai";
import { google } from "@ai-sdk/google";
import { db } from "@/firebase/admin";
import { feedbackSchema } from "@/constants";

// Helper: safe where
function addWhereIfDefined(q: any, field: string, op: any, value: any) {
  if (value === undefined || value === null) return q;
  return q.where(field, op, value);
}

// ---------------- Feedback ----------------
export async function createFeedback(params: CreateFeedbackParams) {
  const { interviewId, userId, transcript, feedbackId } = params;
  if (!interviewId || !userId || !transcript) return { success: false };

  try {
    const formattedTranscript = transcript
      .map((s: { role: string; content: string }) => `- ${s.role}: ${s.content}\n`)
      .join("");

    const { object } = await generateObject({
      model: google("gemini-2.0-flash-001", { structuredOutputs: false }),
      schema: feedbackSchema,
      prompt: `
        You are an AI interviewer analyzing a mock interview. Evaluate based on categories.
        Transcript:
        ${formattedTranscript}
      `,
      system: "Professional interviewer analyzing a mock interview",
    });

    const feedback = {
      interviewId,
      userId,
      totalScore: object.totalScore,
      categoryScores: object.categoryScores,
      strengths: object.strengths,
      areasForImprovement: object.areasForImprovement,
      finalAssessment: object.finalAssessment,
      createdAt: new Date().toISOString(),
    };

    const feedbackRef = feedbackId
      ? db.collection("feedback").doc(feedbackId)
      : db.collection("feedback").doc();

    await feedbackRef.set(feedback);
    return { success: true, feedbackId: feedbackRef.id };
  } catch (error) {
    console.error("Error saving feedback:", error);
    return { success: false };
  }
}

// ---------------- Single Interview ----------------
export async function getInterviewById(id: string): Promise<Interview | null> {
  if (!id) return null;
  const doc = await db.collection("interviews").doc(id).get();
  return doc.exists ? (doc.data() as Interview) : null;
}

// ---------------- Feedback by Interview ----------------
export async function getFeedbackByInterviewId(
  params: GetFeedbackByInterviewIdParams
): Promise<Feedback | null> {
  const { interviewId, userId } = params;
  if (!interviewId || !userId) return null;

  let q: any = db.collection("feedback");
  q = addWhereIfDefined(q, "interviewId", "==", interviewId);
  q = addWhereIfDefined(q, "userId", "==", userId);

  const snapshot = await q.limit(1).get();
  if (snapshot.empty) return null;

  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() } as Feedback;
}

// ---------------- Latest Interviews ----------------
export async function getLatestInterviews(
  params: GetLatestInterviewsParams
): Promise<Interview[] | null> {
  const { userId, limit = 20 } = params;

  const snapshot = await db.collection("interviews")
    .where("finalized", "==", true)
    .get();

  const interviews = snapshot.docs
    .map(doc => ({ id: doc.id, ...doc.data() }))
    .filter(interview => interview.userId !== userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);

  return interviews as Interview[];
}

// ---------------- Interviews by User ----------------
export async function getInterviewsByUserId(userId: string): Promise<Interview[] | null> {
  if (!userId) return [];
  const snapshot = await db.collection("interviews")
    .where("userId", "==", userId)
    .get();

  return snapshot.docs
    .map(doc => ({ id: doc.id, ...doc.data() }))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}
