import os from 'node:os'
import { statfs } from 'node:fs/promises'

export async function hostUsage() {
  const cpu = await cpuPercent()
  const memory = memoryUsage()
  const disk = await diskUsage()
  return { cpu, memory, disk }
}

async function cpuPercent() {
  const start = cpuSnapshot()
  await new Promise((resolve) => setTimeout(resolve, 200))
  const end = cpuSnapshot()
  const idle = end.idle - start.idle
  const total = end.total - start.total
  if (total <= 0) return 0
  return clamp(Math.round((1 - idle / total) * 100))
}

function cpuSnapshot() {
  let idle = 0
  let total = 0
  for (const cpu of os.cpus()) {
    for (const value of Object.values(cpu.times)) total += value
    idle += cpu.times.idle
  }
  return { idle, total }
}

function memoryUsage() {
  const total = os.totalmem()
  const used = Math.max(0, total - os.freemem())
  return { used, total, percent: percent(used, total) }
}

async function diskUsage() {
  const stats = await statfs('/')
  const total = stats.blocks * stats.bsize
  const free = stats.bfree * stats.bsize
  const used = Math.max(0, total - free)
  return { used, total, percent: percent(used, total) }
}

function percent(used, total) {
  if (total <= 0) return 0
  return clamp(Math.round((used / total) * 100))
}

function clamp(value) {
  return Math.min(100, Math.max(0, value))
}
