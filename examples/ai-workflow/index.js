/**
 * AI Workflow Automation Example
 * 
 * 展示：多步骤 AI 任务编排
 */

const { ProductionRuntime } = require('@toyako/agent-hive');

async function aiWorkflow() {
  console.log('🤖 AI Workflow Automation');
  console.log('='.repeat(50));
  
  const runtime = new ProductionRuntime();
  
  // 定义 AI 工作流
  const task = `
    Analyze customer feedback:
    1. Extract sentiment
    2. Categorize issues
    3. Generate summary report
  `;
  
  console.log('📋 Task:', task.trim());
  console.log('');
  
  const result = await runtime.execute(task);
  
  console.log('✅ Workflow completed!');
  console.log('📊 Result:', result.success ? 'SUCCESS' : 'FAILED');
  console.log('⏱️ Duration:', result.duration, 'ms');
  console.log('📝 Events:', result.events.length);
}

aiWorkflow().catch(console.error);
