import * as tls from "node:tls";
import { config } from "../config";

export interface SSLCertStatus {
  domain: string;
  issuer: string | null;
  validFrom: string | null;
  validTo: string | null;
  daysRemaining: number | null;
  status: "valid" | "expiring" | "critical" | "expired" | "error";
  error: string | null;
}

function checkCert(hostname: string, port = 443): Promise<SSLCertStatus> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      resolve({
        domain: hostname,
        issuer: null,
        validFrom: null,
        validTo: null,
        daysRemaining: null,
        status: "error",
        error: "Connection timeout",
      });
    }, 10000);

    try {
      const socket = tls.connect({ host: hostname, port, servername: hostname, rejectUnauthorized: false }, () => {
        clearTimeout(timeout);
        const cert = socket.getPeerCertificate();
        socket.destroy();

        if (!cert || !cert.valid_to) {
          resolve({
            domain: hostname,
            issuer: null,
            validFrom: null,
            validTo: null,
            daysRemaining: null,
            status: "error",
            error: "No certificate returned",
          });
          return;
        }

        const validTo = new Date(cert.valid_to);
        const validFrom = new Date(cert.valid_from);
        const now = new Date();
        const daysRemaining = Math.floor((validTo.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        let status: SSLCertStatus["status"] = "valid";
        if (daysRemaining <= 0) {
          status = "expired";
        } else if (daysRemaining <= config.thresholds.ssl.expiryAlertDays) {
          status = "critical";
        } else if (daysRemaining <= config.thresholds.ssl.expiryWarnDays) {
          status = "expiring";
        }

        resolve({
          domain: hostname,
          issuer: cert.issuer?.O ?? cert.issuer?.CN ?? null,
          validFrom: validFrom.toISOString(),
          validTo: validTo.toISOString(),
          daysRemaining,
          status,
          error: null,
        });
      });

      socket.on("error", (err) => {
        clearTimeout(timeout);
        resolve({
          domain: hostname,
          issuer: null,
          validFrom: null,
          validTo: null,
          daysRemaining: null,
          status: "error",
          error: err.message,
        });
      });
    } catch (err) {
      clearTimeout(timeout);
      resolve({
        domain: hostname,
        issuer: null,
        validFrom: null,
        validTo: null,
        daysRemaining: null,
        status: "error",
        error: String(err),
      });
    }
  });
}

export async function collectSSLStatus(domains: string[]): Promise<SSLCertStatus[]> {
  if (domains.length === 0) return [];

  // Check all domains in parallel (max 5 concurrent)
  const results: SSLCertStatus[] = [];
  const batchSize = 5;

  for (let i = 0; i < domains.length; i += batchSize) {
    const batch = domains.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map((d) => checkCert(d)));
    results.push(...batchResults);
  }

  return results;
}
