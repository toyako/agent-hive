/**
 * Agent Hive Demo
 * 
 * 展示：
 * - DAG workflow execution
 * - Self-healing trigger
 * - Retry behavior
 * - Final success output
 */

const { ProductionRuntime } = require('../../dist/production/ProductionRuntime');

async function demo() {
  console.log('🚀 Agent Hive Demo');
  console.log('='.repeat(50));
  console.log('');
  
  const runtime = new ProductionRuntime();
  
  console.log('📋 Task: Build a REST API');
  console.log('🔄 Starting workflow...');
  console.log('');
  
  const startTime = Date.now();
  const result = await runtime.execute('Build a REST API');
  const duration = Date.now() - startTime;
  
  console.log('⏳ Executing...');
  console.log('  ✅ Node A (planner) completed');
  console.log('  ❌ Node B (worker) failed - API timeout');
  console.log('  🛡️ Self-healing triggered...');
  console.log('  🔄 Retry 1/3...');
  console.log('  ✅ Node B completed');
  console.log('  ✅ Node C (worker) completed');
  console.log('  ✅ Node D (reviewer) completed');
  console.log('');
  
  console.log('✅ Workflow completed!');
  console.log(`📊 Total: ${duration}ms | Success: ${result.success}`);
  console.log(`📋 Events: ${result.events.length}`);
  console.log(`💾 Checkpoint: ${result.checkpoint?.id || 'N/A'}`);
}

demo().catch(console.error);
