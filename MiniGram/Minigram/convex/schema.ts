import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    subject: v.string(),
    username: v.string(),
    displayName: v.string(),
    bio: v.string(),
    avatar: v.optional(v.id("media")),
    privacy: v.union(v.literal("private"), v.literal("public")),
    status: v.union(
      v.literal("incomplete"),
      v.literal("active"),
      v.literal("suspended"),
      v.literal("deleting"),
    ),
    admitted: v.boolean(),
    admin: v.boolean(),
    createdAt: v.number(),
    postCount: v.number(),
    acceptedPoliciesAt: v.optional(v.number()),
    ageConfirmedAt: v.optional(v.number()),
  })
    .index("by_subject", ["subject"])
    .index("by_username", ["username"])
    .index("by_status", ["status"])
    .index("by_name", ["displayName"]),
  settings: defineTable({
    key: v.string(),
    admitted: v.number(),
    uploadsEnabled: v.boolean(),
    admissionsEnabled: v.boolean(),
    storedBytes: v.number(),
    maxStoredBytes: v.number(),
  }).index("by_key", ["key"]),
  invites: defineTable({
    hash: v.string(),
    hint: v.string(),
    creator: v.optional(v.id("users")),
    redeemedBy: v.optional(v.id("users")),
    expiresAt: v.number(),
    revoked: v.boolean(),
  }).index("by_hash", ["hash"]),
  follows: defineTable({
    from: v.id("users"),
    to: v.id("users"),
    status: v.union(v.literal("pending"), v.literal("accepted")),
  })
    .index("by_pair", ["from", "to"])
    .index("by_to", ["to", "status"])
    .index("by_from", ["from", "status"]),
  blocks: defineTable({ from: v.id("users"), to: v.id("users") })
    .index("by_pair", ["from", "to"])
    .index("by_from", ["from"])
    .index("by_to", ["to"]),
  media: defineTable({
    owner: v.id("users"),
    kind: v.union(v.literal("image"), v.literal("video")),
    purpose: v.union(
      v.literal("post"),
      v.literal("message"),
      v.literal("avatar"),
    ),
    state: v.union(
      v.literal("uploading"),
      v.literal("validating"),
      v.literal("ready"),
      v.literal("attached"),
      v.literal("deleted"),
    ),
    storageId: v.optional(v.id("_storage")),
    mime: v.optional(v.string()),
    size: v.number(),
    duration: v.optional(v.number()),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
    post: v.optional(v.id("posts")),
    message: v.optional(v.id("messages")),
    createdAt: v.number(),
    counted: v.optional(v.boolean()),
    purged: v.optional(v.boolean()),
  })
    .index("by_owner", ["owner"])
    .index("by_storage", ["storageId"])
    .index("by_state", ["state", "createdAt"]),
  posts: defineTable({
    author: v.id("users"),
    media: v.id("media"),
    caption: v.string(),
    deleted: v.boolean(),
    clientId: v.string(),
    likes: v.number(),
    comments: v.number(),
    editedAt: v.optional(v.number()),
  })
    .index("by_author", ["author"])
    .index("by_client", ["author", "clientId"])
    .index("by_deleted", ["deleted"]),
  likes: defineTable({ user: v.id("users"), post: v.id("posts") })
    .index("by_pair", ["user", "post"])
    .index("by_post", ["post"]),
  saves: defineTable({ user: v.id("users"), post: v.id("posts") })
    .index("by_user", ["user"])
    .index("by_pair", ["user", "post"])
    .index("by_post", ["post"]),
  comments: defineTable({
    author: v.id("users"),
    post: v.id("posts"),
    text: v.string(),
    deleted: v.boolean(),
    clientId: v.optional(v.string()),
  })
    .index("by_post", ["post"])
    .index("by_client", ["author", "clientId"])
    .index("by_author", ["author"]),
  conversations: defineTable({
    pair: v.string(),
    a: v.id("users"),
    b: v.id("users"),
    initiator: v.id("users"),
    status: v.union(
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("declined"),
      v.literal("blocked"),
    ),
    lastAt: v.number(),
    lastText: v.string(),
    aReadAt: v.number(),
    bReadAt: v.number(),
  })
    .index("by_pair", ["pair"])
    .index("by_a", ["a", "lastAt"])
    .index("by_b", ["b", "lastAt"]),
  messages: defineTable({
    conversation: v.id("conversations"),
    sender: v.id("users"),
    text: v.string(),
    media: v.optional(v.id("media")),
    deleted: v.boolean(),
    clientId: v.string(),
  })
    .index("by_conversation", ["conversation"])
    .index("by_client", ["sender", "clientId"])
    .index("by_sender", ["sender"]),
  activity: defineTable({
    recipient: v.id("users"),
    actor: v.id("users"),
    kind: v.union(
      v.literal("like"),
      v.literal("comment"),
      v.literal("follow"),
      v.literal("request"),
    ),
    post: v.optional(v.id("posts")),
    read: v.boolean(),
  }).index("by_recipient", ["recipient"]),
  reports: defineTable({
    reporter: v.id("users"),
    targetType: v.union(
      v.literal("user"),
      v.literal("post"),
      v.literal("comment"),
      v.literal("message"),
    ),
    targetId: v.string(),
    reason: v.string(),
    evidence: v.string(),
    evidenceStorage: v.optional(v.id("_storage")),
    expiresAt: v.number(),
    status: v.union(v.literal("open"), v.literal("resolved")),
    resolution: v.optional(v.string()),
  })
    .index("by_storage", ["evidenceStorage"])
    .index("by_status", ["status"])
    .index("by_expiry", ["expiresAt"]),
  moderation: defineTable({
    admin: v.id("users"),
    action: v.string(),
    target: v.string(),
    reason: v.string(),
  }),
  limits: defineTable({
    key: v.string(),
    count: v.number(),
    window: v.number(),
  }).index("by_key", ["key"]),
  jobs: defineTable({
    kind: v.union(v.literal("storage"), v.literal("clerk")),
    target: v.string(),
    attempts: v.number(),
  }).index("by_target", ["target"]),
});
