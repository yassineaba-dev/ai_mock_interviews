// components/Agent.tsx
"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { interviewer } from "@/constants";
import { createFeedback } from "@/lib/actions/general.action";

enum CallStatus {
  INACTIVE = "INACTIVE",
  CONNECTING = "CONNECTING",
  ACTIVE = "ACTIVE",
  FINISHED = "FINISHED",
}

interface SavedMessage {
  role: "user" | "system" | "assistant";
  content: string;
}

interface AgentProps {
  userName: string;
  userId: string;
  interviewId?: string;
  feedbackId?: string;
  type: "generate" | "feedback";
  questions?: string[];
}

const Agent = ({ userName, userId, interviewId, feedbackId, type, questions }: AgentProps) => {
  const router = useRouter();
  const [callStatus, setCallStatus] = useState<CallStatus>(CallStatus.INACTIVE);
  const [messages, setMessages] = useState<SavedMessage[]>([]);
  const [lastMessage, setLastMessage] = useState<string>("");

  // inside Agent component
const handleCall = async () => {
  setCallStatus(CallStatus.CONNECTING);

  const workflowId = type === "generate"
    ? process.env.NEXT_PUBLIC_VAPI_WORKFLOW_ID
    : process.env.NEXT_PUBLIC_VAPI_INTERVIEWER_WORKFLOW_ID;

  if (!workflowId) {
    console.error("Workflow ID missing for this call type.");
    setCallStatus(CallStatus.FINISHED);
    return;
  }

  const variables = type === "generate"
    ? { username: userName, userid: userId }
    : { questions: (questions ?? []) }; // send array if workflow expects array

  try {
    const res = await fetch("/api/vapi/call", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workflowId, variables }),
    });

    // ALWAYS inspect full response
    const data = await res.json();
    console.log("RAW /api/vapi/call response:", data);

    if (!data.success) {
      // show upstream details if available
      console.error("Call error", data.error ?? data.upstream?.body ?? data);
      // If Vapi gives structured messages, try to show them:
      const upstream = data.upstream?.body;
      if (upstream) {
        // common shape: { message: [ ... ] } or { errors: [...] }
        console.error("Upstream details:", upstream);
        if (Array.isArray(upstream.message)) {
          console.error("Vapi messages:", upstream.message.join("\n"));
        }
      }
      setCallStatus(CallStatus.FINISHED);
      return;
    }

    console.log("Call started", data.call);
    setCallStatus(CallStatus.ACTIVE);
    // handle data.call as before...
  } catch (err) {
    console.error("Fetch error", err);
    setCallStatus(CallStatus.FINISHED);
  }
};


  const handleDisconnect = () => {
    setCallStatus(CallStatus.FINISHED);
  };

  // ✅ Generate feedback after finishing (for interviewer flows)
  useEffect(() => {
    const handleGenerateFeedback = async () => {
      if (!interviewId || !userId) return;

      const { success, feedbackId: id } = await createFeedback({
        interviewId,
        userId,
        transcript: messages,
        feedbackId,
      });

      if (success && id) {
        router.push(`/interview/${interviewId}/feedback`);
      } else {
        console.log("❌ Error saving feedback");
        router.push("/");
      }
    };

    if (callStatus === CallStatus.FINISHED && type !== "generate") {
      handleGenerateFeedback();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callStatus, messages, interviewId, feedbackId, router, type, userId]);

  // ✅ Always show latest message
  useEffect(() => {
    if (messages.length > 0) {
      setLastMessage(messages[messages.length - 1].content);
    }
  }, [messages]);

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Interviewer & User Avatars */}
      <div className="call-view">
        <div className="card-interviewer">
          <div className="avatar">
            <Image
              src="/ai-avatar.png"
              alt="AI Interviewer"
              width={65}
              height={65}
              className="rounded-full object-cover"
            />
          </div>
          <h3>AI Interviewer</h3>
        </div>

        <div className="card-border">
          <div className="card-content flex flex-col items-center">
            <Image
              src="/user-avatar.png"
              alt="User"
              width={120}
              height={120}
              className="rounded-full object-cover"
            />
            <h3 className="mt-2 font-semibold">{userName}</h3>
          </div>
        </div>
      </div>

      {/* Transcript */}
      {messages.length > 0 && (
        <div className="transcript-border w-full max-w-lg">
          <div className="transcript p-3">
            <p
              key={lastMessage}
              className={cn(
                "transition-opacity duration-500 opacity-0",
                "animate-fadeIn opacity-100"
              )}
            >
              {lastMessage}
            </p>
          </div>
        </div>
      )}

      {/* Buttons */}
      <div className="w-full flex justify-center mt-4">
        {callStatus !== CallStatus.ACTIVE ? (
          <button className="relative btn-call" onClick={handleCall}>
            <span
              className={cn(
                "absolute animate-ping rounded-full opacity-75",
                callStatus !== CallStatus.CONNECTING && "hidden"
              )}
            />
            <span className="relative">
              {callStatus === CallStatus.INACTIVE || callStatus === CallStatus.FINISHED
                ? "Call"
                : "Connecting..."}
            </span>
          </button>
        ) : (
          <button className="btn-disconnect" onClick={handleDisconnect}>
            End
          </button>
        )}
      </div>
    </div>
  );
};

export default Agent;
