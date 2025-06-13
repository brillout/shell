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

    const shouldThrowError = (!!err && !tolerateExitCode) || (!!stderr && !tolerateStderr)
    if (!shouldThrowError) {
      resolvePromise({
        stdout,
        stderr,
        // err.code holds the exit code (it's `!==0` otherwise Node.js wouldn't have thrown an error)
        exitCode: err?.code || 0,
      })
    } else {
      const errMsg =
        stderr ||
        stdout ||
        // err.message holds a useless generic message (e.g. `Command failed: git show 123456789`)
        err?.message ||
        err
      rejectPromise(
        new Error(
          [
            `========= COMMAND FAILED ==========`,
            `Command: ${colorCmd(cmd)}`,
            `cwd: ${colorCwd(cwd)}`,
            `============== ERROR ==============`,
            colorErr(String(errMsg).trim()),
            `===================================`,
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
function colorErr(err: string) {
  return pc.bold(pc.red(err))
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
