"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { getVapiClient } from "@/lib/vapi.sdk";

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
}

const Agent = ({ userName, userId }: AgentProps) => {
  const [callStatus, setCallStatus] = useState<CallStatus>(CallStatus.INACTIVE);
  const [messages, setMessages] = useState<SavedMessage[]>([]);
  const [lastMessage, setLastMessage] = useState<string>("");

  const handleCall = async () => {
    setCallStatus(CallStatus.CONNECTING);

    const workflowId = process.env.NEXT_PUBLIC_VAPI_WORKFLOW_ID;
    if (!workflowId) {
      console.error("Workflow ID missing.");
      setCallStatus(CallStatus.FINISHED);
      return;
    }

    const variables = { username: userName, userid: userId };

    try {
      const client = await getVapiClient();
      if (!client) throw new Error("VAPI Client not initialized");

      const call = await client.start({
        workflowId,
        variableValues: variables,
      });

      call.on("message", (msg: any) => {
        setMessages((prev) => [...prev, { role: msg.role, content: msg.content }]);
      });

      call.on("finish", () => setCallStatus(CallStatus.FINISHED));

      setCallStatus(CallStatus.ACTIVE);
    } catch (err) {
      console.error("Error starting VAPI call:", err);
      setCallStatus(CallStatus.FINISHED);
    }
  };

  const handleDisconnect = () => setCallStatus(CallStatus.FINISHED);

  useEffect(() => {
    if (messages.length > 0) setLastMessage(messages[messages.length - 1].content);
  }, [messages]);

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Avatars */}
      <div className="call-view">
        <div className="card-interviewer">
          <div className="avatar">
            <Image src="/ai-avatar.png" alt="AI" width={65} height={65} className="rounded-full object-cover" />
          </div>
          <h3>AI Interviewer</h3>
        </div>

        <div className="card-border">
          <div className="card-content flex flex-col items-center">
            <Image src="/user-avatar.png" alt="User" width={120} height={120} className="rounded-full object-cover" />
            <h3 className="mt-2 font-semibold">{userName}</h3>
          </div>
        </div>
      </div>

      {/* Transcript */}
      {messages.length > 0 && (
        <div className="transcript-border w-full max-w-lg">
          <div className="transcript p-3">
            <p key={lastMessage} className={cn("transition-opacity duration-500 opacity-0", "animate-fadeIn opacity-100")}>
              {lastMessage}
            </p>
          </div>
        </div>
      )}

      {/* Buttons */}
      <div className="w-full flex justify-center mt-4">
        {callStatus !== CallStatus.ACTIVE ? (
          <button className="relative btn-call" onClick={handleCall}>
            <span className={cn("absolute animate-ping rounded-full opacity-75", callStatus !== CallStatus.CONNECTING && "hidden")} />
            <span className="relative">{callStatus === CallStatus.INACTIVE || callStatus === CallStatus.FINISHED ? "Call" : "Connecting..."}</span>
          </button>
        ) : (
          <button className="btn-disconnect" onClick={handleDisconnect}>End</button>
        )}
      </div>
    </div>
  );
};

export default Agent;
