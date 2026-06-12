import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { EventEmitter } from "node:events";

const { spawnMock } = vi.hoisted(() => ({ spawnMock: vi.fn() }));
vi.mock("node:child_process", () => ({
  spawn: spawnMock,
  default: { spawn: spawnMock },
}));

import { handleSkill, SKILL_NAME, SKILL_REPOSITORY } from "../../../cli/commands/skill";
import { startCapture, endCapture } from "../../../cli/output";

beforeEach(() => {
  startCapture();
  // Silence the human-readable progress/error lines written to stderr.
  vi.spyOn(process.stderr, "write").mockReturnValue(true);
});

afterEach(() => {
  endCapture();
  vi.restoreAllMocks();
  spawnMock.mockReset();
});

function fakeChild(): EventEmitter {
  return new EventEmitter();
}

describe("skill command", () => {
  it("runs `npx skills add` for the right repo and skill in the current directory", async () => {
    const child = fakeChild();
    spawnMock.mockReturnValue(child);

    const promise = handleSkill();
    child.emit("close", 0); // listeners are attached synchronously before this
    await promise;

    expect(spawnMock).toHaveBeenCalledTimes(1);
    const [command, options] = spawnMock.mock.calls[0];
    expect(command).toBe(
      `npx skills add ${SKILL_REPOSITORY} --skill ${SKILL_NAME}`,
    );
    expect(options.cwd).toBe(process.cwd());
    expect(options.shell).toBe(true);
    // child stdout + stderr -> parent stderr; stdin ignored
    expect(options.stdio).toEqual(["ignore", 2, 2]);
  });

  it("returns a JSON success summary on exit code 0", async () => {
    const child = fakeChild();
    spawnMock.mockReturnValue(child);

    const promise = handleSkill();
    child.emit("close", 0);
    await promise;

    const output = JSON.parse(endCapture());
    expect(output.data.installed).toBe(true);
    expect(output.data.skill).toBe(SKILL_NAME);
    expect(output.data.repository).toBe(SKILL_REPOSITORY);
    expect(output.data.location).toBe(process.cwd());
  });

  it("rejects when npx exits with a non-zero code", async () => {
    const child = fakeChild();
    spawnMock.mockReturnValue(child);

    const promise = handleSkill();
    child.emit("close", 1);

    await expect(promise).rejects.toThrow(/exited with code 1/);
  });

  it("rejects when npx cannot be spawned", async () => {
    const child = fakeChild();
    spawnMock.mockReturnValue(child);

    const promise = handleSkill();
    child.emit("error", new Error("ENOENT: npx not found"));

    await expect(promise).rejects.toThrow(/Failed to run/);
  });
});
