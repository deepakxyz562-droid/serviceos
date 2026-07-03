import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { resolveWhatsAppConfig } from '@/lib/whatsapp-config';
import { executeWorkflow, type NodeOutput } from '@/lib/workflow-executor';

/**
 * GET - Webhook verification endpoint
 * WhatsApp requires this to verify the webhook during setup
 */
export async function GET(request: NextRequest) {
  try {
    const config = await resolveWhatsAppConfig();
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');

    if (mode === 'subscribe' && token === config.verifyToken) {
      console.log('WhatsApp webhook verified successfully');
      return new NextResponse(challenge, { status: 200 });
    }

    console.warn('WhatsApp webhook verification failed', { mode, token });
    return NextResponse.json(
      { error: 'Verification failed' },
      { status: 403 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Webhook verification error';
    console.error('WhatsApp webhook verification error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST - Receive WhatsApp webhook callbacks
 * Handles:
 * - Message status updates (sent, delivered, read)
 * - Interactive message responses (button clicks, list item selections)
 * - On-select webhook triggers (dynamic list item selection → trigger webhook/workflow)
 * - Native updateJobAssignee action (update job table on selection)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    console.log('WhatsApp webhook callback received:', JSON.stringify(body, null, 2));

    // WhatsApp sends an array of entry objects
    const entries = body.entry || [];

    for (const entry of entries) {
      const changes = entry.changes || [];

      for (const change of changes) {
        const value = change.value;

        // Handle message status updates
        if (value.statuses) {
          for (const status of value.statuses) {
            await handleMessageStatus(status);
          }
        }

        // Handle incoming messages (interactive responses)
        if (value.messages) {
          for (const message of value.messages) {
            await handleIncomingMessage(message);
          }
        }
      }
    }

    // WhatsApp expects a 200 OK response quickly
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Webhook callback error';
    console.error('WhatsApp webhook callback error:', message);
    // Still return 200 to prevent WhatsApp from retrying
    return NextResponse.json({ success: true, warning: message });
  }
}

/**
 * Handle message status updates from WhatsApp
 */
async function handleMessageStatus(status: Record<string, unknown>) {
  try {
    const { id: messageId, status: messageStatus, recipient_id: recipientId } = status as { id: string; status: string; recipient_id: string };

    console.log(`Message ${messageId} status: ${messageStatus} for recipient ${recipientId}`);

    // Find the job associated with this message
    const job = await db.job.findFirst({
      where: { whatsappMessageId: messageId },
    });

    if (!job) {
      console.warn(`No job found for WhatsApp message ID: ${messageId}`);
      return;
    }

    // Map WhatsApp status to our assignment status
    const statusMap: Record<string, string> = {
      sent: 'sent',
      delivered: 'delivered',
      read: 'read',
      failed: 'failed',
    };

    const assignmentStatus = statusMap[messageStatus];
    if (assignmentStatus) {
      await db.job.update({
        where: { id: job.id },
        data: { assignmentStatus },
      });
    }
  } catch (error) {
    console.error('Error handling message status:', error);
  }
}

/**
 * Handle incoming interactive message responses from WhatsApp
 * Supports:
 * 1. List reply (user selected an item from a list)
 * 2. Button reply (user clicked a quick reply button)
 * 3. On-select webhook triggers (configured in WhatsApp node config)
 * 4. Native updateJobAssignee action (update job assignee on selection)
 */
async function handleIncomingMessage(message: Record<string, unknown>) {
  try {
    const { from: senderPhone, interactive, id: messageId, context: messageContext } = message as {
      from: string;
      interactive: Record<string, unknown> | undefined;
      id: string;
      context?: { id?: string; forwarded?: boolean };
    };

    if (!interactive) {
      console.log('Non-interactive message received, ignoring');
      return;
    }

    // ─── Handle list reply (user selected an item from list) ────────────────
    if (interactive.type === 'list_reply') {
      const listReply = interactive.list_reply as Record<string, string> | undefined;
      const selectedId = listReply?.id;       // e.g., "driver_xxxxx" or "dynamic_1"
      const selectedTitle = listReply?.title;  // e.g., "Rahul Kumar"
      const selectedDescription = listReply?.description;

      console.log(`[WhatsApp Callback] List reply: id=${selectedId}, title=${selectedTitle}, from=${senderPhone}`);

      // Check if there's a stored message action for the original message
      const originalMessageId = messageContext?.id;
      if (originalMessageId) {
        await handleOnSelectAction(originalMessageId, {
          selectedId: selectedId || '',
          selectedTitle: selectedTitle || '',
          selectedDescription: selectedDescription || '',
          senderPhone,
          interactiveType: 'list_reply',
        });
      }

      // Legacy: handle driver_ prefixed IDs for job assignment
      if (selectedId?.startsWith('driver_')) {
        await handleDriverSelection(selectedId, senderPhone);
      }
    }

    // ─── Handle button reply (user clicked a quick reply button) ────────────
    if (interactive.type === 'button_reply') {
      const buttonReply = interactive.button_reply as Record<string, string> | undefined;
      const buttonId = buttonReply?.id; // e.g., "accept_jobId" or "reject_jobId"

      console.log(`[WhatsApp Callback] Button reply: id=${buttonId}, from=${senderPhone}`);

      // Check for on-select action
      const originalMessageId = messageContext?.id;
      if (originalMessageId) {
        await handleOnSelectAction(originalMessageId, {
          selectedId: buttonId || '',
          selectedTitle: buttonReply?.title || '',
          selectedDescription: '',
          senderPhone,
          interactiveType: 'button_reply',
        });
      }

      // Legacy: handle accept_/reject_ prefixed button IDs
      if (buttonId?.startsWith('accept_') || buttonId?.startsWith('reject_')) {
        await handleButtonReply(buttonId, senderPhone);
      }
    }
  } catch (error) {
    console.error('Error handling incoming message:', error);
  }
}

/**
 * Handle on-select action: perform native actions, call webhook URL, and/or trigger another workflow
 * when the user selects a list item or clicks a button.
 *
 * Supported action types:
 * - "webhook": Call the configured webhook URL
 * - "workflow": Trigger another FlowForge workflow
 * - "updateJobAssignee": Update the job table with the selected assignee
 *
 * For "updateJobAssignee", the flow is:
 * 1. Perform native updateJobAssignee action (update job table)
 * 2. Then call webhook if a URL is provided (combined actions)
 * 3. Then trigger workflow if a workflowId is provided (combined actions)
 */
async function handleOnSelectAction(
  originalMessageId: string,
  selectionData: {
    selectedId: string;
    selectedTitle: string;
    selectedDescription: string;
    senderPhone: string;
    interactiveType: string;
  },
) {
  try {
    // Look up the stored message action
    const messageAction = await db.whatsAppMessageAction.findUnique({
      where: { whatsappMessageId: originalMessageId },
    });

    if (!messageAction) {
      console.log(`[WhatsApp Callback] No stored action for message ${originalMessageId}`);
      return;
    }

    const nodeConfig = JSON.parse(messageAction.nodeConfigJson || '{}');
    const onSelectAction = nodeConfig.onSelectAction || {};
    const actionType: string = onSelectAction.actionType || 'webhook';

    const payload = {
      event: 'whatsapp_interactive_response',
      interactiveType: selectionData.interactiveType,
      selection: {
        id: selectionData.selectedId,
        title: selectionData.selectedTitle,
        description: selectionData.selectedDescription,
      },
      sender: {
        phone: selectionData.senderPhone,
      },
      originalMessage: {
        whatsappMessageId: originalMessageId,
        workflowId: messageAction.workflowId,
        nodeId: messageAction.nodeId,
        recipientPhone: messageAction.phoneRecipient,
      },
      // Pass resolved context data (e.g., jobId) from the stored onSelectAction
      // so triggered workflows can access dynamic values from the originating workflow
      contextData: onSelectAction.contextData || {},
      timestamp: new Date().toISOString(),
    };

    console.log(`[WhatsApp Callback] On-select action payload:`, JSON.stringify(payload, null, 2));
    console.log(`[WhatsApp Callback] Action type: ${actionType}`);

    // ─── 1. Native updateJobAssignee action ─────────────────────────────────
    if (actionType === 'updateJobAssignee') {
      try {
        // Extract employee ID from selectedId (strip "driver_" prefix if present)
        let employeeId = selectionData.selectedId;
        if (employeeId.startsWith('driver_')) {
          employeeId = employeeId.replace('driver_', '');
        }

        console.log(`[WhatsApp Callback] updateJobAssignee: looking up employee ${employeeId}`);

        // Find the employee by ID
        const employee = await db.employee.findUnique({
          where: { id: employeeId },
        });

        if (!employee) {
          console.warn(`[WhatsApp Callback] updateJobAssignee: Employee not found with ID: ${employeeId}`);
        } else {
          // Find the job - prefer stored job ID from contextData for Two-Step Workflow reliability
          const phoneRecipient = messageAction.phoneRecipient;
          const contextJobId = onSelectAction.contextData?.jobId || nodeConfig.jobId;
          let job;

          if (contextJobId) {
            // Direct lookup by job ID - most reliable for Two-Step Workflows
            // In Two-Step Workflows, the LIST message goes to the admin (not the employee),
            // so matching by phoneRecipient or whatsappMessageId would fail.
            // The jobId is passed via onSelectAction.contextData which was resolved at send time.
            job = await db.job.findUnique({ where: { id: contextJobId } });
            console.log(`[WhatsApp Callback] updateJobAssignee: Found job by contextData.jobId ${contextJobId}`);
          } else {
            // Fallback: find job by WhatsApp message ID or phone recipient
            job = await db.job.findFirst({
              where: {
                OR: [
                  { whatsappMessageId: originalMessageId },
                  {
                    assigneePhone: { contains: phoneRecipient.replace(/[^0-9]/g, '') },
                    assignmentStatus: { in: ['sent', 'delivered', 'read'] as string[] },
                    assigneeId: null,
                  },
                ],
              },
              orderBy: { updatedAt: 'desc' },
            });
          }

          if (!job) {
            console.warn(`[WhatsApp Callback] updateJobAssignee: No matching job found for phone ${phoneRecipient} or message ${originalMessageId}`);
          } else {
            // Update the job with the selected assignee
            await db.job.update({
              where: { id: job.id },
              data: {
                assigneeId: employee.id,
                assigneeName: employee.name,
                assigneePhone: employee.phone,
                status: 'assigned',
                assignmentStatus: 'accepted',
              },
            });

            // Update the employee status to 'busy'
            await db.employee.update({
              where: { id: employee.id },
              data: { status: 'busy' },
            });

            console.log(`[WhatsApp Callback] updateJobAssignee: Job ${job.id} assigned to ${employee.name} (${employee.id})`);

            // TODO: Send WhatsApp notification to the assigned employee informing them of the new assignment.
            // This would complete the Two-Step Workflow flow:
            //   1. Admin receives LIST message with available employees
            //   2. Admin selects an employee (this handler fires)
            //   3. Employee receives a notification about their new job assignment
            // Implementation would use the WhatsApp Business API to send a message
            // to employee.phone with job details (job.title, job.description, etc.).
          }
        }
      } catch (assignError: any) {
        console.error(`[WhatsApp Callback] updateJobAssignee failed: ${assignError.message}`);
      }
    }

    // ─── 2. Call the configured webhook URL (if any) ────────────────────────
    // For actionType "updateJobAssignee", this acts as a combined action
    // (native action is done first above, then webhook is called)
    if (messageAction.onSelectWebhookUrl || onSelectAction.webhookUrl) {
      const webhookUrl = messageAction.onSelectWebhookUrl || onSelectAction.webhookUrl;
      try {
        const webhookResponse = await fetch(webhookUrl, {
          method: onSelectAction.method || 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(10000),
        });

        if (webhookResponse.ok) {
          console.log(`[WhatsApp Callback] Webhook called successfully: ${webhookUrl}`);
        } else {
          console.warn(`[WhatsApp Callback] Webhook returned ${webhookResponse.status}: ${webhookUrl}`);
        }
      } catch (webhookError: any) {
        console.error(`[WhatsApp Callback] Webhook call failed: ${webhookError.message}`);
      }
    }

    // ─── 3. Trigger another FlowForge workflow (if configured) ──────────────
    // For actionType "updateJobAssignee", this also acts as a combined action
    if (messageAction.onSelectWorkflowId || onSelectAction.workflowId) {
      const targetWorkflowId = messageAction.onSelectWorkflowId || onSelectAction.workflowId;
      try {
        const targetWorkflow = await db.workflow.findUnique({
          where: { id: targetWorkflowId },
        });

        if (targetWorkflow) {
          const nodes = JSON.parse(targetWorkflow.nodesJson || '[]');
          const edges = JSON.parse(targetWorkflow.edgesJson || '[]');

          if (nodes.length > 0) {
            // Create execution record
            const execution = await db.execution.create({
              data: {
                workflowId: targetWorkflow.id,
                status: 'running',
                mode: 'trigger',
                startedAt: new Date(),
                dataJson: JSON.stringify({
                  trigger: {
                    type: 'whatsapp_callback',
                    originalMessageId,
                    selectionData: payload,
                  },
                }),
              },
            });

            // Build trigger input from the selection data
            const triggerInput: NodeOutput[] = [{ json: payload }];
            const triggerData = {
              body: payload,
              headers: {},
              queryParams: {},
              method: 'INTERNAL',
            };

            // Execute in background (fire-and-forget)
            executeWorkflow({
              nodes: nodes.map((n: any) => ({
                id: n.id,
                type: n.type || n.data?.nodeType,
                name: n.name || n.data?.nodeType || 'Node',
                data: {
                  nodeType: n.data?.nodeType || n.type,
                  config: n.data?.config || {},
                  disabled: n.data?.disabled || false,
                },
              })),
              edges: edges.map((e: any) => ({
                id: e.id,
                source: e.source,
                target: e.target,
                sourcePort: e.sourcePort || e.sourceHandle,
                targetPort: e.targetPort || e.targetHandle,
              })),
              triggerInput,
              triggerData,
              workflowId: targetWorkflow.id,
            }).then(async (result) => {
              // Save execution results
              const nodeDataRecords = result.nodeResults.map((nr) => ({
                executionId: execution.id,
                nodeName: nr.nodeName,
                nodeId: nr.nodeId,
                inputJson: JSON.stringify(nr.input),
                outputJson: JSON.stringify(nr.output),
                durationMs: nr.durationMs,
                status: nr.status as 'success' | 'error',
                ...(nr.status === 'error' && nr.error
                  ? { errorJson: JSON.stringify({ message: nr.error, nodeType: nr.nodeType }) }
                  : {}),
              }));

              if (nodeDataRecords.length > 0) {
                await db.executionNodeData.createMany({ data: nodeDataRecords });
              }

              await db.execution.update({
                where: { id: execution.id },
                data: {
                  status: result.status,
                  finishedAt: new Date(),
                  durationMs: result.durationMs,
                },
              });

              console.log(`[WhatsApp Callback] Triggered workflow ${targetWorkflow.id}: status=${result.status}`);
            }).catch(async (execError: any) => {
              await db.execution.update({
                where: { id: execution.id },
                data: {
                  status: 'error',
                  finishedAt: new Date(),
                  errorJson: JSON.stringify({ message: execError.message || 'Execution failed' }),
                },
              });
              console.error(`[WhatsApp Callback] Workflow execution failed: ${execError.message}`);
            });
          }
        } else {
          console.warn(`[WhatsApp Callback] Target workflow not found: ${targetWorkflowId}`);
        }
      } catch (workflowError: any) {
        console.error(`[WhatsApp Callback] Failed to trigger workflow: ${workflowError.message}`);
      }
    }
  } catch (error: any) {
    console.error(`[WhatsApp Callback] Error handling on-select action: ${error.message}`);
  }
}

/**
 * Legacy: Handle driver selection from list (driver_ prefixed IDs)
 */
async function handleDriverSelection(selectedId: string, senderPhone: string) {
  try {
    const employeeId = selectedId.replace('driver_', '');

    // Find the job that was sent to this phone number with pending assignment
    const job = await db.job.findFirst({
      where: {
        assignmentStatus: { in: ['sent', 'delivered', 'read'] },
      },
      orderBy: { updatedAt: 'desc' },
    });

    if (!job) {
      console.warn('No pending assignment job found for phone:', senderPhone);
      return;
    }

    // Verify the employee exists and is available
    const employee = await db.employee.findUnique({
      where: { id: employeeId },
    });

    if (!employee) {
      console.warn('Employee not found:', employeeId);
      return;
    }

    // Assign the job to the selected driver
    await db.job.update({
      where: { id: job.id },
      data: {
        assigneeId: employee.id,
        assigneeName: employee.name,
        assigneePhone: employee.phone,
        status: 'assigned',
        assignmentStatus: 'accepted',
      },
    });

    // Mark the employee as busy
    await db.employee.update({
      where: { id: employee.id },
      data: { status: 'busy' },
    });

    console.log(`Job ${job.id} assigned to ${employee.name} (${employee.id})`);
  } catch (error) {
    console.error('Error handling driver selection:', error);
  }
}

/**
 * Legacy: Handle accept/reject button replies
 */
async function handleButtonReply(buttonId: string, senderPhone: string) {
  try {
    if (buttonId.startsWith('accept_')) {
      const jobId = buttonId.replace('accept_', '');
      const job = await db.job.findUnique({ where: { id: jobId } });

      if (job) {
        const cleanPhone = senderPhone.replace(/[^0-9]/g, '');
        const employee = await db.employee.findFirst({
          where: {
            OR: [
              { phone: { contains: cleanPhone } },
              { whatsappId: { contains: cleanPhone } },
            ],
          },
        });

        if (employee) {
          await db.job.update({
            where: { id: jobId },
            data: {
              assigneeId: employee.id,
              assigneeName: employee.name,
              assigneePhone: employee.phone,
              status: 'assigned',
              assignmentStatus: 'accepted',
            },
          });

          await db.employee.update({
            where: { id: employee.id },
            data: { status: 'busy' },
          });

          console.log(`Job ${jobId} accepted by ${employee.name}`);
        }
      }
    } else if (buttonId.startsWith('reject_')) {
      const jobId = buttonId.replace('reject_', '');

      await db.job.update({
        where: { id: jobId },
        data: {
          assignmentStatus: 'rejected',
        },
      });

      console.log(`Job ${jobId} rejected by driver`);
    }
  } catch (error) {
    console.error('Error handling button reply:', error);
  }
}
