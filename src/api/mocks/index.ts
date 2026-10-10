/**
 * Mock mode entry point, loaded via dynamic import only when VITE_USE_MOCKS=true,
 * so none of this ships in a production build that talks to the real API.
 */
import { setSocketTransportFactory } from "../../realtime/socket";
import { setTransport } from "../client";
import { mockFetch } from "./server";
import { MockSocketTransport } from "./socket";

export function enableMocks() {
  setTransport(mockFetch);
  setSocketTransportFactory(() => new MockSocketTransport());
  console.info("[Text-ME] Mock mode: API and socket are served from memory. Set VITE_USE_MOCKS=false to use your backend.");
}
