const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { DatabaseSync } = require('node:sqlite');

const WORKFLOW_ID = '3c0ae0d8-d855-41c4-b476-bd91b5028e02';
const WORKFLOW_FILE = path.join(__dirname, '..', 'B2B_Outreach_AI_Agents.json');

// Determine SQLite DB path
const possibleDbPaths = [
  process.env.N8N_DB_PATH,
  '/home/moshimoshi/.n8n/database.sqlite',
  path.join(process.env.HOME || '', '.n8n', 'database.sqlite'),
  path.join(process.env.USERPROFILE || '', '.n8n', 'database.sqlite')
].filter(Boolean);

let dbPath = possibleDbPaths.find(p => fs.existsSync(p));

if (!dbPath) {
  console.error('[Deploy] Could not locate n8n database.sqlite! Checked:', possibleDbPaths);
  process.exit(1);
}

console.log('[Deploy] Using n8n database at:', dbPath);

// Read workflow JSON
if (!fs.existsSync(WORKFLOW_FILE)) {
  console.error('[Deploy] Workflow file not found at:', WORKFLOW_FILE);
  process.exit(1);
}

const workflow = JSON.parse(fs.readFileSync(WORKFLOW_FILE, 'utf8'));

try {
  const db = new DatabaseSync(dbPath);

  // Check if workflow exists
  const existing = db.prepare('SELECT id, name, versionCounter FROM workflow_entity WHERE id = ?').get(WORKFLOW_ID);

  if (existing) {
    // Preserve live production API keys if incoming JSON contains placeholders
    try {
      const existingRow = db.prepare('SELECT nodes FROM workflow_entity WHERE id = ?').get(WORKFLOW_ID);
      if (existingRow && existingRow.nodes) {
        const existingNodes = JSON.parse(existingRow.nodes);
        
        // Find existing config nodes
        const exConfig1 = existingNodes.find(n => n.id === 'config-agent-1');
        const exConfig2 = existingNodes.find(n => n.id === 'config-agent-2');
        
        // Target incoming nodes
        const inConfig1 = workflow.nodes.find(n => n.id === 'config-agent-1');
        const inConfig2 = workflow.nodes.find(n => n.id === 'config-agent-2');

        if (exConfig1 && inConfig1) {
          const exAssignments = exConfig1.parameters?.assignments?.assignments || [];
          const inAssignments = inConfig1.parameters?.assignments?.assignments || [];
          
          for (const item of inAssignments) {
            if (typeof item.value === 'string' && item.value.startsWith('YOUR_')) {
              const matched = exAssignments.find(a => a.name === item.name);
              if (matched && matched.value && !matched.value.startsWith('YOUR_')) {
                item.value = matched.value;
                console.log(`[Deploy] Preserved live secret for: ${item.name}`);
              }
            }
          }
        }

        if (exConfig2 && inConfig2) {
          const exAssignments = exConfig2.parameters?.assignments?.assignments || [];
          const inAssignments = inConfig2.parameters?.assignments?.assignments || [];
          
          for (const item of inAssignments) {
            if (typeof item.value === 'string' && item.value.startsWith('YOUR_')) {
              const matched = exAssignments.find(a => a.name === item.name);
              if (matched && matched.value && !matched.value.startsWith('YOUR_')) {
                item.value = matched.value;
                console.log(`[Deploy] Preserved live secret for: ${item.name}`);
              }
            }
          }
        }
      }
    } catch (preserveErr) {
      console.warn('[Deploy] Could not check existing node keys:', preserveErr.message);
    }

    const nextVersion = (existing.versionCounter || 1) + 1;
    const updateStmt = db.prepare(`
      UPDATE workflow_entity
      SET name = ?,
          nodes = ?,
          connections = ?,
          settings = ?,
          updatedAt = CURRENT_TIMESTAMP,
          versionCounter = ?
      WHERE id = ?
    `);

    updateStmt.run(
      workflow.name,
      JSON.stringify(workflow.nodes),
      JSON.stringify(workflow.connections),
      JSON.stringify(workflow.settings || { executionOrder: "v1" }),
      nextVersion,
      WORKFLOW_ID
    );
    console.log(`[Deploy] Successfully updated existing workflow "${workflow.name}" (ID: ${WORKFLOW_ID}) to version ${nextVersion}!`);
  } else {
    // Insert new workflow
    const insertStmt = db.prepare(`
      INSERT INTO workflow_entity (
        id, name, active, nodes, connections, settings, staticData, pinData,
        versionId, triggerCount, meta, createdAt, updatedAt, isArchived,
        versionCounter, nodeGroups
      ) VALUES (
        ?, ?, 0, ?, ?, ?, null, null,
        lower(hex(randomblob(16))), 1, '{"templateCredsSetupCompleted":false}',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 1, '[]'
      )
    `);

    insertStmt.run(
      WORKFLOW_ID,
      workflow.name,
      JSON.stringify(workflow.nodes),
      JSON.stringify(workflow.connections),
      JSON.stringify(workflow.settings || { executionOrder: "v1" })
    );
    console.log(`[Deploy] Inserted workflow "${workflow.name}" (ID: ${WORKFLOW_ID}) into n8n database.`);
  }

  db.close();

  // Try to reload or restart PM2 if running in PM2 environment
  try {
    console.log('[Deploy] Reloading n8n in PM2...');
    execSync('pm2 reload n8n || pm2 restart n8n', { stdio: 'inherit' });
    console.log('[Deploy] PM2 n8n reload complete!');
  } catch (pm2Err) {
    console.log('[Deploy] Note: PM2 reload command skipped or not running globally.');
  }

  console.log('[Deploy] Deployment completed successfully! 🎉');
} catch (err) {
  console.error('[Deploy] Error during deployment:', err.message);
  process.exit(1);
}
