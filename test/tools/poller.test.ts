import { poll, CheckFunction } from '../../src/tools/poller'
import CancelController from '../../src/tools/CancelController'
import { delay } from '../../src/tools/delay'
import { UploadClientError } from '../../src/tools/errors'

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
const longJob = (attemps: number, fails: Error | null = null) => {
  let runs = 1
  const condition = jasmine.createSpy('condition')
  const cancel = jasmine.createSpy('cancelCondition')

  const isFinish: CheckFunction<boolean> = cancelCrtl => {
    condition()

    if (cancelCrtl) {
      cancelCrtl.onCancel(cancel)
    }

    if (runs === attemps) {
      if (fails) {
        throw fails
      }

      return true
    } else {
      runs += 1
      return false
    }
  }

  const asyncIsFinish: CheckFunction<boolean> = cancel =>
    new Promise<boolean>((resolve, reject) => {
      try {
        resolve(isFinish(cancel))
      } catch (error) {
        reject(error)
      }
    })

  return {
    isFinish,
    asyncIsFinish,
    spy: {
      condition,
      cancel
    }
  }
}

describe('poll', () => {
  it('should be resolved', async () => {
    const job = longJob(3)
    const result = await poll({ check: job.isFinish, interval: 20 })

    expect(result).toBeTruthy()
    expect(job.spy.condition).toHaveBeenCalledTimes(3)
    expect(job.spy.cancel).not.toHaveBeenCalled()
  })

  it('should be able to cancel polling async', async () => {
    const job = longJob(3)
    const ctrl = new CancelController()

    ctrl.cancel()

    await expectAsync(
      poll({ check: job.isFinish, interval: 20, cancel: ctrl })
    ).toBeRejectedWithError(UploadClientError, 'Poll canceled')

    expect(job.spy.condition).not.toHaveBeenCalled()
    expect(job.spy.cancel).not.toHaveBeenCalled()
  })

  it('should not run any logic after cancel', async () => {
    const job = longJob(10)
    const ctrl = new CancelController()

    ctrl.cancel()

    await expectAsync(
      poll({ check: job.isFinish, interval: 20, cancel: ctrl })
    ).toBeRejectedWithError(UploadClientError, 'Poll canceled')

    const conditionCallsCount = job.spy.condition.calls.count()
    const cancelCallsCount = job.spy.cancel.calls.count()

    await delay(50)

    expect(job.spy.condition).toHaveBeenCalledTimes(conditionCallsCount)
    expect(job.spy.cancel).toHaveBeenCalledTimes(cancelCallsCount)
  })

  it('should be able to cancel polling async after first request', async () => {
    const job = longJob(10)
    const ctrl = new CancelController()

    setTimeout(() => {
      ctrl.cancel()
    }, 30)

    await expectAsync(
      poll({ check: job.isFinish, interval: 20, cancel: ctrl })
    ).toBeRejectedWithError(UploadClientError, 'Poll canceled')

    expect(job.spy.condition).toHaveBeenCalledTimes(2)
    expect(job.spy.cancel).toHaveBeenCalledTimes(2)
  })

  it('should fails with timeout error', async () => {
    const job = longJob(30)

    await expectAsync(
      poll({ check: job.isFinish, interval: 40, timeout: 20 })
    ).toBeRejectedWithError(UploadClientError, 'Poll Timeout')
  })

  it('should not run any logic after timeout error', async () => {
    const job = longJob(30)

    await expectAsync(
      poll({ check: job.isFinish, interval: 40, timeout: 20 })
    ).toBeRejectedWithError(UploadClientError, 'Poll Timeout')

    const conditionCallsCount = job.spy.condition.calls.count()

    await delay(50)

    expect(job.spy.condition).toHaveBeenCalledTimes(conditionCallsCount)
  })

  it('should handle errors', async () => {
    const error = new Error('test error')
    const job = longJob(3, error)

    await expectAsync(
      poll({ check: job.isFinish, interval: 20 })
    ).toBeRejectedWith(error)
  })

  it('should work with async test function', async () => {
    const job = longJob(3)
    const result = await poll({ check: job.asyncIsFinish, interval: 20 })

    expect(result).toBeTruthy()
    expect(job.spy.condition).toHaveBeenCalledTimes(3)
  })
})
