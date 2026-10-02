import axios from 'axios';
import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

export interface TestCaseInput {
  input: string;
  isHidden?: boolean;
}

export interface ExecutionResult {
  stdout: string;
  stderr: string;
  compileOutput?: string | null;
  statusId: number; // 3 = Accepted
  statusDescription: string;
  timeMs?: number;
  memoryKb?: number;
}

export const LanguageMap: Record<number, { name: string; localCmd: string }> = {
  71: { name: 'Python 3', localCmd: 'python' },
  63: { name: 'JavaScript (Node.js)', localCmd: 'node' },
  54: { name: 'C++ (GCC)', localCmd: 'g++' },
  62: { name: 'Java (OpenJDK)', localCmd: 'java' },
};

export class Judge0Service {
  private static getJudge0Config() {
    const url = process.env.JUDGE0_URL || 'http://localhost:2358';
    const apiKey = process.env.JUDGE0_API_KEY || '';
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (apiKey) {
      headers['X-Auth-Token'] = apiKey;
      headers['X-RapidAPI-Key'] = apiKey;
    }
    return { url, headers };
  }

  /**
   * Diagnostic health check for AWS or local Judge0 CE instance
   */
  static async checkHealth(): Promise<{ online: boolean; url: string; details?: any; error?: string }> {
    const { url, headers } = this.getJudge0Config();
    try {
      const res = await axios.get(`${url}/about`, { headers, timeout: 3500 });
      return { online: true, url, details: res.data };
    } catch (err: any) {
      return {
        online: false,
        url,
        error: err.message || 'Could not connect to Judge0 instance',
      };
    }
  }

  /**
   * Runs single execution through Judge0 CE API, with fallback to local runtime if offline
   */
  static async runSingle(
    sourceCode: string,
    languageId: number,
    stdin: string,
    timeLimitMs = 2000
  ): Promise<ExecutionResult> {
    const { url, headers } = this.getJudge0Config();

    try {
      // 1. Attempt AWS / Remote Judge0 execution
      const cpuTimeLimit = Math.max(1, Math.min(10, Math.ceil(timeLimitMs / 1000)));
      const res = await axios.post(
        `${url}/submissions?wait=true`,
        {
          source_code: sourceCode,
          language_id: languageId,
          stdin: stdin || '',
          cpu_time_limit: cpuTimeLimit,
        },
        { headers, timeout: Math.max(5000, timeLimitMs + 3000) }
      );

      const data = res.data;
      const stdout = data.stdout ? data.stdout.trimEnd() : '';
      const stderr = data.stderr ? data.stderr.trimEnd() : '';
      const compileOutput = data.compile_output ? data.compile_output.trimEnd() : null;

      return {
        stdout,
        stderr,
        compileOutput,
        statusId: data.status?.id || (stderr ? 11 : 3),
        statusDescription: data.status?.description || 'Executed',
        timeMs: data.time ? Math.round(parseFloat(data.time) * 1000) : undefined,
        memoryKb: data.memory || undefined,
      };
    } catch (remoteErr: any) {
      // 2. If Judge0 is offline/unreachable, gracefully execute via local runtime
      console.warn(`[Judge0Service] Remote Judge0 at ${url} unreachable (${remoteErr.message}). Falling back to local runtime.`);
      return this.runLocal(sourceCode, languageId, stdin, timeLimitMs);
    }
  }

