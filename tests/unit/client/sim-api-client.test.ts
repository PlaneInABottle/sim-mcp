import axios from 'axios'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SimApiClient } from '../../../src/client/sim-api-client.js'

vi.mock('axios', () => ({
  default: {
    create: vi.fn(),
    isAxiosError: vi.fn(() => false),
  },
}))

describe('SimApiClient deployment version lifecycle requests', () => {
  const request = vi.fn()

  function createClient(): SimApiClient {
    vi.mocked(axios.create).mockReturnValue({
      request,
    } as unknown as ReturnType<typeof axios.create>)

    return new SimApiClient({
      baseUrl: 'https://example.test',
      apiKey: 'test-key',
      retries: 3,
    })
  }

  function createRetryableAxiosError(): Error {
    const error = new Error('server error') as Error & {
      response: { status: number; data: { error: { message: string } } }
    }
    error.response = {
      status: 500,
      data: { error: { message: 'server error' } },
    }
    return error
  }

  afterEach(() => {
    request.mockReset()
    vi.mocked(axios.create).mockReset()
    vi.mocked(axios.isAxiosError).mockReset()
    vi.mocked(axios.isAxiosError).mockReturnValue(false)
  })

  it('uses the expected lifecycle endpoints', async () => {
    const client = createClient()
    request.mockResolvedValue({ data: { success: true, data: { versions: [] } } })

    await client.listDeploymentVersions('wf-123')
    await client.getDeploymentVersion('wf-123', 3)
    await client.activateDeploymentVersion('wf-123', 3)
    await client.revertWorkflowToDeploymentVersion('wf-123', 3)

    expect(request).toHaveBeenCalledTimes(4)
    expect(request).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        method: 'GET',
        url: '/api/workflows/wf-123/deployments',
      })
    )
    expect(request).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        method: 'GET',
        url: '/api/workflows/wf-123/deployments/3',
      })
    )
    expect(request).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        method: 'PATCH',
        url: '/api/workflows/wf-123/deployments/3',
        data: { isActive: true },
      })
    )
    expect(request).toHaveBeenNthCalledWith(
      4,
      expect.objectContaining({
        method: 'POST',
        url: '/api/workflows/wf-123/deployments/3/revert',
      })
    )
  })

  it('does not retry list deployment versions on retryable errors', async () => {
    const client = createClient()
    vi.mocked(axios.isAxiosError).mockReturnValue(true)
    request.mockRejectedValue(createRetryableAxiosError())

    await expect(client.listDeploymentVersions('wf-123')).rejects.toThrow('server error')
    expect(request).toHaveBeenCalledTimes(1)
  })

  it('does not retry get deployment version on retryable errors', async () => {
    const client = createClient()
    vi.mocked(axios.isAxiosError).mockReturnValue(true)
    request.mockRejectedValue(createRetryableAxiosError())

    await expect(client.getDeploymentVersion('wf-123', 3)).rejects.toThrow('server error')
    expect(request).toHaveBeenCalledTimes(1)
  })

  it('does not retry activate deployment version on retryable errors', async () => {
    const client = createClient()
    vi.mocked(axios.isAxiosError).mockReturnValue(true)
    request.mockRejectedValue(createRetryableAxiosError())

    await expect(client.activateDeploymentVersion('wf-123', 3)).rejects.toThrow('server error')
    expect(request).toHaveBeenCalledTimes(1)
  })

  it('does not retry revert workflow to deployment version on retryable errors', async () => {
    const client = createClient()
    vi.mocked(axios.isAxiosError).mockReturnValue(true)
    request.mockRejectedValue(createRetryableAxiosError())

    await expect(client.revertWorkflowToDeploymentVersion('wf-123', 3)).rejects.toThrow(
      'server error'
    )
    expect(request).toHaveBeenCalledTimes(1)
  })

  it('preserves wrapped log detail responses from the v1 logs detail endpoint', async () => {
    const client = createClient()
    request.mockResolvedValue({
      data: {
        data: {
          id: 'log-1',
          workflowId: 'wf-123',
          executionId: 'exec-123',
        },
        limits: { remaining: 42 },
      },
    })

    await expect(client.getLogDetail('log-1')).resolves.toEqual({
      data: {
        id: 'log-1',
        workflowId: 'wf-123',
        executionId: 'exec-123',
      },
      limits: { remaining: 42 },
    })
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'GET', url: '/api/v1/logs/log-1' })
    )
  })

  it('preserves wrapped log list responses from the v1 logs endpoint', async () => {
    const client = createClient()
    request.mockResolvedValue({
      data: {
        data: [{ id: 'log-1' }],
        nextCursor: 'cursor-1',
        limits: { remaining: 42 },
      },
    })

    await expect(client.getLogs({ workspaceId: 'ws-123' })).resolves.toEqual({
      data: [{ id: 'log-1' }],
      nextCursor: 'cursor-1',
      limits: { remaining: 42 },
    })
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'GET',
        url: '/api/v1/logs',
        params: { workspaceId: 'ws-123' },
      })
    )
  })

  it('sends replace workflow state via the state endpoint', async () => {
    const client = createClient()
    const state = {
      blocks: {},
      edges: [],
      loops: {},
      parallels: {},
      variables: {
        'var-1': { id: 'var-1', workflowId: 'wf-123', name: 'foo', type: 'string', value: 'bar' },
      },
      lastSaved: 123,
      isDeployed: false,
    }
    request.mockResolvedValue({ data: { success: true, warnings: ['sanitized'] } })

    await expect(client.replaceWorkflowState('wf-123', state)).resolves.toEqual({
      success: true,
      warnings: ['sanitized'],
    })
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'PUT',
        url: '/api/workflows/wf-123/state',
        data: state,
      })
    )
  })
})
