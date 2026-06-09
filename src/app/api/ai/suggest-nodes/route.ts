import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { currentNodeType, currentNodeConfig, workflowContext } = await request.json();

    let zai: any = null;
    try {
      const ZAI = (await import('z-ai-web-dev-sdk')).default;
      zai = await ZAI.create();
    } catch {
      return NextResponse.json({ 
        error: 'AI SDK not configured. Set ZAI_API_KEY environment variable to enable AI features.' 
      }, { status: 503 });
    }

    const result = await zai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `You are a workflow automation expert. Based on the current node type and workflow context, suggest the 3 most logical next nodes. Return a JSON array of objects with: type, reason. Available node types: manualTrigger, webhookTrigger, scheduleTrigger, ifNode, switchNode, mergeNode, setNode, filterNode, httpRequest, graphqlRequest, javascriptCode, emailSend, slackNode, discordNode, postgresNode, mongoNode, openaiNode, anthropicNode, waitNode, dateTimeNode.`,
        },
        {
          role: 'user',
          content: `Current node: ${currentNodeType}. Config: ${JSON.stringify(currentNodeConfig)}. Context: ${JSON.stringify(workflowContext)}`,
        },
      ],
    });

    let suggestions;
    try {
      const content = result.choices?.[0]?.message?.content || '';
      // Remove code fences
      const cleaned = content.replace(/```json?\s*/g, '').replace(/```\s*/g, '').trim();
      
      try {
        suggestions = JSON.parse(cleaned);
      } catch {
        // Find the outermost balanced brackets
        let depth = 0;
        let start = -1;
        for (let i = 0; i < cleaned.length; i++) {
          if (cleaned[i] === '[') {
            if (depth === 0) start = i;
            depth++;
          } else if (cleaned[i] === ']') {
            depth--;
            if (depth === 0 && start !== -1) {
              const candidate = cleaned.slice(start, i + 1);
              try {
                suggestions = JSON.parse(candidate);
                break;
              } catch {
                // Continue searching
              }
            }
          }
        }
      }
    } catch {
      suggestions = null;
    }

    // Default fallback suggestions
    if (!Array.isArray(suggestions)) {
      suggestions = [
        { type: 'setNode', reason: 'Transform the data' },
        { type: 'ifNode', reason: 'Add conditional logic' },
        { type: 'httpRequest', reason: 'Send data to an API' },
      ];
    }

    return NextResponse.json({ suggestions });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to suggest nodes';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
