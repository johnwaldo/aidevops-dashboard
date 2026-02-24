import { config } from "../config";

export interface VPSMetrics {
  hostname: string;
  ip: string;
  provider: string;
  os: string;
  status: "healthy" | "warning" | "critical" | "unreachable";
  uptime: string;
  cpu: { current: number };
  ram: { used: number; total: number; pct: number };
  disk: { used: number; total: number; pct: number };
  sshLatency: number;
  services: { name: string; status: "running" | "stopped" | "idle" }[];
}

export async function collectVPSMetrics(): Promise<VPSMetrics | null> {
  if (!config.enableVPS || !config.vpsHost) {
    return null;
  }

  const startTime = Date.now();

  try {
    const sshCmd = [
      "ssh",
      "-o", "ConnectTimeout=5",
      "-o", "StrictHostKeyChecking=no",
      "-p", String(config.vpsPort),
      `${config.vpsUser}@${config.vpsHost}`,
      `echo '---METRICS---' && hostname && cat /etc/os-release 2>/dev/null | grep PRETTY_NAME | cut -d'"' -f2 && uptime -p 2>/dev/null || uptime && top -bn1 | grep 'Cpu' | awk '{print $2}' && free -m | awk '/Mem:/ {print $2, $3}' && df -BG / | awk 'NR==2 {gsub("G",""); print $2, $3}' && systemctl is-active nginx node fail2ban certbot 2>/dev/null || echo 'unknown'`,
    ];

    const proc = Bun.spawn(sshCmd, { stdout: "pipe", stderr: "pipe" });
    const text = await new Response(proc.stdout).text();
    const exitCode = await proc.exited;

    const sshLatency = Date.now() - startTime;

    if (exitCode !== 0) {
      return {
        hostname: config.vpsHost,
        ip: config.vpsHost,
        provider: "Unknown",
        os: "Unknown",
        status: "unreachable",
        uptime: "unknown",
        cpu: { current: 0 },
        ram: { used: 0, total: 0, pct: 0 },
        disk: { used: 0, total: 0, pct: 0 },
        sshLatency,
        services: [],
      };
    }

    const lines = text.split("\n").filter((l) => l.trim());
    const metricsStart = lines.indexOf("---METRICS---");
    const data = metricsStart >= 0 ? lines.slice(metricsStart + 1) : lines;

    const hostname = data[0] ?? config.vpsHost;
    const os = data[1] ?? "Linux";
    const uptime = (data[2] ?? "unknown").replace("up ", "");
    const cpuPct = parseFloat(data[3] ?? "0");
    const ramParts = (data[4] ?? "0 0").split(" ");
    const ramTotal = parseInt(ramParts[0] ?? "0");
    const ramUsed = parseInt(ramParts[1] ?? "0");
    const diskParts = (data[5] ?? "0 0").split(" ");
    const diskTotal = parseInt(diskParts[0] ?? "0");
    const diskUsed = parseInt(diskParts[1] ?? "0");

    const serviceNames = ["nginx", "node", "fail2ban", "certbot"];
    const serviceStatuses = (data[6] ?? "").split(/\s+/);
    const services = serviceNames.map((name, i) => ({
      name,
      status: (serviceStatuses[i] === "active" ? "running" : serviceStatuses[i] === "inactive" ? "idle" : "stopped") as "running" | "stopped" | "idle",
    }));

    const ramPct = ramTotal > 0 ? Math.round((ramUsed / ramTotal) * 100) : 0;
    const diskPct = diskTotal > 0 ? Math.round((diskUsed / diskTotal) * 100) : 0;

    const status: VPSMetrics["status"] =
      cpuPct > 90 || ramPct > 95 || diskPct > 90 ? "critical" :
      cpuPct > 70 || ramPct > 80 || diskPct > 80 ? "warning" : "healthy";

    return {
      hostname,
      ip: config.vpsHost,
      provider: "Hetzner",
      os,
      status,
      uptime,
      cpu: { current: Math.round(cpuPct) },
      ram: { used: Math.round(ramUsed / 1024 * 10) / 10, total: Math.round(ramTotal / 1024 * 10) / 10, pct: ramPct },
      disk: { used: diskUsed, total: diskTotal, pct: diskPct },
      sshLatency,
      services,
    };
  } catch (err) {
    console.error("[vps] SSH collection failed:", err);
    return null;
  }
}
