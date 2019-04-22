import poll from '../../src/tools/poll'
import {InfoResponse} from '../../src/api/info'
import info from '../../src/api/info'
import {Environment, getSettingsForTesting} from '../_helpers'
import * as factory from '../_fixtureFactory'

const environment = Environment.Testing

describe('poll', () => {
  const uuid = factory.uuid('image')
  const settings = getSettingsForTesting({
    publicKey: factory.publicKey('image'),
  }, environment)
  const timeout = 50
  const interval = 150
  const onProgress = (response) => {
    return response
  }

  it('should be resolved', async() => {
    const result = await poll<InfoResponse>(
      async () => {
        const response = await info(uuid, settings)

        if (response.is_ready) {
          return response
        }

        if (typeof onProgress === 'function') {
          onProgress(response)
        }

        return false
      },
      timeout,
      interval,
    )

    expect(result.is_ready).toBeTruthy()
  })

  it('should be able to cancel polling', (done) => {
    const polling = poll<InfoResponse>(
      async() => {
        const response = await info(uuid, settings)

        if (response.is_ready) {
          return response
        }

        if (typeof onProgress === 'function') {
          onProgress(response)
        }

        return false
      },
      timeout,
      interval,
    )

    setTimeout(() => {
      polling.cancel()
    }, 50)

    polling
      .then(() => done.fail())
      .catch((error) => error.name === 'CancelError' ? done() : done.fail(error))
  })
})
