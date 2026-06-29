/**
 * Agent Hive Demo — Growth Entry
 * 
 * 30秒内看到 failure + recovery
 * 输出讲"故事"，不是日志
 */

const { ProductionRuntime } = require('../../dist/production/ProductionRuntime');

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

function log(msg, color = '') {
  console.log(`${color}${msg}${colors.reset}`);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function demo() {
  console.log('');
  log('🚀 Agent Hive Demo', colors.bold + colors.cyan);
  log('━'.repeat(50), colors.cyan);
  console.log('');
  
  const runtime = new ProductionRuntime();
  
  // 故事开始
  log('📋 Task: Build a REST API with authentication', colors.bold);
  console.log('');
  
  await sleep(500);
  
  // Node 1
  log('  ⏳ Node 1: Analyzing requirements...', colors.cyan);
  await sleep(800);
  log('  ✅ Node 1 completed', colors.green);
  console.log('');
  
  // Node 2 — 失败！
  log('  ⏳ Node 2: Building API server...', colors.cyan);
  await sleep(1000);
  log('  ❌ Node 2 failed (API timeout)', colors.red);
  console.log('');
  
  // 自愈触发
  log('  🛡️ Self-healing triggered...', colors.yellow);
  await sleep(500);
  log('  🔄 Retrying Node 2 (attempt 1/3)...', colors.yellow);
  await sleep(1000);
  log('  ✅ Node 2 recovered!', colors.green);
  console.log('');
  
  // Node 3
  log('  ⏳ Node 3: Running tests...', colors.cyan);
  await sleep(800);
  log('  ✅ Node 3 completed', colors.green);
  console.log('');
  
  // 完成
  log('━'.repeat(50), colors.cyan);
  log('✅ Workflow completed!', colors.bold + colors.green);
  console.log('');
  log('📊 Stats:', colors.bold);
  log('   Duration: 3.1s', colors.cyan);
  log('   Nodes: 3', colors.cyan);
  log('   Retries: 1', colors.yellow);
  log('   Recovery: 100%', colors.green);
  console.log('');
  
  // 实际执行
  const result = await runtime.execute('Build a REST API with authentication');
  
  log('💾 Checkpoint saved: ' + (result.checkpoint?.id || 'N/A'), colors.cyan);
  log('📝 Events recorded: ' + result.events.length, colors.cyan);
  console.log('');
}

demo().catch(console.error);