  /**
   * Fallback runner using local python/node if AWS Judge0 container is not reachable
   */
  private static runLocal(
    sourceCode: string,
    languageId: number,
    stdin: string,
    timeLimitMs: number
  ): ExecutionResult {
    try {
      if (languageId === 71) {
        // Python 3
        const proc = spawnSync('python', ['-c', sourceCode], {
          input: stdin || '',
          timeout: timeLimitMs,
          encoding: 'utf-8',
        });

        if (proc.error && (proc.error as any).code === 'ETIMEDOUT') {
          return {
            stdout: '',
            stderr: 'Time Limit Exceeded',
            statusId: 5,
            statusDescription: 'Time Limit Exceeded (Local)',
          };
        }

        const stdout = (proc.stdout || '').trimEnd();
        const stderr = (proc.stderr || '').trimEnd();
        const isError = proc.status !== 0 || Boolean(proc.error);

        return {
          stdout,
          stderr,
          statusId: isError ? 11 : 3,
          statusDescription: isError ? (stderr || 'Runtime Error (Local Python)') : 'Accepted (Local Python)',
        };
      } else if (languageId === 63) {
        // JavaScript / Node.js
        const proc = spawnSync('node', ['-e', sourceCode], {
          input: stdin || '',
          timeout: timeLimitMs,
          encoding: 'utf-8',
        });

        if (proc.error && (proc.error as any).code === 'ETIMEDOUT') {
          return {
            stdout: '',
            stderr: 'Time Limit Exceeded',
            statusId: 5,
            statusDescription: 'Time Limit Exceeded (Local)',
          };
        }

        const stdout = (proc.stdout || '').trimEnd();
        const stderr = (proc.stderr || '').trimEnd();
        const isError = proc.status !== 0 || Boolean(proc.error);

        return {
          stdout,
          stderr,
          statusId: isError ? 11 : 3,
          statusDescription: isError ? (stderr || 'Runtime Error (Local Node)') : 'Accepted (Local Node)',
        };
      } else if (languageId === 54) {
        // C++ (GCC)
        const gppBinDir = 'C:\\msys64\\ucrt64\\bin';
        const gppPath = fs.existsSync(path.join(gppBinDir, 'g++.exe'))
          ? path.join(gppBinDir, 'g++.exe')
          : 'g++';
        const env = { ...process.env, PATH: gppBinDir + ';' + (process.env.PATH || '') };

        const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hsw-cpp-'));
        const srcPath = path.join(tmpDir, 'solution.cpp');
        const exePath = path.join(tmpDir, 'solution.exe');

        try {
          fs.writeFileSync(srcPath, sourceCode);
          const comp = spawnSync(gppPath, [srcPath, '-static', '-o', exePath], {
            env,
            cwd: tmpDir,
            encoding: 'utf-8',
            timeout: 5000,
            windowsHide: true,
          });
          if (comp.status !== 0) {
            return {
              stdout: '',
              stderr: comp.stderr || 'Compilation error',
              compileOutput: comp.stderr || 'Compilation error',
              statusId: 6,
              statusDescription: 'Compilation Error (Local GCC)',
            };
          }

          let proc = spawnSync(exePath, [], {
            env,
            cwd: tmpDir,
            input: stdin || '',
            timeout: Math.max(3000, timeLimitMs),
            windowsHide: true,
            encoding: 'utf-8',
          });

          // Transient Windows Defender file lock retry
          if (proc.error && (proc.error as any).code === 'UNKNOWN') {
            const start = Date.now();
            while (Date.now() - start < 50) {}
            proc = spawnSync(exePath, [], {
              env,
              cwd: tmpDir,
              input: stdin || '',
              timeout: Math.max(3000, timeLimitMs),
              windowsHide: true,
              encoding: 'utf-8',
            });
          }

          if (proc.error && (proc.error as any).code === 'ETIMEDOUT') {
            return {
              stdout: '',
              stderr: 'Time Limit Exceeded',
              statusId: 5,
              statusDescription: 'Time Limit Exceeded (Local C++)',
            };
          }

          const stdout = (proc.stdout || '').trimEnd();
          const stderr = (proc.stderr || '').trimEnd();
          const isError = proc.status !== 0 || Boolean(proc.error);

          return {
            stdout,
            stderr,
            statusId: isError ? 11 : 3,
            statusDescription: isError ? (stderr || 'Runtime Error (Local C++)') : 'Accepted (Local C++)',
          };
        } finally {
          try {
            fs.rmSync(tmpDir, { recursive: true, force: true });
          } catch {}
        }
      } else if (languageId === 62) {
        // Java (OpenJDK)
        const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hsw-java-'));
        const srcPath = path.join(tmpDir, 'Main.java');

        try {
          let adjustedCode = sourceCode;
          if (!adjustedCode.includes('class Main')) {
            adjustedCode = adjustedCode.replace(/public\s+class\s+([A-Za-z0-9_]+)/, 'public class Main');
          }
          fs.writeFileSync(srcPath, adjustedCode);

          const comp = spawnSync('javac', [srcPath], { encoding: 'utf-8', timeout: 6000 });
          if (comp.status !== 0) {
            return {
              stdout: '',
              stderr: comp.stderr || 'Java compilation error',
              compileOutput: comp.stderr || 'Java compilation error',
              statusId: 6,
              statusDescription: 'Compilation Error (Local javac)',
            };
          }

          const proc = spawnSync('java', ['-cp', tmpDir, 'Main'], {
            input: stdin || '',
            timeout: Math.max(3000, timeLimitMs),
            encoding: 'utf-8',
          });

          if (proc.error && (proc.error as any).code === 'ETIMEDOUT') {
            return {
              stdout: '',
              stderr: 'Time Limit Exceeded',
              statusId: 5,
              statusDescription: 'Time Limit Exceeded (Local Java)',
            };
          }

          const stdout = (proc.stdout || '').trimEnd();
          const stderr = (proc.stderr || '').trimEnd();
          const isError = proc.status !== 0 || Boolean(proc.error);

          return {
            stdout,
            stderr,
            statusId: isError ? 11 : 3,
            statusDescription: isError ? (stderr || 'Runtime Error (Local Java)') : 'Accepted (Local Java)',
          };
        } finally {
          try {
            fs.rmSync(tmpDir, { recursive: true, force: true });
          } catch {}
        }
      } else {
        return {
          stdout: '',
          stderr: `Language ID ${languageId} requires an active Judge0 instance.`,
          statusId: 13,
          statusDescription: 'Internal Error',
        };
      }
    } catch (err: any) {
      return {
        stdout: '',
        stderr: err.message || 'Execution error',
        statusId: 13,
        statusDescription: 'Internal Error',
      };
    }
  }

  /**
   * Executes a reference solution across multiple test cases and automatically generates the expected outputs
   */
  static async generateTestcaseOutputs(
    sourceCode: string,
    languageId: number,
    testCases: TestCaseInput[],
    timeLimitMs = 2000
  ): Promise<Array<{ input: string; expectedOutput: string; isHidden: boolean; error?: string }>> {
    const results: Array<{ input: string; expectedOutput: string; isHidden: boolean; error?: string }> = [];

    for (const tc of testCases) {
      const exec = await this.runSingle(sourceCode, languageId, tc.input, timeLimitMs);
      if (exec.stderr && !exec.stdout) {
        results.push({
          input: tc.input,
          expectedOutput: '',
          isHidden: Boolean(tc.isHidden),
          error: exec.stderr,
        });
      } else {
        results.push({
          input: tc.input,
          expectedOutput: exec.stdout,
          isHidden: Boolean(tc.isHidden),
        });
      }
    }

    return results;
  }
}
