import axios from 'axios';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SimApiClient } from '../../../src/client/sim-api-client.js';

vi.mock('axios', () => ({
  default: {
    create: vi.fn(),
    isAxiosError: vi.fn(() => false),
  },
}));

describe('SimApiClient deployment version lifecycle requests', () => {
  const request = vi.fn();

  function createClient(): SimApiClient {
    vi.mocked(axios.create).mockReturnValue({
      request,
    } as unknown as ReturnType<typeof axios.create>);

    return new SimApiClient({
      baseUrl: 'https://example.test',
      apiKey: 'test-key',
      retries: 3,
    });
  }

  function createRetryableAxiosError(): Error {
    const error = new Error('server error') as Error & {
      response: { status: number; data: { error: { message: string } } };
    };
    error.response = {
      status: 500,
      data: { error: { message: 'server error' } },
    };
    return error;
  }

  afterEach(() => {
    request.mockReset();
    vi.mocked(axios.create).mockReset();
    vi.mocked(axios.isAxiosError).mockReset();
    vi.mocked(axios.isAxiosError).mockReturnValue(false);
  });

  it('uses the expected lifecycle endpoints', async () => {
    const client = createClient();
    request.mockResolvedValue({ data: { success: true, data: { versions: [] } } });

    await client.listDeploymentVersions('wf-123');
    await client.getDeploymentVersion('wf-123', 3);
    await client.activateDeploymentVersion('wf-123', 3);
    await client.revertWorkflowToDeploymentVersion('wf-123', 3);

    expect(request).toHaveBeenCalledTimes(4);
    expect(request).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        method: 'GET',
        url: '/api/workflows/wf-123/deployments',
      })
    );
    expect(request).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        method: 'GET',
        url: '/api/workflows/wf-123/deployments/3',
      })
    );
    expect(request).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        method: 'PATCH',
        url: '/api/workflows/wf-123/deployments/3',
        data: { isActive: true },
      })
    );
    expect(request).toHaveBeenNthCalledWith(
      4,
      expect.objectContaining({
        method: 'POST',
        url: '/api/workflows/wf-123/deployments/3/revert',
      })
    );
  });

  it('does not retry list deployment versions on retryable errors', async () => {
    const client = createClient();
    vi.mocked(axios.isAxiosError).mockReturnValue(true);
    request.mockRejectedValue(createRetryableAxiosError());

    await expect(client.listDeploymentVersions('wf-123')).rejects.toThrow('server error');
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('does not retry get deployment version on retryable errors', async () => {
    const client = createClient();
    vi.mocked(axios.isAxiosError).mockReturnValue(true);
    request.mockRejectedValue(createRetryableAxiosError());

    await expect(client.getDeploymentVersion('wf-123', 3)).rejects.toThrow('server error');
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('does not retry activate deployment version on retryable errors', async () => {
    const client = createClient();
    vi.mocked(axios.isAxiosError).mockReturnValue(true);
    request.mockRejectedValue(createRetryableAxiosError());

    await expect(client.activateDeploymentVersion('wf-123', 3)).rejects.toThrow('server error');
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('does not retry revert workflow to deployment version on retryable errors', async () => {
    const client = createClient();
    vi.mocked(axios.isAxiosError).mockReturnValue(true);
    request.mockRejectedValue(createRetryableAxiosError());

    await expect(client.revertWorkflowToDeploymentVersion('wf-123', 3)).rejects.toThrow(
      'server error'
    );
    expect(request).toHaveBeenCalledTimes(1);
  });
});
