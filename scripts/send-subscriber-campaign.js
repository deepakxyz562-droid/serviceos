const nodemailer = require("nodemailer");
const https = require("https");

const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc4NzY1NDE2MCwiZXhwIjo0OTQzMzI3NzYwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.TNruQm5CAiIltwMWS3Re0fTd_DX_3dutfrRBAbRL2oc";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "email-smtp.ap-south-1.amazonaws.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: false,
  auth: {
    user: process.env.SMTP_USER || "AKIA2PPO3JNBYFJO4G5O",
    pass: process.env.SMTP_PASS || "BInFKprST5upb+sYW5/U4dPAW7n3BZirdZL2FXFWNdPE",
  }
});

function renderHtml(businessName, email) {
  const unsubscribeUrl = `https://fieseros.com/unsubscribe?email=${encodeURIComponent(email)}`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>What if you could create a complete job in Fieseros just by telling it what you need?</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 0; width: 100%; -webkit-text-size-adjust: none;">
  <div style="display: none; max-height: 0; overflow: hidden; font-size: 1px; line-height: 1px; color: #f1f5f9;">
    “AC repair for Sarah at 240 Main St, tomorrow at 2pm, $250, assign to Mike.” Fieseros AI creates the job in seconds.
  </div>
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f1f5f9; padding: 32px 12px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(15, 23, 42, 0.07), 0 1px 3px rgba(15, 23, 42, 0.04); border: 1px solid #e2e8f0; max-width: 600px; width: 100%;">
          <tr>
            <td style="background: linear-gradient(90deg, #0f766e 0%, #10b981 100%); height: 6px; line-height: 6px; font-size: 6px;">&nbsp;</td>
          </tr>
          <tr>
            <td style="padding: 28px 36px 20px 36px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="vertical-align: middle;">
                          <div style="width: 32px; height: 32px; background: linear-gradient(135deg, #10b981 0%, #0f766e 100%); border-radius: 8px; text-align: center; line-height: 32px; color: #ffffff; font-weight: 800; font-size: 16px;">
                            F
                          </div>
                        </td>
                        <td style="padding-left: 10px; vertical-align: middle;">
                          <span style="font-size: 19px; font-weight: 800; color: #0f172a; letter-spacing: -0.4px;">
                            FIESEROS
                          </span>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td align="right" style="vertical-align: middle;">
                    <span style="display: inline-block; background-color: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; font-size: 11px; font-weight: 700; padding: 4px 12px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.5px;">
                      ✨ FIESEROS AI UPDATE
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 36px;">
              <div style="height: 1px; background-color: #f1f5f9; width: 100%;"></div>
            </td>
          </tr>
          <tr>
            <td style="padding: 28px 36px 36px 36px; font-size: 14px; line-height: 1.65; color: #334155;">
              <div style="font-size: 16px; font-weight: 700; color: #0f172a; margin-bottom: 16px;">
                Hi ${businessName} Team,
              </div>
              <p style="margin: 0 0 16px 0; font-size: 15px; color: #0f172a; font-weight: 600; line-height: 1.5;">
                What if you could create a complete job in Fieseros just by telling it what you need?
              </p>
              <p style="margin: 0 0 14px 0; color: #475569;">
                Instead of filling out forms, searching for customers, scheduling technicians, and writing quotes manually, simply type or speak:
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f0fdf4; border-left: 4px solid #10b981; border-radius: 8px; margin: 18px 0;">
                <tr>
                  <td style="padding: 14px 18px; font-size: 14px; font-weight: 600; color: #166534; font-style: italic; line-height: 1.5;">
                    “AC repair for Sarah at 240 Main St, tomorrow at 2pm, $250, assign to Mike.”
                  </td>
                </tr>
              </table>
              <p style="margin: 0 0 20px 0; color: #334155;">
                Fieseros AI turns that instruction into a real job — <strong>customer, schedule, price, technician and work order</strong> — in seconds.
              </p>
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 24px 0;">
                <div style="font-size: 13px; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 14px;">
                  Your team can now use AI to:
                </div>
                <table width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="vertical-align: top; padding-bottom: 14px;">
                      <div style="font-size: 14px; font-weight: 700; color: #0f172a;">
                        ✨ Create jobs instantly
                      </div>
                      <div style="font-size: 13px; color: #64748b; margin-top: 2px;">
                        Turn a simple sentence or voice instruction into a scheduled, assigned job.
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td style="vertical-align: top; padding-bottom: 14px;">
                      <div style="font-size: 14px; font-weight: 700; color: #0f172a;">
                        ⚡ Create professional quotes faster
                      </div>
                      <div style="font-size: 13px; color: #64748b; margin-top: 2px;">
                        Give Fieseros your rough job notes and AI can turn them into an itemized customer-ready proposal.
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td style="vertical-align: top; padding-bottom: 14px;">
                      <div style="font-size: 14px; font-weight: 700; color: #0f172a;">
                        📞 Answer calls 24/7
                      </div>
                      <div style="font-size: 13px; color: #64748b; margin-top: 2px;">
                        Our AI Receptionist can handle inbound calls, answer common questions and help schedule appointments while your team is busy.
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td style="vertical-align: top;">
                      <div style="font-size: 14px; font-weight: 700; color: #0f172a;">
                        🛠️ Access free contractor tools
                      </div>
                      <div style="font-size: 13px; color: #64748b; margin-top: 2px;">
                        Use calculators, estimators and invoice tools to make everyday work easier.
                      </div>
                    </td>
                  </tr>
                </table>
              </div>
              <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 700; color: #0f172a;">
                The result?
              </p>
              <ul style="margin: 0 0 20px 0; padding-left: 20px; color: #475569; font-size: 13px; line-height: 1.7;">
                <li>Less time spent on admin.</li>
                <li>Faster response to customers.</li>
                <li>More time for your team to get the actual work done.</li>
              </ul>
              <p style="margin: 0 0 24px 0; color: #334155;">
                And you don't need to learn another complicated system.<br>
                <strong>Just tell Fieseros what you want to do.</strong>
              </p>
              <div style="text-align: center; margin: 30px 0 28px 0;">
                <a href="https://fieseros.com/login" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); background-color: #10b981; color: #ffffff; padding: 14px 36px; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 15px; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.35); letter-spacing: 0.2px;">
                  Try Fieseros AI &rarr;
                </a>
              </div>
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 16px; margin-bottom: 24px;">
                <div style="font-size: 13px; font-weight: 700; color: #0f172a; margin-bottom: 4px;">
                  Already using Fieseros?
                </div>
                <div style="font-size: 13px; color: #475569; line-height: 1.5;">
                  Reply to this email and I'll personally help you set up your first AI workflow for <strong>${businessName}</strong>.
                </div>
              </div>
              <p style="margin: 0 0 24px 0; font-size: 14px; font-weight: 600; color: #0f172a;">
                Give it one real job. See how much work AI can take off your plate.
              </p>
              <div style="padding-top: 12px; font-size: 14px; color: #475569; line-height: 1.6;">
                Warm regards,<br>
                <strong style="color: #0f172a; font-size: 15px;">Deepak Chandra</strong><br>
                Founder, Fieseros<br>
                <span style="font-size: 12px; color: #94a3b8;">The AI Operating System for Service Businesses</span>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 22px 36px; text-align: center; font-size: 11px; color: #94a3b8; line-height: 1.6;">
              Fieseros • The Operating System for Service Businesses<br>
              <a href="https://fieseros.com" target="_blank" style="color: #64748b; text-decoration: underline;">fieseros.com</a>
              &bull;
              <a href="mailto:support@fieseros.com" style="color: #64748b; text-decoration: underline;">support@fieseros.com</a>
              &bull;
              <a href="${unsubscribeUrl}" target="_blank" style="color: #94a3b8; text-decoration: underline;">Unsubscribe</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

