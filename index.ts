export { shell }

import { exec } from 'node:child_process'
import pc from '@brillout/picocolors'

type RunOptions = {
  cwd?: string
  timeout?: number
  tolerateStderr?: boolean
  tolerateExitCode?: boolean
}
type RunReturn = {
  stdout: string
  stderr: string
  exitCode: number
}

async function shell(
  cmd: string,
  { cwd = process.cwd(), timeout = 25 * 1000, tolerateStderr, tolerateExitCode }: RunOptions = {},
): Promise<RunReturn> {
  const { promise, resolvePromise, rejectPromise } = genPromise<RunReturn>()

  const t = setTimeout(() => {
    rejectPromise(new Error(`Command ${colorBlue(cmd)} (${colorYellow(cwd)}) timeout after ${timeout / 1000} seconds.`))
  }, timeout)

  exec(cmd, { cwd }, (err, stdout, stderr) => {
    clearTimeout(t)

    const isFailureExitCode = !!err && !tolerateExitCode
    const isFailureStderr = !!stderr && !tolerateStderr
    const shouldThrowError = isFailureExitCode || isFailureStderr

    // err.code holds the exit code (it's `!==0` otherwise Node.js wouldn't have thrown an error)
    const exitCode = err?.code || 0

    if (!shouldThrowError) {
      resolvePromise({
        stdout,
        stderr,
        exitCode,
      })
    } else {
      const errReason = [
        isFailureExitCode ? colorRed(`exit code ${exitCode}`) : null,
        isFailureStderr ? colorRed('STDERR') : null,
      ]
        .filter(Boolean)
        .join(' and ')
      const msg = [
        '[@brillout/shell] Shell command failed:',
        `================= ${colorBold('STDOUT')} ==================`,
        logStd(stdout),
        `================= ${colorRed('STDERR')} ==================`,
        logStd(stderr),
        `============= COMMAND FAILED ==============`,
        `Command: ${colorBlue(cmd)}`,
        `Reason: ${errReason}`,
        `cwd: ${colorYellow(cwd)}`,
        `===========================================`,
      ].join('\n')
      rejectPromise(new Error(msg))
    }
  })

  return promise
}

function logStd(std: string) {
  const s = std.trim()
  return s ? s : colorDim('(empty)')
}

function colorBlue(str: string) {
  return pc.bold(pc.blue(str))
}
function colorYellow(str: string) {
  return pc.bold(pc.yellow(str))
}
function colorRed(str: string) {
  return pc.bold(pc.red(str))
}
function colorBold(str: string) {
  return pc.bold(str)
}
function colorDim(str: string) {
  return pc.dim(str)
}

function genPromise<T>() {
  let resolvePromise!: (value: T) => void
  let rejectPromise!: (err: Error) => void
  const promise: Promise<T> = new Promise((resolve, reject) => {
    resolvePromise = resolve
    rejectPromise = reject
  })
  return { promise, resolvePromise, rejectPromise }
}
