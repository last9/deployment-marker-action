/**
 * GitHub Actions context provider implementation
 */

import * as core from '@actions/core';
import * as github from '@actions/github';
import type { ContextProvider } from '@core/types/provider';
import { InvalidInputError } from '@utils/errors';
import { getLogger } from '@utils/logger';

/**
 * GitHub Actions context provider
 *
 * Provides access to GitHub Actions environment and metadata
 */
export class GitHubContextProvider implements ContextProvider {
  private readonly logger = getLogger();
  private readonly context = github.context;

  /**
   * Get repository information
   */
  getRepository(): { owner: string; repo: string; fullName: string } {
    const { owner, repo } = this.context.repo;

    return {
      owner,
      repo,
      fullName: `${owner}/${repo}`
    };
  }

  /**
   * Get workflow information
   */
  getWorkflow(): {
    name: string;
    runId: number;
    runNumber: number;
    runAttempt: number;
  } {
    return {
      name: this.context.workflow,
      runId: this.context.runId,
      runNumber: this.context.runNumber,
      runAttempt: parseInt(process.env['GITHUB_RUN_ATTEMPT'] || '1', 10)
    };
  }

  /**
   * Get commit information
   */
  getCommit(): {
    sha: string;
    ref: string;
    message: string;
  } {
    return {
      sha: this.context.sha,
      ref: this.context.ref,
      message: this.getCommitMessage()
    };
  }

  /**
   * Get actor information
   */
  getActor(): {
    username: string;
    email?: string;
  } {
    return {
      username: this.context.actor,
      email: process.env['GITHUB_ACTOR_EMAIL']
    };
  }

  /**
   * Get event information
   */
  getEvent(): {
    name: string;
    type: string;
    payload: Record<string, unknown>;
  } {
    return {
      name: this.context.eventName,
      type: this.context.eventName,
      payload: this.context.payload as Record<string, unknown>
    };
  }

  /**
   * Get input value
   */
  getInput(name: string, required = false): string {
    try {
      const value = core.getInput(name, { required });

      if (required && !value) {
        throw new InvalidInputError(`Required input '${name}' is missing`);
      }

      return value;
    } catch (error) {
      if (error instanceof Error) {
        throw new InvalidInputError(`Failed to get input '${name}': ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Set output value
   */
  setOutput(name: string, value: string): void {
    core.setOutput(name, value);
    this.logger.debug(`Set output: ${name}`);
  }

  /**
   * Mark value as secret
   */
  setSecret(value: string): void {
    core.setSecret(value);
  }

  /**
   * Get commit message from context
   */
  private getCommitMessage(): string {
    // Try to get from event payload
    const payload = this.context.payload;

    if (payload['head_commit'] && typeof payload['head_commit'] === 'object') {
      const headCommit = payload['head_commit'] as Record<string, unknown>;
      if (headCommit['message']) {
        return headCommit['message'] as string;
      }
    }

    if (payload['commits'] && Array.isArray(payload['commits']) && payload['commits'].length > 0) {
      const firstCommit = payload['commits'][0] as Record<string, unknown>;
      if (firstCommit['message']) {
        return firstCommit['message'] as string;
      }
    }

    // Fallback to environment variable
    return process.env['GITHUB_SHA_SHORT'] || this.context.sha.substring(0, 7);
  }

  /**
   * Get all environment variables
   */
  getEnvironmentVariables(): Record<string, string> {
    const env: Record<string, string> = {};

    for (const [key, value] of Object.entries(process.env)) {
      if (key.startsWith('GITHUB_') || key.startsWith('RUNNER_')) {
        env[key] = value || '';
      }
    }

    return env;
  }
}