const sleep = (ms) => new Promise(res => setTimeout(res, ms));

async function fetchSubscribers() {
  const options = {
    headers: {
      "apikey": key,
      "Authorization": "Bearer " + key
    }
  };

  return new Promise((resolve, reject) => {
    const sUrl = "https://api.fieseros.com/rest/v1/Subscription?select=id,tenantId,plan,status,amount,currency&limit=100";
    https.get(sUrl, options, res => {
      let d = ""; res.on("data", c => d += c);
      res.on("end", () => {
        const subs = JSON.parse(d);
        const tenantIds = subs.map(s => s.tenantId);
        const tUrl = "https://api.fieseros.com/rest/v1/Tenant?id=in.(" + tenantIds.join(",") + ")&select=id,name,email,phone,city";
        https.get(tUrl, options, tRes => {
          let td = ""; tRes.on("data", c => td += c);
          tRes.on("end", () => {
            const tenants = JSON.parse(td);
            const tMap = {};
            tenants.forEach(t => tMap[t.id] = t);
            const list = [];
            subs.forEach(s => {
              const t = tMap[s.tenantId];
              if (t && t.email) {
                list.push({
                  name: t.name,
                  email: t.email,
                  tenantId: s.tenantId,
                  plan: s.plan,
                  status: s.status
                });
              }
            });
            resolve(list);
          });
        });
      });
    }).on("error", reject);
  });
}

async function main() {
  console.log("=== STARTING FIESEROS SUBSCRIBER MARKETING CAMPAIGN ===");
  const subscribers = await fetchSubscribers();
  console.log(`Found ${subscribers.length} subscribers with valid emails.`);

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < subscribers.length; i++) {
    const sub = subscribers[i];
    console.log(`\n[${i + 1}/${subscribers.length}] Sending to: ${sub.name} <${sub.email}>...`);

    const html = renderHtml(sub.name, sub.email);
    const mailOptions = {
      from: "\"Deepak Chandra • Fieseros\" <deepakchandra076@gmail.com>",
      replyTo: "support@fieseros.com",
      to: sub.email,
      subject: "What if you could create a complete job in Fieseros just by telling it what you need?",
      html: html
    };

    try {
      const info = await transporter.sendMail(mailOptions);
      console.log(`  ✓ SENT! MessageId: ${info.messageId}`);
      successCount++;
    } catch (err) {
      console.error(`  ✗ FAILED to send to ${sub.email}:`, err.message);
      failCount++;
    }

    // Rate-limit delay: 2.5 seconds between sends to maintain high deliverability
    if (i < subscribers.length - 1) {
      await sleep(2500);
    }
  }

  console.log("\n=======================================================");
  console.log(`Campaign complete! Total: ${subscribers.length}, Success: ${successCount}, Failed: ${failCount}`);
  console.log("=======================================================");
}

main().catch(console.error);
