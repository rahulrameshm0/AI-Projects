/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as activity from "../activity.js";
import type * as admin from "../admin.js";
import type * as cleanup from "../cleanup.js";
import type * as crons from "../crons.js";
import type * as http from "../http.js";
import type * as lib_access from "../lib/access.js";
import type * as lifecycle from "../lifecycle.js";
import type * as media from "../media.js";
import type * as messages from "../messages.js";
import type * as posts from "../posts.js";
import type * as reports from "../reports.js";
import type * as social from "../social.js";
import type * as users from "../users.js";
import type * as validateMedia from "../validateMedia.js";
import type * as webhooks from "../webhooks.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  activity: typeof activity;
  admin: typeof admin;
  cleanup: typeof cleanup;
  crons: typeof crons;
  http: typeof http;
  "lib/access": typeof lib_access;
  lifecycle: typeof lifecycle;
  media: typeof media;
  messages: typeof messages;
  posts: typeof posts;
  reports: typeof reports;
  social: typeof social;
  users: typeof users;
  validateMedia: typeof validateMedia;
  webhooks: typeof webhooks;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
