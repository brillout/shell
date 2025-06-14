export { run }

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

async function run(
  cmd: string,
  { cwd = process.cwd(), timeout = 25 * 1000, tolerateStderr, tolerateExitCode }: RunOptions = {},
): Promise<RunReturn> {
  const { promise, resolvePromise, rejectPromise } = genPromise<RunReturn>()

  const t = setTimeout(() => {
    rejectPromise(new Error(`Command ${colorCmd(cmd)} (${colorCwd(cwd)}) timeout after ${timeout / 1000} seconds.`))
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
      const errMsg =
        stderr ||
        stdout ||
        // err.message holds a useless generic message (e.g. `Command failed: git show 123456789`)
        err?.message ||
        err
      const errReason = isFailureExitCode ? `exit code ${exitCode}` : `stderr`
      rejectPromise(
        new Error(
          [
            `============= COMMAND FAILED ==============`,
            `Command: ${colorCmd(cmd)}`,
            `cwd: ${colorCwd(cwd)}`,
            `=========== ERROR (${colorErrReason(errReason)}) ===========`,
            colorErrMsg(String(errMsg).trim()),
            `===========================================`,
          ].join('\n'),
        ),
      )
    }
  })

  return promise
}

function colorCmd(cmd: string) {
  return pc.bold(pc.blue(cmd))
}
function colorCwd(cmd: string) {
  return pc.bold(pc.yellow(cmd))
}
function colorErrMsg(errMsg: string) {
  return pc.bold(pc.red(errMsg))
}
function colorErrReason(errReason: string) {
  return pc.bold(errReason)
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
