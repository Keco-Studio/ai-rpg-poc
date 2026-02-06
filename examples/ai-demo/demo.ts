#!/usr/bin/env tsx
/**
 * AI Orchestration Demo - Interactive CLI
 *
 * Connects the AI Orchestration API to a real Anthropic Claude provider
 * and lets you modify the demo RPG project with natural language.
 *
 * Usage:
 *   ANTHROPIC_API_KEY=sk-ant-... npx tsx demo.ts
 *   ANTHROPIC_API_KEY=sk-ant-... npm run demo
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as readline from 'node:readline';
import { fileURLToPath } from 'node:url';

import {
  proposePatchWithRepair,
  applyPatch,
  validatePatch,
} from '@ai-rpg-maker/shared';
import type { Project, ProposedPatchResult } from '@ai-rpg-maker/shared';

import { createAnthropicProvider } from './anthropic-provider.js';

// ---------------------------------------------------------------------------
// Resolve paths
// ---------------------------------------------------------------------------

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEMO_PROJECT_PATH = path.resolve(
  __dirname,
  '..',
  'demo-project',
  'project.json',
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function loadProject(filePath: string): Project {
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw) as Project;
}

function saveProject(filePath: string, project: Project): void {
  fs.writeFileSync(filePath, JSON.stringify(project, null, 2) + '\n', 'utf-8');
}

function ask(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => rl.question(question, resolve));
}

// ---------------------------------------------------------------------------
// Pretty-print helpers
// ---------------------------------------------------------------------------

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const MAGENTA = '\x1b[35m';

function banner(): void {
  console.log();
  console.log(`${BOLD}${CYAN}╔══════════════════════════════════════════════╗${RESET}`);
  console.log(`${BOLD}${CYAN}║     AI RPG Maker — Orchestration Demo        ║${RESET}`);
  console.log(`${BOLD}${CYAN}╚══════════════════════════════════════════════╝${RESET}`);
  console.log();
}

function printResult(result: ProposedPatchResult): void {
  console.log();
  const statusColor =
    result.status === 'success'
      ? GREEN
      : result.status === 'provider_error'
        ? RED
        : YELLOW;

  console.log(`${BOLD}Status:${RESET} ${statusColor}${result.status}${RESET}`);
  console.log(`${BOLD}Message:${RESET} ${result.message}`);

  if (result.repairAttempts > 0) {
    console.log(
      `${DIM}Repair attempts: ${result.repairAttempts}${RESET}`,
    );
  }

  if (result.warnings.length > 0) {
    console.log(`${YELLOW}Warnings:${RESET}`);
    for (const w of result.warnings) {
      console.log(`  ${YELLOW}⚠${RESET}  ${w}`);
    }
  }

  if (result.errors && result.errors.length > 0) {
    console.log(`${RED}Errors:${RESET}`);
    for (const e of result.errors) {
      console.log(`  ${RED}✗${RESET}  [${e.operationType}] ${e.message}`);
    }
  }

  if (result.summary) {
    console.log(`${BOLD}Patch Summary:${RESET}`);
    const { created, modified, deleted } = result.summary;
    const sections = [
      { label: 'Created', data: created, color: GREEN },
      { label: 'Modified', data: modified, color: CYAN },
      { label: 'Deleted', data: deleted, color: RED },
    ];

    for (const { label, data, color } of sections) {
      const items: string[] = [];
      for (const [key, arr] of Object.entries(data)) {
        const a = arr as string[];
        if (a.length > 0) {
          items.push(`${key}: ${a.join(', ')}`);
        }
      }
      if (items.length > 0) {
        console.log(`  ${color}${label}:${RESET} ${items.join(' | ')}`);
      }
    }
  }

  if (result.patch) {
    console.log(
      `${DIM}Patch: ${result.patch.ops.length} operation(s), id=${result.patch.patchId}${RESET}`,
    );
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  banner();

  // --- API key ---
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error(
      `${RED}Error:${RESET} ANTHROPIC_API_KEY environment variable is not set.\n` +
        `Run with: ${CYAN}ANTHROPIC_API_KEY=sk-ant-... npm run demo${RESET}`,
    );
    process.exit(1);
  }

  const model = process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-20250514';
  const provider = createAnthropicProvider(apiKey, model);
  console.log(`${DIM}Provider: ${provider.name} (${provider.modelId})${RESET}`);

  // --- Load project ---
  const outputPath = path.resolve(__dirname, 'project-output.json');
  let projectPath = DEMO_PROJECT_PATH;

  // Resume from previous output if it exists
  if (fs.existsSync(outputPath)) {
    console.log(
      `${DIM}Resuming from previous output: ${path.basename(outputPath)}${RESET}`,
    );
    projectPath = outputPath;
  }

  let project = loadProject(projectPath);
  console.log(
    `${DIM}Loaded project: "${project.metadata.name}" ` +
      `(${Object.keys(project.maps).length} map(s), ` +
      `${Object.keys(project.entityDefs).length} entity def(s))${RESET}`,
  );

  // --- Interactive loop ---
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log();
  console.log(
    `${MAGENTA}Enter a natural language prompt to modify the project.${RESET}`,
  );
  console.log(
    `${DIM}Type "quit" to exit, "show" to inspect current project, "reset" to reload the original.${RESET}`,
  );

  // eslint-disable-next-line no-constant-condition
  while (true) {
    console.log();
    const userGoal = (await ask(rl, `${BOLD}${CYAN}You ▸${RESET} `)).trim();

    if (!userGoal) continue;

    // --- Commands ---
    if (userGoal.toLowerCase() === 'quit' || userGoal.toLowerCase() === 'exit') {
      console.log(`${DIM}Goodbye!${RESET}`);
      break;
    }

    if (userGoal.toLowerCase() === 'reset') {
      project = loadProject(DEMO_PROJECT_PATH);
      if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
      console.log(`${GREEN}Project reset to original demo.${RESET}`);
      continue;
    }

    if (userGoal.toLowerCase() === 'show') {
      console.log(`${BOLD}Current project state:${RESET}`);
      console.log(`  Name: ${project.metadata.name}`);
      console.log(`  Maps: ${Object.keys(project.maps).join(', ') || '(none)'}`);
      console.log(
        `  Entity Defs: ${Object.keys(project.entityDefs).join(', ') || '(none)'}`,
      );
      console.log(
        `  Dialogues: ${Object.keys(project.dialogues).join(', ') || '(none)'}`,
      );
      console.log(
        `  Quests: ${Object.keys(project.quests ?? {}).join(', ') || '(none)'}`,
      );
      continue;
    }

    // --- Propose patch ---
    console.log(`${DIM}Sending to Claude...${RESET}`);
    const startMs = Date.now();

    const result = await proposePatchWithRepair(project, userGoal, provider, {
      maxRepairAttempts: 2,
      guardrails: {
        maxOps: 100,
        maxTileEdits: 50000,
        allowDestructive: true,
      },
    });

    const elapsed = ((Date.now() - startMs) / 1000).toFixed(1);
    console.log(`${DIM}(${elapsed}s)${RESET}`);

    printResult(result);

    // --- Apply? ---
    if (result.status === 'success' && result.patch) {
      console.log();
      const answer = (
        await ask(rl, `${BOLD}Apply this patch? ${DIM}(y/n)${RESET} `)
      )
        .trim()
        .toLowerCase();

      if (answer === 'y' || answer === 'yes') {
        try {
          const validation = validatePatch(project, result.patch);
          if (!validation.ok) {
            console.log(
              `${RED}Patch failed re-validation (${validation.errors.length} errors). Not applied.${RESET}`,
            );
            continue;
          }

          const applyResult = applyPatch(project, result.patch);
          project = applyResult.project;
          saveProject(outputPath, project);
          console.log(
            `${GREEN}Patch applied and saved to ${path.basename(outputPath)}${RESET}`,
          );
        } catch (err) {
          console.error(`${RED}Failed to apply patch:${RESET}`, err);
        }
      } else {
        console.log(`${DIM}Patch discarded.${RESET}`);
      }
    }
  }

  rl.close();
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
