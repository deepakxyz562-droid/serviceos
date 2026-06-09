import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json();
    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    let zai: any = null;
    try {
      const ZAI = (await import('z-ai-web-dev-sdk')).default;
      zai = await ZAI.create();
    } catch {
      return NextResponse.json({ 
        error: 'AI SDK not configured. Set ZAI_API_KEY environment variable to enable AI features.' 
      }, { status: 503 });
    }

    const systemPrompt = `You are a workflow automation expert. Generate a workflow JSON based on the user's description. 
    
Return ONLY a valid JSON object with this structure (no markdown, no explanation, no code fences):
{
  "name": "Workflow Name",
  "nodes": [
    {
      "id": "nodeType_timestamp",
      "type": "nodeType",
      "name": "Display Name",
      "position": { "x": number, "y": number },
      "data": {
        "nodeType": "nodeType",
        "config": {}
      }
    }
  ],
  "edges": [
    {
      "id": "edge_source_target_timestamp",
      "source": "sourceNodeId",
      "target": "targetNodeId",
      "sourcePort": "main",
      "targetPort": "main",
      "animated": true
    }
  ]
}

Available node types (use the type field for both type and data.nodeType):
- Triggers: manualTrigger, webhookTrigger, scheduleTrigger, emailTrigger, rssTrigger
- Logic: ifNode (outputs: true/false), switchNode, mergeNode, splitInBatches, waitNode, setError, setNode, filterNode, sortNode, limitNode, removeDuplicates, aggregateNode, dateTimeNode, cryptoNode
- Code: javascriptCode, pythonCode, expressionEvaluator
- Actions: httpRequest, graphqlRequest, webhookResponse
- Data: postgresNode, mysqlNode, mongoNode, redisNode, airtableNode, googleSheetsNode, notionNode
- Communication: emailSend, slackNode, discordNode, telegramNode, twilioNode, gmailNode
- Cloud: awsS3Node, googleDriveNode, githubNode
- AI: openaiNode, anthropicNode, huggingFaceNode, vectorStoreNode, textSplitterNode
- Utility: readFile, writeFile, pdfGenerator, screenshotNode, qrCodeNode, htmlExtract, jsonConvert, compressionNode, imageResize

Position nodes with spacing of ~300px horizontally and ~150px vertically. First node starts at (100, 200).`;

    const result = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Create a workflow for: ${prompt}` },
      ],
    });

    // Parse the response with improved JSON extraction
    let workflowJson;
    try {
      const content = result.choices?.[0]?.message?.content || '';
      // Remove code fences if present
      const cleaned = content.replace(/```json?\s*/g, '').replace(/```\s*/g, '').trim();
      // Try direct parse first
      try {
        workflowJson = JSON.parse(cleaned);
      } catch {
        // Find the outermost balanced braces
        let depth = 0;
        let start = -1;
        for (let i = 0; i < cleaned.length; i++) {
          if (cleaned[i] === '{') {
            if (depth === 0) start = i;
            depth++;
          } else if (cleaned[i] === '}') {
            depth--;
            if (depth === 0 && start !== -1) {
              const candidate = cleaned.slice(start, i + 1);
              try {
                workflowJson = JSON.parse(candidate);
                break;
              } catch {
                // Continue searching for next balanced pair
              }
            }
          }
        }
      }
    } catch {
      // If parsing fails, create a basic workflow
      workflowJson = null;
    }

    // Fallback if parsing completely failed
    if (!workflowJson) {
      workflowJson = {
        name: `AI Generated: ${prompt.slice(0, 50)}`,
        nodes: [
          {
            id: `manualTrigger_${Date.now()}`,
            type: 'manualTrigger',
            name: 'Manual Trigger',
            position: { x: 100, y: 200 },
            data: { nodeType: 'manualTrigger', config: {} },
          },
        ],
        edges: [],
      };
    }

    return NextResponse.json({ workflow: workflowJson });
  } catch (error: unknown) {
    console.error('AI workflow generation error:', error);
    const message = error instanceof Error ? error.message : 'Failed to generate workflow';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
