import { describe, it, expect, afterEach, beforeEach } from "vitest";
import {
  createTestStorage,
  cleanupFile,
  makeCollection,
  makeEnvironment,
  makeVariable,
  seedStorage,
} from "./helpers";
import { handleEnvironment } from "../../../cli/commands/environment";
import type { ParsedArgs } from "../../../cli/main";
import { startCapture, endCapture } from "../../../cli/output";

const paths: string[] = [];

beforeEach(() => {
  startCapture();
});

afterEach(() => {
  endCapture();
  for (const p of paths) cleanupFile(p);
  paths.length = 0;
});

function baseParsed(overrides?: Partial<ParsedArgs>): ParsedArgs {
  return { command: "", args: [], flags: {}, showSecrets: false, dataFile: null, ...overrides };
}
function parseOutput(): any { return JSON.parse(endCapture()); }

describe("environment list", () => {
  it("lists environments for a collection", async () => {
    const coll = makeCollection();
    const env = makeEnvironment(coll.id, {
      name: "Production",
      variables: [makeVariable()],
    });
    const { data, filePath } = createTestStorage(
      seedStorage({ collections: [coll], environments: [env] }),
    );
    paths.push(filePath);

    await handleEnvironment(
      "list",
      baseParsed({ flags: { collection: [coll.id] } }),
      data,
    );
    const output = parseOutput();
    expect(output.count).toBe(1);
    expect(output.data[0].name).toBe("Production");
    expect(output.data[0].variableCount).toBe(1);
  });
});

describe("environment get", () => {
  it("masks secret variables by default", async () => {
    const coll = makeCollection();
    const env = makeEnvironment(coll.id, {
      variables: [
        makeVariable({ name: "PUBLIC", isSecret: false }),
        makeVariable({ name: "SECRET", initialValue: "hidden", currentValue: "hidden", isSecret: true }),
      ],
    });
    const { data, filePath } = createTestStorage(
      seedStorage({ environments: [env] }),
    );
    paths.push(filePath);

    await handleEnvironment("get", baseParsed({ args: [env.id] }), data);
    const output = parseOutput();
    const vars = output.data.variables;
    expect(vars[0].initialValue).toBe("value");
    expect(vars[1].initialValue).toBe("*****");
  });

  it("reveals secrets with showSecrets", async () => {
    const coll = makeCollection();
    const env = makeEnvironment(coll.id, {
      variables: [
        makeVariable({ name: "SECRET", initialValue: "real", currentValue: "real", isSecret: true }),
      ],
    });
    const { data, filePath } = createTestStorage(
      seedStorage({ environments: [env] }),
    );
    paths.push(filePath);

    await handleEnvironment(
      "get",
      baseParsed({ args: [env.id], showSecrets: true }),
      data,
    );
    const output = parseOutput();
    expect(output.data.variables[0].initialValue).toBe("real");
  });
});

describe("environment create", () => {
  it("creates an environment", async () => {
    const { data, filePath } = createTestStorage();
    paths.push(filePath);

    const coll = await data.createCollection("API");
    await handleEnvironment(
      "create",
      baseParsed({ flags: { collection: [coll.id], name: ["Staging"] } }),
      data,
    );
    const output = parseOutput();
    expect(output.data.name).toBe("Staging");
    expect(output.data.collectionId).toBe(coll.id);
  });
});

describe("environment update with variables", () => {
  it("sets a variable", async () => {
    const { data, filePath } = createTestStorage();
    paths.push(filePath);

    const coll = await data.createCollection("API");
    const env = await data.createEnvironment(coll.id, "Dev");

    await handleEnvironment(
      "update",
      baseParsed({ args: [env.id], flags: { "set-var": ["API_URL=https://api.dev"] } }),
      data,
    );
    const output = parseOutput();
    expect(output.data.variables).toHaveLength(1);
    expect(output.data.variables[0].name).toBe("API_URL");
  });

  it("sets a secret variable", async () => {
    const { data, filePath } = createTestStorage();
    paths.push(filePath);

    const coll = await data.createCollection("API");
    const env = await data.createEnvironment(coll.id, "Dev");

    await handleEnvironment(
      "update",
      baseParsed({
        args: [env.id],
        flags: { "set-var": ["TOKEN=secret"], secret: ["true"] },
      }),
      data,
    );
    const output = parseOutput();
    expect(output.data.variables[0].isSecret).toBe(true);
    expect(output.data.variables[0].initialValue).toBe("*****");
  });

  it("deletes a variable", async () => {
    const { data, filePath } = createTestStorage();
    paths.push(filePath);

    const coll = await data.createCollection("API");
    const env = await data.createEnvironment(coll.id, "Dev");
    await data.setVariable(env.id, "REMOVE_ME", "val", false);

    await handleEnvironment(
      "update",
      baseParsed({ args: [env.id], flags: { "delete-var": ["REMOVE_ME"] } }),
      data,
    );
    const output = parseOutput();
    expect(output.data.variables).toHaveLength(0);
  });
});

describe("environment delete", () => {
  it("deletes an environment", async () => {
    const { data, filePath } = createTestStorage();
    paths.push(filePath);

    const coll = await data.createCollection("API");
    const env = await data.createEnvironment(coll.id, "Old");

    await handleEnvironment("delete", baseParsed({ args: [env.id] }), data);
    expect(await data.getEnvironment(env.id)).toBeNull();
  });
});

describe("list-variables", () => {
  it("lists variables with masking", async () => {
    const coll = makeCollection();
    const env = makeEnvironment(coll.id, {
      variables: [
        makeVariable({ name: "PUBLIC", initialValue: "pub", currentValue: "pub", isSecret: false }),
        makeVariable({ name: "SECRET", initialValue: "sec", currentValue: "sec", isSecret: true }),
      ],
    });
    const { data, filePath } = createTestStorage(
      seedStorage({ environments: [env] }),
    );
    paths.push(filePath);

    await handleEnvironment(
      "list-variables",
      baseParsed({ flags: { environment: [env.id] } }),
      data,
    );
    const output = parseOutput();
    expect(output.count).toBe(2);
    expect(output.data[0].initialValue).toBe("pub");
    expect(output.data[1].initialValue).toBe("*****");
  });
});
