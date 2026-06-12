import { spawn } from "node:child_process";
import { printResult, CliError } from "../output";

export const SKILL_REPOSITORY = "https://github.com/LeanZo/agent-skills";
export const SKILL_NAME = "REST-in-peace-CLI";

/**
 * Installs the REST in Peace CLI agent skill into the directory the command
 * was called from, by running:
 *
 *   npx skills add <SKILL_REPOSITORY> --skill <SKILL_NAME>
 *
 * The child process inherits the current working directory, so the skill lands
 * wherever `rip skill` was invoked. Its output is forwarded to stderr so this
 * command's stdout stays pure JSON, consistent with the rest of the CLI.
 */
export async function handleSkill(): Promise<void> {
  const cwd = process.cwd();
  const command = `npx skills add ${SKILL_REPOSITORY} --skill ${SKILL_NAME}`;

  process.stderr.write(`Running: ${command}\n(in ${cwd})\n`);

  return new Promise<void>((resolve, reject) => {
    // shell:true resolves npx/npx.cmd across platforms. All arguments are
    // hardcoded constants, so there is no command-injection surface.
    // stdio: child stdout + stderr -> parent stderr (fd 2); stdin ignored so
    // npx runs non-interactively and our stdout stays reserved for JSON.
    const child = spawn(command, {
      cwd,
      shell: true,
      stdio: ["ignore", 2, 2],
    });

    child.on("error", (err) => {
      const message = `Failed to run "${command}": ${err.message}`;
      process.stderr.write(
        JSON.stringify({ error: message, code: "SPAWN_ERROR" }, null, 2) + "\n",
      );
      reject(new CliError(message, "SPAWN_ERROR"));
    });

    child.on("close", (code) => {
      if (code === 0) {
        printResult({
          installed: true,
          skill: SKILL_NAME,
          repository: SKILL_REPOSITORY,
          location: cwd,
          command,
        });
        resolve();
      } else {
        const message = `Skill install failed: "${command}" exited with code ${code}`;
        process.stderr.write(
          JSON.stringify({ error: message, code: "INSTALL_FAILED" }, null, 2) + "\n",
        );
        reject(new CliError(message, "INSTALL_FAILED"));
      }
    });
  });
}
