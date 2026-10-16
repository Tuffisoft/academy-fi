BEGIN;

CREATE TYPE "GroupRole" AS ENUM ('ADMIN', 'MEMBER');
CREATE TYPE "GroupMemberStatus" AS ENUM ('INVITED', 'ACTIVE');

CREATE TABLE "GroupConversation" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nextSequence" INTEGER NOT NULL DEFAULT 0,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "GroupConversation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GroupMembership" (
    "conversationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "GroupRole" NOT NULL DEFAULT 'MEMBER',
    "status" "GroupMemberStatus" NOT NULL DEFAULT 'INVITED',
    "joinedSequence" INTEGER NOT NULL DEFAULT 0,
    "lastReadSequence" INTEGER NOT NULL DEFAULT 0,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GroupMembership_pkey" PRIMARY KEY ("conversationId", "userId")
);

CREATE TABLE "GroupMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "encrypted" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "editedAt" TIMESTAMP(3),
    CONSTRAINT "GroupMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "GroupMembership_userId_status_idx" ON "GroupMembership"("userId", "status");
CREATE UNIQUE INDEX "GroupMessage_conversationId_sequence_key" ON "GroupMessage"("conversationId", "sequence");
CREATE UNIQUE INDEX "GroupMessage_senderId_clientId_key" ON "GroupMessage"("senderId", "clientId");

ALTER TABLE "GroupMembership" ADD CONSTRAINT "GroupMembership_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "GroupConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GroupMembership" ADD CONSTRAINT "GroupMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GroupMessage" ADD CONSTRAINT "GroupMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "GroupConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GroupMessage" ADD CONSTRAINT "GroupMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT;
