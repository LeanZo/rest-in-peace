import { spawn } from "node:child_process";
import { CliError } from "../output";

export const SKILL_REPOSITORY = "https://github.com/LeanZo/agent-skills";
export const SKILL_NAME = "REST-in-peace-CLI";

/**
 * Installs the REST in Peace CLI agent skill into the directory the command was
 * called from, by running:
 *
 *   npx skills add <SKILL_REPOSITORY> --skill <SKILL_NAME> [...passthrough]
 *
 * The installer (`skills`) is interactive — it prompts you to choose which
 * agents to install to — so we inherit the full terminal (stdin/stdout/stderr)
 * and let it own the console. This makes `rip skill` behave exactly like running
 * the npx command directly. Extra arguments are forwarded verbatim, so you can
 * pass the installer's own flags, e.g. `rip skill --yes` or `rip skill -g`, to
 * install without prompts.
 *
 * The child inherits the current working directory, so the skill lands wherever
 * `rip skill` was invoked. rip exits with the installer's exit code.
 */
export async function handleSkill(passthrough: string[] = []): Promise<void> {
  const cwd = process.cwd();
  const extra = passthrough.length > 0 ? " " + passthrough.join(" ") : "";
  const command = `npx skills add ${SKILL_REPOSITORY} --skill ${SKILL_NAME}${extra}`;

  process.stderr.write(`Running: ${command}\n(in ${cwd})\n\n`);

  return new Promise<void>((resolve, reject) => {
    // shell:true resolves npx/npx.cmd across platforms. The repo URL and skill
    // name are hardcoded constants; passthrough comes from the user's own
    // command line, so there is no additional injection surface beyond what they
    // already control. stdio:"inherit" gives the installer the real terminal so
    // its interactive prompts work.
    const child = spawn(command, {
      cwd,
      shell: true,
      stdio: "inherit",
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
        resolve();
      } else {
        // The installer already reported the failure to the terminal; propagate
        // a non-zero exit without adding noise.
        reject(
          new CliError(
            `Skill install exited with code ${code}`,
            "INSTALL_FAILED",
          ),
        );
      }
    });
  });
}
