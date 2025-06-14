import { shell } from './index.js'
import { expect, describe, it } from 'vitest'

describe('shell()', () => {
  it('basic', async () => {
    const res = await shell('git ls-files')
    expect(res.stdout).toContain('package.json')
  })
  it('npm script', async () => {
    const res = await shell('pnpm run test-script', { tolerateExitCode: true })
    expect(res.stdout).toContain('hello')
    expect(res.exitCode).toBe(42)
  })
  it('error: command failure', async () => {
    const res = await shell('git show 123456789', { tolerateExitCode: true, tolerateStderr: true })
    expect(res.stderr).toContain('unknown revision')
    expect(res.exitCode).toBe(128)
  })
  it("error: command doesn't exist", async () => {
    let failed = false
    let err
    try {
      await shell('this-command-does-not-exist')
    } catch (err_) {
      failed = true
      err = err_
    }
    expect(failed).toBe(true)
    expect(err).toBeDefined
  })
  it('pnpm dlx', async () => {
    const { stdout } = await shell('pnpm dlx github:dalisoft/typos-rs-npm#v1.33.1 --help')
    expect(stdout).toContain('--diff')
    expect(stdout).toContain('Print a diff of what would change')
  })
})
