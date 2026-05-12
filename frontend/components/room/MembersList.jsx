"use client";

import { Crown, Wifi, WifiOff } from "lucide-react";

export default function MembersList({ members, hostId, currentUserId }) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-800 flex-shrink-0">
        <h3 className="text-white font-semibold text-sm">In this room</h3>
        <p className="text-gray-500 text-xs mt-0.5">
          {members.length} member{members.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Members */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {members.map((member) => {
          const isHost = member.userId === hostId;
          const isYou = member.userId === currentUserId;

          return (
            <div
              key={member.socketId}
              className="flex items-center gap-3 px-2 py-2
                         rounded-lg hover:bg-gray-800/50 transition"
            >
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                <div
                  className={`
                    w-8 h-8 rounded-full flex items-center
                    justify-center text-white text-xs font-bold
                    ${isHost ? "bg-yellow-600" : "bg-red-600"}
                  `}
                >
                  {member.name?.charAt(0).toUpperCase()}
                </div>

                {/* Online indicator */}
                <div
                  className="absolute -bottom-0.5 -right-0.5
                                w-2.5 h-2.5 bg-green-500 rounded-full
                                border-2 border-gray-900"
                />
              </div>

              {/* Name and badges */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-white text-xs font-medium truncate">
                    {member.name}
                    {isYou && <span className="text-gray-500 ml-1">(you)</span>}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 mt-0.5">
                  {/* Host badge */}
                  {isHost && (
                    <div
                      className="flex items-center gap-1
                                    text-yellow-400"
                    >
                      <Crown className="w-2.5 h-2.5" />
                      <span className="text-xs">Host</span>
                    </div>
                  )}

                  {/* Buffering indicator */}
                  {member.isBuffering && (
                    <div
                      className="flex items-center gap-1
                                    text-yellow-400"
                    >
                      <WifiOff className="w-2.5 h-2.5" />
                      <span className="text-xs">Buffering</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Empty state */}
        {members.length === 0 && (
          <div className="text-center py-6">
            <p className="text-gray-600 text-xs">No members yet</p>
          </div>
        )}
      </div>
    </div>
  );
}

{
  /* 
there is a whole lot of error in the code first the video is playing but not showing the video i am just hearing the audio, also the chat is not working if i drop message i can't see it in chat panel is not working and lastly there is no way i can stop active playing video it just keep staying active even if i leave the room i should be able to stop the video and when i log out i mean the host the member automatically turn to the host  just help me correct all those especially me seeing the video when i open the cloudinary link of the video url on the browser too i only hear the audio i can't see the video, the video is only playing the the cloudinary video player */
}
