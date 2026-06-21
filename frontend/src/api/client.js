import axios from "axios";

const baseURL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1";

export const client = axios.create({
  baseURL,
});

// Interceptor for Mocks
client.interceptors.request.use(async (config) => {
  if (import.meta.env.VITE_USE_MOCK === "true") {
    // Basic routing to mock JSONs
    let mockFile = null;
    if (config.url.includes("/predict/triage")) mockFile = "triageResponse.json";
    else if (config.url.includes("/predict/cascade")) mockFile = "cascadeResponse.json";
    else if (config.url.includes("/incidents")) mockFile = "incidents.json";
    else if (config.url.includes("/corridors/risk")) mockFile = "corridorsRisk.json";
    else if (config.url.includes("/deploy/recommend")) mockFile = "deploymentRecommendation.json";
    else if (config.url.includes("/forecast")) mockFile = "forecast.json";
    else if (config.url.includes("/blackspot/junctions")) mockFile = "blackspotJunctions.json";
    else if (config.url.includes("/blackspot/neglect")) mockFile = "neglectIndex.json";
    else if (config.url.includes("/surge/vulnerability")) mockFile = "surgeVulnerability.json";
    else if (config.url.includes("/surge/replay")) mockFile = "surgeReplay.json";

    if (mockFile) {
      config.adapter = async () => {
        try {
          // Dynamic import of mock files
          const module = await import(`./mocks/${mockFile}`);
          return {
            data: module.default,
            status: 200,
            statusText: "OK",
            headers: {},
            config,
            request: {}
          };
        } catch (err) {
          console.error("Mock fetch error", err);
          return Promise.reject(err);
        }
      };
    }
  }
  return config;
});
