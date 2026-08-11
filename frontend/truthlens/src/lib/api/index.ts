/**
 * The one place the app decides between the real backend and the mock.
 *
 * Every component and hook imports `api` from here and calls, for example,
 * `api.getReport(id)`. None of them knows which implementation answered.
 * That is the whole value of the `TruthLensApi` interface: mock mode is a
 * single environment variable, not a code change scattered across the app.
 *
 *   NEXT_PUBLIC_USE_MOCK_API=true   → src/mocks/mockApi.ts
 *   NEXT_PUBLIC_USE_MOCK_API=false  → src/lib/api/services.ts (real HTTP)
 */
import { env } from "@/config/env";
import { mockApi } from "@/mocks/mockApi";
import { realApi } from "./services";
import type { TruthLensApi } from "./contract";

export const api: TruthLensApi = env.useMockApi ? mockApi : realApi;

/** True when the app is running on fake data — used to show a dev banner. */
export const isMockMode = env.useMockApi;

export type { TruthLensApi } from "./contract";
