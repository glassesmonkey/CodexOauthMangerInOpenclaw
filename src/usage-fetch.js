import { ProxyAgent } from "undici";

const proxyAgents = new Map();

function getProxyAgent(proxyUrl) {
  if (proxyAgents.has(proxyUrl)) {
    return proxyAgents.get(proxyUrl);
  }
  const agent = new ProxyAgent(proxyUrl);
  proxyAgents.set(proxyUrl, agent);
  return agent;
}

export function resolveUsageProxyUrl(proxyConfig, env = process.env) {
  if (!proxyConfig?.enabled) {
    return null;
  }

  if (typeof proxyConfig.url === "string" && proxyConfig.url.trim()) {
    return proxyConfig.url.trim();
  }

  if (typeof env.HTTPS_PROXY === "string" && env.HTTPS_PROXY.trim()) {
    return env.HTTPS_PROXY.trim();
  }

  if (typeof env.HTTP_PROXY === "string" && env.HTTP_PROXY.trim()) {
    return env.HTTP_PROXY.trim();
  }

  return null;
}

export function createUsageFetch(proxyConfig, options = {}) {
  const fetchImpl = options.fetchImpl ?? fetch;
  const env = options.env ?? process.env;
  const proxyUrl = resolveUsageProxyUrl(proxyConfig, env);

  if (!proxyConfig?.enabled) {
    return fetchImpl;
  }

  if (!proxyUrl) {
    return async () => {
      throw new Error("Usage proxy is enabled, but no proxy URL was provided and HTTPS_PROXY/HTTP_PROXY is not set.");
    };
  }

  const proxyAgent = getProxyAgent(proxyUrl);
  return async (url, init = {}) =>
    await fetchImpl(url, {
      ...init,
      dispatcher: proxyAgent,
    });
}
