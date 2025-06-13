export { run }

import { exec } from 'node:child_process'
import assert from 'node:assert'
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

    // Useless generic message
    assert(!err || err.message.startsWith(`Command failed: ${cmd}`))
    // err.code holds the exit code => it must be `!==0` otherwise Node.js wouldn't have thrown an error
    assert(!err || (typeof err.code === 'number' && err.code !== 0))

    const shouldThrowError = (!!err && !tolerateExitCode) || (!!stderr && !tolerateStderr)
    if (!shouldThrowError) {
      resolvePromise({ stdout, stderr, exitCode: err?.code || 0 })
    } else {
      const errMsg = stderr || stdout || err?.message || err
      assert(errMsg)
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
