export interface LocalMetrics {
  hostname: string;
  chip: string;
  uptime: string;
  cpu: { combined: number; user: number; sys: number; idle: number };
  memory: { used: number; total: number; pct: number; pressure: string };
  disk: { used: number; total: number; pct: number };
  gpu: { utilization: number | null; metalActive: boolean };
  status: "healthy" | "warning" | "critical";
}

async function run(cmd: string[]): Promise<string> {
  const proc = Bun.spawn(cmd, { stdout: "pipe", stderr: "pipe" });
  const text = await new Response(proc.stdout).text();
  await proc.exited;
  return text.trim();
}

export async function collectLocalMetrics(): Promise<LocalMetrics> {
  const [hostnameRaw, chipRaw, uptimeRaw, topRaw, vmStatRaw, diskRaw, memSizeRaw] = await Promise.all([
    run(["hostname"]),
    run(["sysctl", "-n", "machdep.cpu.brand_string"]).catch(() => "Unknown"),
    run(["uptime"]),
    run(["top", "-l", "1", "-n", "0", "-s", "0"]),
    run(["vm_stat"]),
    run(["df", "-g", "/"]),
    run(["sysctl", "-n", "hw.memsize"]),
  ]);

  // Parse CPU from top output
  const cpuMatch = topRaw.match(/CPU usage:\s*([\d.]+)% user,\s*([\d.]+)% sys,\s*([\d.]+)% idle/);
  const cpuUser = cpuMatch ? parseFloat(cpuMatch[1]) : 0;
  const cpuSys = cpuMatch ? parseFloat(cpuMatch[2]) : 0;
  const cpuIdle = cpuMatch ? parseFloat(cpuMatch[3]) : 100;

  // Parse memory from vm_stat
  const pageSize = 16384; // Apple Silicon page size
  const freeMatch = vmStatRaw.match(/Pages free:\s+(\d+)/);
  const activeMatch = vmStatRaw.match(/Pages active:\s+(\d+)/);
  const inactiveMatch = vmStatRaw.match(/Pages inactive:\s+(\d+)/);
  const wiredMatch = vmStatRaw.match(/Pages wired down:\s+(\d+)/);
  const compressedMatch = vmStatRaw.match(/Pages occupied by compressor:\s+(\d+)/);

  const totalBytes = parseInt(memSizeRaw) || 64 * 1024 * 1024 * 1024;
  const totalGB = totalBytes / (1024 * 1024 * 1024);

  const activePages = parseInt(activeMatch?.[1] ?? "0");
  const wiredPages = parseInt(wiredMatch?.[1] ?? "0");
  const compressedPages = parseInt(compressedMatch?.[1] ?? "0");
  const usedBytes = (activePages + wiredPages + compressedPages) * pageSize;
  const usedGB = usedBytes / (1024 * 1024 * 1024);
  const memPct = Math.round((usedGB / totalGB) * 100);

  // Memory pressure heuristic
  const freePages = parseInt(freeMatch?.[1] ?? "0");
  const inactivePages = parseInt(inactiveMatch?.[1] ?? "0");
  const availablePages = freePages + inactivePages;
  const totalPages = totalBytes / pageSize;
  const pressure = availablePages / totalPages > 0.2 ? "nominal" : availablePages / totalPages > 0.1 ? "warn" : "critical";

  // Parse disk from df
  const diskLines = diskRaw.split("\n");
  const diskParts = diskLines[1]?.split(/\s+/) ?? [];
  const diskTotal = parseInt(diskParts[1] ?? "0");
  const diskUsed = parseInt(diskParts[2] ?? "0");
  const diskPct = diskTotal > 0 ? Math.round((diskUsed / diskTotal) * 100) : 0;

  // Parse uptime
  const uptimeMatch = uptimeRaw.match(/up\s+(.+?),\s+\d+ user/);
  const uptime = uptimeMatch?.[1]?.trim() ?? "unknown";

  // Chip name cleanup
  const chip = chipRaw.includes("Apple") ? chipRaw : `Apple ${chipRaw}`;

  // Overall status
  const combined = cpuUser + cpuSys;
  const status: LocalMetrics["status"] =
    combined > 90 || memPct > 95 || diskPct > 90 ? "critical" :
    combined > 70 || memPct > 80 || diskPct > 80 ? "warning" : "healthy";

  return {
    hostname: hostnameRaw,
    chip,
    uptime,
    cpu: { combined: Math.round(combined), user: Math.round(cpuUser), sys: Math.round(cpuSys), idle: Math.round(cpuIdle) },
    memory: { used: Math.round(usedGB * 10) / 10, total: Math.round(totalGB), pct: memPct, pressure },
    disk: { used: diskUsed, total: diskTotal, pct: diskPct },
    gpu: { utilization: null, metalActive: true }, // GPU metrics require sudo; skip for now
    status,
  };
}
