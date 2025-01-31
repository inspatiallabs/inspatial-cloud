interface MemorySettings {
  sharedBuffers: number;
  workMem: number;
  maintenanceWorkMem: number;
  maxConnections: number;
  effectiveCacheSize: number;
}
export function calculateMemorySettings(
  maxConnections?: number,
): MemorySettings {
  const settings: MemorySettings = {
    sharedBuffers: 0,
    workMem: 0,
    maintenanceWorkMem: 0,
    maxConnections: maxConnections || 100,
    effectiveCacheSize: 0,
  };
  const { total } = getSystemRam();
  settings.sharedBuffers = Math.floor(total * 0.25);
  settings.workMem = Math.floor(total * 0.25 / settings.maxConnections);
  settings.maintenanceWorkMem = Math.floor(total * 0.05);
  settings.effectiveCacheSize = Math.floor(total * 0.5);
  return settings;
}

function getSystemRam() {
  const memInfo = Deno.systemMemoryInfo();
  const memory: Record<keyof Deno.SystemMemoryInfo, number> = {
    total: 0,
    free: 0,
    available: 0,
    buffers: 0,
    cached: 0,
    swapTotal: 0,
    swapFree: 0,
  };
  Object.keys(memInfo).forEach((key) => {
    const id = key as keyof Deno.SystemMemoryInfo;
    memory[id] = convertToMB(memInfo[id]);
  });
  return memory;
}

function convertToMB(bytes: number) {
  return bytes / 1024 / 1024;
}
