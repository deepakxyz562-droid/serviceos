/**
 * Default Knowledge Base Articles for ServiceOS
 *
 * These articles are auto-seeded on first fetch when the KB table is empty.
 * Categories: getting_started, guides, troubleshooting, faq, policies, general
 */

export interface KBSeedArticle {
  title: string;
  content: string;
  category: string;
  tagsJson: string;
  isPublic: boolean;
  sortOrder: number;
}

export const DEFAULT_KB_ARTICLES: KBSeedArticle[] = [
  // ═══════════════════════════════════════════════════════════
  // GETTING STARTED (6 articles)
  // ═══════════════════════════════════════════════════════════
  {
    title: 'Welcome to ServiceOS — Your Complete Guide',
    content: `# Welcome to ServiceOS

ServiceOS is the all-in-one operating system for service businesses. Whether you run a plumbing company, electrical service, HVAC business, cleaning service, or any field service operation — ServiceOS gives you everything you need to manage your entire business from one platform.

## What You Can Do

- **Manage Customers** — Store all customer information, communication history, and job records in one place
- **Track Leads** — Capture leads from WhatsApp, website, phone, and referrals, then move them through your pipeline
- **Schedule Bookings** — Let customers book online or create bookings manually with smart scheduling
- **Dispatch Jobs** — Assign jobs to your team with the smart dispatch board, track real-time status
- **Send Invoices** — Create professional invoices, track payments, and send reminders automatically
- **Run Campaigns** — Send WhatsApp campaigns, broadcasts, and retargeting messages to grow your business
- **Automate Workflows** — Build powerful automations that handle repetitive tasks for you
- **AI Assistant** — Get AI-powered help with scheduling, customer responses, and business insights

## Your First Steps

1. **Complete your profile** — Add your business name, logo, phone, and address
2. **Add your team** — Invite employees and set their roles
3. **Create services** — Set up your service catalog with pricing
4. **Start booking** — Create your first booking or job
5. **Send your first invoice** — Get paid faster with professional invoicing

Ready to get started? Check out the other Getting Started articles for detailed step-by-step guides.`,
    category: 'getting_started',
    tagsJson: '["welcome","onboarding","overview","getting started"]',
    isPublic: true,
    sortOrder: 1,
  },
  {
    title: 'Setting Up Your Business Profile',
    content: `# Setting Up Your Business Profile

Your business profile is the foundation of ServiceOS. It determines how your business appears to customers, on invoices, and in communications.

## Step-by-Step Setup

### 1. Navigate to Settings
Click **Settings** in the sidebar (gear icon) to access your business settings.

### 2. Business Information
Fill in your core business details:
- **Business Name** — This appears on invoices, emails, and customer-facing pages
- **Industry** — Select your industry (plumbing, electrical, HVAC, cleaning, etc.) for relevant features
- **Phone Number** — Your main business phone number
- **Email** — Your business email address
- **Address** — Your business address (used for dispatching and invoices)
- **Logo** — Upload your company logo (appears on invoices and the customer portal)

### 3. WhatsApp Configuration
If you use WhatsApp Business:
- Enter your **WhatsApp Phone Number**
- Configure your WhatsApp Business API settings in the WhatsApp section
- Set up auto-replies and greeting messages

### 4. Regional Settings
- **Currency** — Set your default currency (USD, EUR, GBP, etc.)
- **Country** — Affects address formatting and tax calculations
- **Timezone** — Important for scheduling and dispatch

### 5. Subscription & Plan
- View your current plan and usage
- Upgrade or manage your subscription
- Set billing information

## Tips
- Complete your profile as early as possible — it makes everything else smoother
- Your logo and business name appear on all customer-facing documents
- WhatsApp integration works best when configured during initial setup`,
    category: 'getting_started',
    tagsJson: '["setup","profile","business","settings","configuration"]',
    isPublic: true,
    sortOrder: 2,
  },
  {
    title: 'Adding Your First Team Members',
    content: `# Adding Your First Team Members

Your team is the backbone of your service business. Here's how to add employees and set their roles in ServiceOS.

## Adding Employees

### From the Employees Page
1. Go to **Employees** in the sidebar
2. Click **Add Employee** or **Invite**
3. Fill in the employee details:
   - **Name** — Full name
   - **Phone** — Mobile number (used for WhatsApp notifications)
   - **Email** — Optional, for email notifications and portal access
   - **Role** — Technician, Dispatcher, Manager, or Admin
   - **Skills** — Add relevant skills (e.g., plumbing, electrical, HVAC)

### Employee Roles Explained

| Role | Access Level |
|------|-------------|
| **Technician** | Can view assigned jobs, update job status, check in/out |
| **Dispatcher** | Can assign jobs, manage scheduling, view all jobs |
| **Manager** | Full access to jobs, customers, invoices, and reports |
| **Admin** | Full access including settings, billing, and team management |

### Inviting Employees via Email
1. When you add an email, ServiceOS sends an invitation
2. The employee receives a link to set their password
3. They can log in and access the employee portal

### Employee Portal Features
- View assigned jobs and schedules
- Update job status (en route, in progress, completed)
- Check in at job locations with GPS
- Add completion notes and photos
- View their performance stats

## Managing Employee Status
- **Available** — Ready for job assignments
- **Busy** — Currently on a job
- **Offline** — Not available
- **On Leave** — On vacation or sick leave

You can update status manually or it updates automatically when they accept/complete jobs.`,
    category: 'getting_started',
    tagsJson: '["employees","team","roles","invitation","setup"]',
    isPublic: true,
    sortOrder: 3,
  },
  {
    title: 'Creating Your Service Catalog',
    content: `# Creating Your Service Catalog

Your service catalog defines what your business offers. It's used when creating jobs, bookings, and invoices.

## Adding Services

1. Navigate to **Service Catalog** in the sidebar
2. Click **Add Service**
3. Fill in the details:
   - **Name** — Clear service name (e.g., "Kitchen Faucet Repair")
   - **Description** — What's included in the service
   - **Category** — Group similar services together (e.g., "Plumbing", "Installation")
   - **Base Price** — Starting price for the service
   - **Duration** — Estimated time in minutes
   - **Icon** — Visual icon for easy recognition
   - **Active** — Toggle to make it available for booking

## Service Categories
Group your services into categories to keep things organized:
- **Plumbing** — Repairs, installations, maintenance
- **Installation** — New equipment and fixtures
- **Emergency** — Urgent services with premium pricing
- **Maintenance** — Regular service and inspections
- **Consultation** — Diagnostic and assessment visits

## Pricing Strategies
- **Fixed Price** — Set a specific amount (e.g., $150 for water heater flush)
- **Starting At** — Use base price as a minimum (e.g., "From $89" for drain cleaning)
- **Hourly** — Note in description that pricing is hourly
- **Free Estimate** — Set price to $0 for consultation services

## Best Practices
- Keep service names clear and customer-friendly
- Include what's covered in the description
- Set realistic duration estimates for better scheduling
- Deactivate services you no longer offer instead of deleting them
- Use categories to make it easy for customers to find what they need`,
    category: 'getting_started',
    tagsJson: '["services","catalog","pricing","setup","booking"]',
    isPublic: true,
    sortOrder: 4,
  },
  {
    title: 'Your First Job — Step by Step',
    content: `# Your First Job — Step by Step

Ready to create your first job in ServiceOS? Here's a complete walkthrough.

## Creating a Job

### Option 1: From the Jobs Page
1. Go to **Jobs** in the sidebar
2. Click **Create Job**
3. Fill in the job details:
   - **Title** — What needs to be done (e.g., "Leaking Kitchen Faucet")
   - **Customer** — Select existing customer or create new
   - **Address** — Where the job is located
   - **Service** — Select from your service catalog
   - **Priority** — Low, Medium, High, or Urgent
   - **Scheduled Date/Time** — When the job should happen
   - **Estimated Duration** — How long the job should take
   - **Assigned Employee** — Who will do the work
   - **Quoted Amount** — Price quoted to the customer

### Option 2: From a Booking
When a booking is confirmed, you can convert it to a job with one click.

### Option 3: From a Lead
When a lead is won, convert it to a job directly from the lead detail page.

## Job Status Workflow

Jobs move through these statuses:
1. **Pending** → Just created, waiting to be assigned
2. **Assigned** → An employee has been assigned
3. **Accepted** → The employee accepted the job
4. **En Route** → The employee is heading to the location
5. **In Progress** → Work has started
6. **Completed** → Work is finished
7. **Cancelled** → Job was cancelled

## Tracking Progress
- Employees update their status from the mobile app or employee portal
- GPS check-in/check-out records when they arrive and leave
- Completion notes and photos can be added
- Customer ratings are collected after completion

## After Completion
Once a job is completed, you can:
- **Create an Invoice** — Convert the job to an invoice for payment
- **Request a Review** — Send a WhatsApp message asking for a review
- **Schedule Follow-up** — Create a follow-up job if needed
- **Add to Campaign** — Add the customer to a re-engagement campaign`,
    category: 'getting_started',
    tagsJson: '["jobs","workflow","first job","scheduling","dispatch"]',
    isPublic: true,
    sortOrder: 5,
  },
  {
    title: 'Understanding the Dashboard',
    content: `# Understanding the Dashboard

Your ServiceOS Dashboard gives you a real-time snapshot of your business at a glance.

## Dashboard Sections

### Key Metrics (Top Cards)
- **Today's Bookings** — How many bookings are scheduled for today with trend comparison
- **Active Jobs** — Total active jobs broken down by status (in progress, pending, etc.)
- **Monthly Revenue** — Your revenue for the current month with growth percentage
- **New Leads** — How many new leads came in this period

### Lead Pipeline
Visual representation of your leads through each stage:
- **New** → Fresh leads that need follow-up
- **Contacted** → You've reached out but haven't qualified yet
- **Quoted** → You've sent a quote or proposal
- **Won** → Lead converted to a customer/job
- **Lost** → Lead didn't convert (with reason tracking)

Each stage shows the count and total value of leads.

### Revenue Trend
A 6-month chart showing your revenue trajectory. Use this to spot seasonal patterns and growth trends.

### Recent Activity
See the latest jobs, leads, and customer interactions at a glance.

### Team Presence
Real-time status of your employees:
- 🟢 Available — Ready for assignments
- 🔴 Busy — Currently on a job
- 🟡 Traveling — En route to a job
- ⚫ Offline — Not available
- 🏖️ On Leave — On vacation or sick

### WhatsApp Activity
See active conversations and recent messages from your WhatsApp channel.

## Quick Actions
From the dashboard, you can quickly:
- **Add Lead** — Capture a new lead
- **Create Job** — Schedule a new job
- **Dispatch** — Open the dispatch board
- **Send WhatsApp** — Start a WhatsApp conversation

## Customization Tips
- The dashboard adapts to your role (owners see everything, technicians see their assignments)
- Metrics update in real-time as data changes
- Click on any metric card to drill down into the details`,
    category: 'getting_started',
    tagsJson: '["dashboard","overview","metrics","analytics"]',
    isPublic: true,
    sortOrder: 6,
  },

  // ═══════════════════════════════════════════════════════════
  // GUIDES (10 articles)
  // ═══════════════════════════════════════════════════════════
  {
    title: 'Managing Customers & CRM',
    content: `# Managing Customers & CRM

ServiceOS gives you a powerful CRM to manage all your customer relationships in one place.

## Customer List
The Customers page shows all your customers with key information:
- Name, phone, email, and address
- Invitation status for the customer portal
- Creation date

You can search, filter, and sort the list to find any customer quickly.

## Adding Customers
1. Click **Create** → **Customer**
2. Enter their details:
   - **Name** — Full name
   - **Phone** — Primary phone number
   - **Email** — For invoices and notifications
   - **Address** — Service address
3. Customers are automatically associated with your workspace

## Customer 360 View
Click any customer to see their complete profile:
- **Contact Info** — Phone, email, address
- **Job History** — All jobs associated with this customer
- **Invoices** — All invoices and payment status
- **Bookings** — Upcoming and past bookings
- **Conversations** — WhatsApp and other chat history
- **Reviews** — Any reviews they've submitted
- **Quotes** — Active and past quotes

This gives you full context before any customer interaction.

## Customer Portal
You can invite customers to their self-service portal where they can:
- View their job history
- Book new services
- Pay invoices online
- Communicate via WhatsApp
- Leave reviews

To invite: Click **Invite** next to the customer → They receive an email/SMS with a link.

## Import/Export
- **Import** — Bulk import customers from CSV
- **Export** — Download your customer list as CSV for backup or migration

## Best Practices
- Keep customer info updated after each interaction
- Use the Customer 360 view before calling a customer
- Invite customers to the portal to reduce phone calls
- Tag or note special requirements (e.g., "Gate code: 1234", "Dog in yard")`,
    category: 'guides',
    tagsJson: '["customers","crm","customer 360","portal","import"]',
    isPublic: true,
    sortOrder: 10,
  },
  {
    title: 'Lead Management & Pipeline',
    content: `# Lead Management & Pipeline

Turn every inquiry into revenue with ServiceOS's lead management system.

## Capturing Leads
Leads come from multiple sources:
- **WhatsApp** — Auto-captured from WhatsApp conversations
- **Website** — Web form submissions
- **Phone** — Manually entered from phone inquiries
- **Referral** — Referred by existing customers
- **Google/Facebook Ads** — Captured via ad integrations
- **Walk-in** — In-person inquiries

## Lead Pipeline Stages
Your leads flow through these stages:
1. **New** — Just received, needs initial contact
2. **Contacted** — You've reached out (call, WhatsApp, email)
3. **Qualified** — Confirmed they're a real opportunity
4. **Proposal** — Sent a quote or proposal
5. **Won** — Converted to a customer and/or job
6. **Lost** — Did not convert

## Working with Leads
### From the Leads Page
- View all leads in a table or pipeline view
- Filter by source, status, or date
- Sort by value, date, or priority
- Bulk update lead statuses

### Lead Detail View
Click a lead to see:
- Contact information
- Source and campaign attribution
- Communication history
- Assigned employee
- Estimated value
- Follow-up date
- Notes and tags

### Converting Leads
When a lead is ready to convert:
- **Convert to Customer** — Creates a customer record
- **Convert to Job** — Creates a job directly
- **Convert to Quote** — Creates a quote with line items

### Lead Scoring
Leads are automatically scored based on:
- Source quality (referrals score higher)
- Engagement level (replied to messages, opened emails)
- Value estimate
- How quickly you respond

## Best Practices
- Respond to leads within 5 minutes for best conversion rates
- Update lead status after every interaction
- Use follow-up dates to never lose track
- Review your pipeline daily
- Analyze which sources produce the best leads`,
    category: 'guides',
    tagsJson: '["leads","pipeline","crm","conversion","sales"]',
    isPublic: true,
    sortOrder: 11,
  },
  {
    title: 'Booking & Scheduling Guide',
    content: `# Booking & Scheduling Guide

Manage your appointments efficiently with ServiceOS's booking system.

## Creating Bookings

### Manual Booking
1. Go to **Booking** in the sidebar
2. Click **Create Booking**
3. Fill in the details:
   - **Title** — What the appointment is for
   - **Customer** — Select or create new
   - **Service** — Choose from your catalog
   - **Employee** — Assign a team member
   - **Date & Time** — When it's scheduled
   - **Duration** — How long (default from service settings)
   - **Address** — Where the service will be performed
   - **Notes** — Any special instructions

### Online Booking (Customer Portal)
When customers book through the portal:
1. They select a service
2. Choose an available time slot
3. Enter their details
4. Booking appears in your system as "Pending"
5. You confirm or suggest an alternative time

## Booking Statuses
- **Pending** → Awaiting confirmation
- **Confirmed** → You've confirmed the appointment
- **Rescheduled** → Date/time changed
- **Completed** → Service completed
- **Cancelled** → Appointment cancelled

## Calendar View
The Calendar shows all your bookings and jobs in a visual timeline:
- **Day View** — See hourly schedule for each employee
- **Week View** — Overview of the entire week
- **Month View** — Spot busy periods and gaps
- Drag and drop to reschedule

## Smart Scheduling
ServiceOS helps you schedule efficiently:
- **Availability Check** — See when employees are free
- **Conflict Detection** — Prevent double-booking
- **Travel Time** — Account for travel between jobs
- **Recurring Bookings** — Set up weekly/monthly appointments

## Booking Sources
Track where bookings come from:
- **Manual** — Created by you or your team
- **Online** — Customer booked via portal
- **WhatsApp** — Booked through WhatsApp conversation
- **Phone** — Booked after a phone call

## Notifications
Automatic notifications keep everyone informed:
- Customer gets booking confirmation
- Employee gets assignment notification
- Reminders sent before the appointment
- Follow-up after completion`,
    category: 'guides',
    tagsJson: '["booking","scheduling","calendar","appointments"]',
    isPublic: true,
    sortOrder: 12,
  },
  {
    title: 'Job Management & Dispatch Board',
    content: `# Job Management & Dispatch Board

The Dispatch Board is your command center for managing field operations in real-time.

## Dispatch Board Overview
Access the Dispatch Board from the sidebar. It shows:
- **Job Queue** (left) — Pending and assigned jobs waiting for action
- **Team Panel** (right) — Real-time status of your field employees

### Job Queue Features
- Filter by priority (Urgent, High, Medium, Low)
- Filter by type (Plumbing, Installation, Emergency, etc.)
- Filter by date
- Drag jobs to employees to assign them
- **Smart Assign All** — Auto-assign pending jobs to available employees

### Team Panel Features
- See each employee's current status
- Click an employee to see their active job
- Filter by status (Available, Busy, Offline, On Leave)
- GPS location tracking (with employee consent)

## Creating Jobs from the Dispatch Board
1. Click **Create Job** on the dispatch board
2. Fill in job details
3. Drag the job to an available employee, or use Smart Assign

## Job Status Updates
Employees update their job status from their mobile device:
1. **Pending** → Waiting in queue
2. **Assigned** → Employee assigned, waiting for acceptance
3. **Accepted** → Employee acknowledged the job
4. **En Route** → Employee heading to the location
5. **In Progress** → Work has started (with GPS check-in)
6. **Completed** → Work finished (with photos and notes)

## Smart Assign
The Smart Assign feature automatically:
- Matches jobs to employees based on skills and location
- Considers current workload and travel time
- Prioritizes urgent jobs
- Respects employee availability

## Real-Time Tracking
- See employee GPS positions on the map
- Track estimated arrival times
- Monitor job progress in real-time
- Get alerts if a job is running over time

## Post-Job Actions
After a job is completed:
- Create an invoice from the job
- Request a customer review via WhatsApp
- Schedule a follow-up if needed
- Add the customer to a campaign

## Best Practices
- Review the dispatch board at the start of each day
- Use Smart Assign for efficient routing
- Keep job details updated so employees have what they need
- Monitor real-time status to catch delays early
- Use priority levels to ensure urgent jobs get handled first`,
    category: 'guides',
    tagsJson: '["dispatch","jobs","routing","field service","real-time"]',
    isPublic: true,
    sortOrder: 13,
  },
  {
    title: 'Invoicing & Getting Paid Faster',
    content: `# Invoicing & Getting Paid Faster

ServiceOS makes it easy to create professional invoices and collect payments quickly.

## Creating Invoices

### From a Job
The fastest way to create an invoice:
1. Open a completed job
2. Click **Create Invoice**
3. Job details auto-fill (customer, amount, line items)
4. Review and adjust as needed
5. Click **Send** to email/WhatsApp it to the customer

### From Scratch
1. Go to **Invoices** → **Create Invoice**
2. Fill in:
   - **Customer** — Who it's for
   - **Line Items** — What you're charging for (add from service catalog or custom)
   - **Tax** — Applied automatically based on settings
   - **Discount** — Fixed amount or percentage
   - **Due Date** — When payment is expected
   - **Notes** — Payment instructions or terms

### From a Quote
When a customer accepts a quote, convert it to an invoice with one click.

## Invoice Statuses
- **Draft** → Still editing, not sent yet
- **Sent** → Delivered to the customer
- **Paid** → Payment received
- **Overdue** → Past the due date, no payment
- **Cancelled** → Invoice cancelled

## Invoice Features
- **Professional Templates** — Clean, branded invoice design
- **PDF Export** — Download or attach PDF version
- **WhatsApp Delivery** — Send invoices via WhatsApp for faster response
- **Payment Tracking** — Mark as paid, partial payments, multiple methods
- **Automatic Numbering** — Sequential invoice numbers (INV-2024-0001)
- **Recurring Invoices** — Set up monthly billing for maintenance contracts
- **Reminders** — Auto-send overdue reminders

## Getting Paid Faster
1. **Send via WhatsApp** — Customers see it immediately
2. **Clear Due Dates** — Set expectations upfront
3. **Online Payment** — Enable online payment on the customer portal
4. **Early Payment Discounts** — Offer 2% discount for payment within 10 days
5. **Automated Reminders** — ServiceOS sends reminders before and after due dates
6. **Mobile Invoicing** — Create invoices on-site right after completing a job

## Payment Methods
Track payments from any source:
- Cash
- Credit Card
- Bank Transfer
- PayPal
- Check
- Mobile Payment (Venmo, Zelle, etc.)

## Reports
- **Revenue by Month** — Track income over time
- **Outstanding Invoices** — See what's owed
- **Average Payment Time** — How quickly customers pay
- **Revenue by Service** — Which services generate the most income`,
    category: 'guides',
    tagsJson: '["invoices","payments","billing","revenue","collection"]',
    isPublic: true,
    sortOrder: 14,
  },
  {
    title: 'WhatsApp Campaigns & Marketing',
    content: `# WhatsApp Campaigns & Marketing

Reach your customers where they are — on WhatsApp. ServiceOS provides powerful campaign tools designed for WhatsApp-first businesses.

## Campaign Types

### 1. Promotional Campaigns
Send offers, discounts, and promotions to your customer base.
- **Seasonal Promos** — Summer maintenance special, winter preparation deals
- **New Service Launch** — Announce new services
- **Upsell** — Suggest related services to past customers

### 2. Re-engagement Campaigns
Win back inactive customers:
- **Inactivity Alert** — Target customers who haven't booked in 30/60/90 days
- **Special Comeback Offer** — Discount for returning customers
- **Service Reminder** — "It's been 6 months since your last maintenance"

### 3. Follow-up Campaigns
Stay connected after service:
- **Thank You** — Post-service appreciation
- **Review Request** — Ask for a Google/Facebook review
- **Referral Program** — Encourage word-of-mouth

### 4. Seasonal Campaigns
Time-based marketing:
- **Pre-season** — Get bookings before the busy season
- **Holiday Specials** — Festive offers
- **Emergency Awareness** — "We're here 24/7"

## Creating a Campaign
1. Go to **Campaigns** → **Create Campaign**
2. Choose your campaign type
3. Write your message content (use variables for personalization)
4. Select your audience:
   - All customers
   - Specific segment (new, inactive, VIP)
   - Custom filters
5. Schedule or send immediately
6. Track results in real-time

## Campaign Templates
Use pre-built templates or create your own:
- Browse the **Template Studio** for ready-to-use templates
- Customize with your branding
- Add variables: {customer_name}, {service_type}, {last_booking_date}
- Include images and CTA buttons

## Campaign Analytics
Track every campaign's performance:
- **Sent** — Messages sent
- **Delivered** — Successfully delivered
- **Read** — Customer opened the message
- **Clicked** — Customer clicked a link/CTA
- **Replied** — Customer responded
- **Converted** — Customer booked/purchased
- **Revenue** — Direct revenue attributed to the campaign

## Broadcasts
Send one-time messages to your entire list:
- Quick announcements
- Urgent notifications
- Schedule changes
- New service alerts

## Best Practices
- Get consent before sending marketing messages
- Keep messages concise and clear
- Use personalization (name, last service)
- Include a clear call-to-action
- Don't send more than 2-3 messages per week
- Always offer an opt-out option
- Test with a small segment first
- Track results and optimize`,
    category: 'guides',
    tagsJson: '["campaigns","whatsapp","marketing","broadcast","retargeting"]',
    isPublic: true,
    sortOrder: 15,
  },
  {
    title: 'Setting Up the AI Assistant',
    content: `# Setting Up the AI Assistant

ServiceOS includes an AI-powered assistant that helps you run your business more efficiently.

## What the AI Assistant Can Do

### Customer Communication
- **Auto-Reply** — Respond to common WhatsApp inquiries instantly
- **Smart Responses** — Suggest appropriate replies based on context
- **Appointment Scheduling** — Book appointments through natural conversation
- **Follow-up Messages** — Send timely follow-ups automatically

### Business Intelligence
- **Lead Qualification** — Score and qualify incoming leads
- **Revenue Insights** — Analyze trends and suggest improvements
- **Scheduling Optimization** — Suggest the best times and routes
- **Customer Insights** — Identify your best customers and at-risk ones

### Content Generation
- **Invoice Descriptions** — Auto-generate detailed line items
- **Email Templates** — Write professional emails quickly
- **Campaign Copy** — Create compelling marketing messages
- **Job Notes** — Summarize completion notes from voice/text

## Enabling the AI Assistant
1. Go to **AI Assistant** in the sidebar
2. Review the available AI features
3. Enable the features you want:
   - WhatsApp Auto-Reply
   - Lead Scoring
   - Smart Scheduling
   - Content Generation

## Chatbot Builder
Create custom chatbots for your business:
1. Go to **Chatbot Builder**
2. Choose a template or start from scratch
3. Design your conversation flow:
   - **Greeting** — How the bot introduces itself
   - **Menu** — Main options for the customer
   - **FAQ Answers** — Pull from your knowledge base
   - **Booking Flow** — Guide customers to book
   - **Escalation** — Hand off to a human when needed
4. Test the chatbot
5. Deploy it on WhatsApp

## AI Configuration
- **Tone** — Professional, friendly, casual
- **Language** — Multiple languages supported
- **Business Rules** — Set pricing limits, scheduling rules, escalation triggers
- **Knowledge Base** — Connect your KB articles for FAQ responses

## Usage & Quotas
AI features use your plan's AI quota:
- **Starter** — 100 AI interactions/month
- **Growth** — 500 AI interactions/month
- **Pro** — 2,000 AI interactions/month
- **Enterprise** — Unlimited

Check your usage in **Settings → Subscription**.`,
    category: 'guides',
    tagsJson: '["AI","assistant","chatbot","automation","smart replies"]',
    isPublic: true,
    sortOrder: 16,
  },
  {
    title: 'Workflow Automation Guide',
    content: `# Workflow Automation Guide

Automate repetitive tasks and save hours every week with ServiceOS Workflows.

## What Are Workflows?
Workflows are automated sequences that trigger based on events in your business. They run in the background, handling tasks so you don't have to.

## Common Workflow Examples

### 1. New Lead Auto-Response
**Trigger:** New lead created
**Actions:**
1. Send WhatsApp greeting message
2. Wait 30 minutes
3. If no reply, send follow-up
4. Assign to sales team

### 2. Job Completion Follow-up
**Trigger:** Job status changes to "Completed"
**Actions:**
1. Wait 2 hours
2. Send review request via WhatsApp
3. Create invoice from job
4. Add customer to "Completed Jobs" campaign

### 3. Overdue Invoice Reminder
**Trigger:** Invoice becomes overdue
**Actions:**
1. Send payment reminder via WhatsApp
2. Wait 3 days
3. Send second reminder
4. If still unpaid, notify admin

### 4. Customer Re-engagement
**Trigger:** Customer inactive for 60 days
**Actions:**
1. Send "We miss you" message with offer
2. Create a lead for follow-up
3. Assign to sales team

### 5. Emergency Job Routing
**Trigger:** Job priority set to "Urgent"
**Actions:**
1. Notify all available technicians
2. First to accept gets the job
3. Send ETA to customer
4. Track until completion

## Creating a Workflow
1. Go to **Workflows** in the sidebar
2. Click **Create Workflow**
3. Set the **Trigger**:
   - Job status changed
   - New lead created
   - Invoice overdue
   - Customer inactive
   - WhatsApp message received
   - Scheduled (time-based)
4. Add **Actions**:
   - Send WhatsApp message
   - Send email
   - Create job
   - Create lead
   - Update record
   - Notify employee
   - Wait/delay
   - Conditional branch
5. Set conditions and filters
6. Test the workflow
7. Activate it

## Workflow Builder
The visual builder lets you:
- Drag and drop actions
- Create branching logic
- Add delays and conditions
- Test with sample data
- View execution history

## Monitoring
- **Execution Log** — See every workflow run
- **Success Rate** — Track how often workflows complete
- **Error Alerts** — Get notified if a workflow fails
- **Performance** — See time saved and tasks automated

## Best Practices
- Start with simple workflows and add complexity over time
- Always test before activating
- Monitor execution logs regularly
- Keep workflows focused on one goal
- Use delays to avoid spamming customers
- Document your workflows for team reference`,
    category: 'guides',
    tagsJson: '["workflows","automation","triggers","actions","productivity"]',
    isPublic: true,
    sortOrder: 17,
  },
  {
    title: 'Customer 360 — Complete Customer View',
    content: `# Customer 360 — Complete Customer View

Customer 360 gives you a 360-degree view of every customer, so you always have full context before any interaction.

## Accessing Customer 360
1. Go to **Customer 360** in the sidebar
2. Search for a customer by name, phone, or email
3. Click to open their complete profile

## Profile Sections

### Contact Information
- Name, phone, email, address
- WhatsApp ID and communication preferences
- Customer portal status (active/not invited)

### Job History
- Complete list of all jobs with this customer
- Job status, dates, and assigned employees
- Total jobs completed and their value
- Any upcoming scheduled jobs

### Financial Summary
- Total revenue from this customer
- Outstanding balance
- Payment history
- Average job value

### Booking History
- Past and upcoming bookings
- Preferred services and employees
- Booking patterns (frequency, seasonality)

### Communication History
- WhatsApp conversations
- Email history
- Notes and internal comments
- AI chatbot interactions

### Reviews & Feedback
- All reviews submitted
- Average rating
- Sentiment analysis

### Quotes
- Active quotes pending acceptance
- Quote history
- Conversion rate

## Using Customer 360 Effectively

### Before Calling a Customer
1. Check their recent jobs — know what was done last
2. Review any open invoices — mention if appropriate
3. See their communication preferences
4. Note any special requirements or complaints

### For Upselling
1. Check their service history — suggest related services
2. Review booking frequency — offer maintenance plans
3. See their average spend — tailor your offer

### For Retention
1. Monitor inactivity — proactively reach out before they churn
2. Check complaint history — address past issues
3. Review their value — prioritize high-value customers

## Customer Segmentation
Customer 360 data powers segmentation:
- **VIP Customers** — High spend, frequent bookings
- **At-Risk** — Declining activity or complaints
- **New** — Recently acquired, need nurturing
- **Inactive** — Haven't booked in 90+ days
- **Loyal** — Consistent bookings over time

Use these segments for targeted campaigns and personalized service.`,
    category: 'guides',
    tagsJson: '["customer 360","CRM","profile","history","insights"]',
    isPublic: true,
    sortOrder: 18,
  },
  {
    title: 'Reports & Analytics Guide',
    content: `# Reports & Analytics Guide

Make data-driven decisions with ServiceOS's reporting and analytics tools.

## Available Reports

### Revenue Reports
- **Monthly Revenue** — Income by month with trend
- **Revenue by Service** — Which services generate the most income
- **Revenue by Employee** — Performance comparison
- **Outstanding Revenue** — Unpaid invoices and aging

### Job Reports
- **Jobs by Status** — Distribution across statuses
- **Average Job Duration** — Time from creation to completion
- **Completion Rate** — Jobs completed vs cancelled
- **First-Time Fix Rate** — Jobs resolved on first visit

### Customer Reports
- **Customer Growth** — New customers over time
- **Customer Retention** — Repeat booking rate
- **Customer Lifetime Value** — Average total spend per customer
- **Top Customers** — Highest revenue customers

### Lead Reports
- **Lead Sources** — Which channels produce the most leads
- **Conversion Rate** — Leads to customers percentage
- **Lead Response Time** — How quickly you respond
- **Pipeline Value** — Total value of active leads

### Employee Reports
- **Jobs Completed** — Per employee
- **Revenue Generated** — Per employee
- **Average Rating** — Customer satisfaction scores
- **Utilization Rate** — Time on jobs vs available time

### Campaign Reports
- **Delivery Rate** — Messages delivered vs sent
- **Open Rate** — Messages read
- **Click Rate** — Links clicked
- **Conversion Rate** — Bookings/purchases from campaigns
- **ROI** — Revenue generated vs campaign cost

## Accessing Reports
1. Go to **Reports** in the sidebar
2. Select the report type
3. Choose date range
4. Filter by employee, service, or customer segment
5. View as chart or table
6. Export as PDF or CSV

## Custom Dashboards
Create custom dashboards with the metrics that matter most to you:
1. Choose from available widgets
2. Arrange them on your dashboard
3. Set auto-refresh intervals
4. Share with team members

## Scheduled Reports
Set up automatic report delivery:
- **Daily Summary** — Key metrics emailed each morning
- **Weekly Report** — Comprehensive weekly performance
- **Monthly Review** — Month-over-month analysis

## Using Data Effectively
- Review revenue trends weekly to spot issues early
- Monitor lead response time — faster response = higher conversion
- Track employee utilization to optimize scheduling
- Use campaign ROI to allocate marketing budget
- Compare performance across time periods for seasonality`,
    category: 'guides',
    tagsJson: '["reports","analytics","metrics","dashboard","data"]',
    isPublic: true,
    sortOrder: 19,
  },

  // ═══════════════════════════════════════════════════════════
  // TROUBLESHOOTING (6 articles)
  // ═══════════════════════════════════════════════════════════
  {
    title: 'WhatsApp Connection Issues',
    content: `# WhatsApp Connection Issues

If you're having trouble with WhatsApp integration, here are the most common issues and solutions.

## Issue: WhatsApp Not Sending Messages

### Check Your Connection
1. Go to **Settings → WhatsApp**
2. Verify your phone number is correct
3. Check the connection status indicator
4. If disconnected, click **Reconnect**

### Common Causes
- **Expired Session** — WhatsApp sessions expire after 24 hours. Re-authenticate.
- **Rate Limiting** — You may have hit WhatsApp's message rate limit. Wait and retry.
- **Invalid Number** — Customer phone numbers must include country code (e.g., +1 for US)
- **Template Not Approved** — Message templates must be approved by WhatsApp before use

### Solution Steps
1. Disconnect and reconnect your WhatsApp account
2. Clear your browser cache
3. Check that your WhatsApp Business API subscription is active
4. Verify the customer's phone number is correct and includes country code

## Issue: Messages Marked as Failed

### Common Causes
- **Invalid Phone Number** — Number doesn't have WhatsApp
- **Blocked** — Customer blocked your business number
- **Template Mismatch** — Message doesn't match an approved template
- **Media Too Large** — Images/files exceed WhatsApp's size limits

### Solutions
- Verify the customer's phone number on WhatsApp
- Check if you can send a regular text (non-template) message
- Reduce image/file sizes before attaching
- Contact WhatsApp support if messages consistently fail

## Issue: WhatsApp Webhook Not Working

1. Verify the webhook URL in your WhatsApp Business settings
2. Check that your server is receiving POST requests
3. Look for errors in the ServiceOS notification logs
4. Ensure your SSL certificate is valid

## Issue: Auto-Reply Not Working

1. Check that the AI Assistant feature is enabled
2. Verify your chatbot is active (not in draft mode)
3. Review the conversation flow for errors
4. Check that the trigger conditions are correct

## Still Having Issues?
If none of these solutions work:
1. Check the ServiceOS status page for any known outages
2. Contact support via the Help Center
3. Include your WhatsApp phone number and the specific error message`,
    category: 'troubleshooting',
    tagsJson: '["whatsapp","connection","messages","troubleshooting","failed"]',
    isPublic: true,
    sortOrder: 20,
  },
  {
    title: 'Booking & Scheduling Problems',
    content: `# Booking & Scheduling Problems

Common booking and scheduling issues and how to resolve them.

## Issue: Double Booking

### Cause
When two bookings are scheduled for the same employee at the same time.

### Solution
- ServiceOS automatically detects time conflicts
- If you see a conflict warning, choose a different time or employee
- Use the Calendar view to spot overlaps visually
- Enable "Prevent Double Booking" in Settings → Scheduling

## Issue: Booking Not Showing on Calendar

### Cause
- Booking may be in "Pending" status (not yet confirmed)
- Filter settings may be hiding it
- Date range doesn't include the booking date

### Solution
1. Check the booking status — pending bookings may appear differently
2. Reset calendar filters
3. Search for the booking by customer name or ID
4. Check the date range — make sure you're viewing the correct period

## Issue: Customer Can't Book Online

### Cause
- Customer portal not enabled
- No available time slots
- Service not marked as bookable online

### Solution
1. Go to the customer record and click **Invite to Portal**
2. Check that you have available slots (Settings → Online Booking)
3. Ensure the service is active and has "Bookable Online" enabled
4. Check your booking window settings (how far in advance customers can book)

## Issue: Time Zone Mismatch

### Cause
Your business timezone differs from the customer's timezone.

### Solution
- Verify your timezone in Settings → Business Profile
- Bookings are always displayed in your business timezone
- Inform customers of your timezone if they're in a different one
- Use the timezone selector when creating manual bookings

## Issue: Recurring Booking Stopped Working

### Cause
- The original booking was cancelled or modified
- Employee assigned is no longer available
- Service was deactivated

### Solution
1. Check if the parent booking is still active
2. Verify the employee's availability and status
3. Ensure the service is still active in your catalog
4. If needed, recreate the recurring schedule

## Issue: Booking Reminders Not Sending

### Cause
- Notification settings disabled
- Customer has no phone/email on file
- WhatsApp not connected

### Solution
1. Go to Settings → Notifications and enable booking reminders
2. Verify customer contact information
3. Check WhatsApp connection status
4. Test by creating a new booking for yourself`,
    category: 'troubleshooting',
    tagsJson: '["booking","scheduling","calendar","double booking","timezone"]',
    isPublic: true,
    sortOrder: 21,
  },
  {
    title: 'Invoice & Payment Troubleshooting',
    content: `# Invoice & Payment Troubleshooting

Common invoice and payment issues and how to resolve them.

## Issue: Invoice Number Already Exists

### Cause
You or someone on your team created an invoice with a duplicate number.

### Solution
- ServiceOS auto-generates unique invoice numbers (INV-2024-XXXX)
- If entering manually, check existing invoices first
- You can change the number before sending
- If stuck, contact support to reset the counter

## Issue: Invoice Total Is Wrong

### Cause
- Tax calculation error
- Discount not applied correctly
- Line item quantities incorrect

### Solution
1. Check each line item's quantity and unit price
2. Verify the tax rate in Settings → Invoice Settings
3. Check if discount is set as fixed amount or percentage
4. Recalculate: Subtotal + Tax - Discount = Total

## Issue: Customer Says They Didn't Receive the Invoice

### Cause
- Email went to spam
- Wrong email address
- WhatsApp message not delivered

### Solution
1. Verify the customer's email/phone in their profile
2. Resend the invoice via a different channel (WhatsApp instead of email)
3. Download the PDF and send it manually
4. Check the invoice status — if "Draft", it hasn't been sent yet

## Issue: Payment Not Reflecting

### Cause
- Payment was recorded outside ServiceOS
- Partial payment not properly recorded
- Wrong invoice was marked as paid

### Solution
1. Go to the invoice and click **Record Payment**
2. Enter the exact amount paid
3. Select the payment method
4. If you recorded payment on the wrong invoice, undo it and re-record

## Issue: Can't Delete an Invoice

### Cause
- Invoice has been sent (can only cancel, not delete)
- Invoice is linked to a job
- You don't have permission

### Solution
- Sent invoices can be **Cancelled** but not deleted (for audit trail)
- Cancel the invoice and create a new one if needed
- Ask an admin to cancel if you don't have permission

## Issue: Recurring Invoice Not Generating

### Cause
- Schedule not properly configured
- Template has errors
- Subscription expired

### Solution
1. Check the recurring invoice schedule
2. Verify the template has valid line items
3. Ensure your subscription includes recurring invoicing
4. Check the execution log for errors`,
    category: 'troubleshooting',
    tagsJson: '["invoices","payments","billing","errors","troubleshooting"]',
    isPublic: true,
    sortOrder: 22,
  },
  {
    title: 'Employee Access & Permission Issues',
    content: `# Employee Access & Permission Issues

Resolve common issues with employee access, roles, and permissions.

## Issue: Employee Can't Log In

### Cause
- Invitation not accepted yet
- Wrong email address
- Account deactivated
- Password forgotten

### Solution
1. Check if the invitation was sent (Employees → Check invitation status)
2. Verify the email address is correct
3. Check if the employee's account is active (isActive = true)
4. Send a password reset link from the employee detail page

## Issue: Employee Can't See Jobs

### Cause
- Wrong role assigned
- Not assigned to the workspace
- Filter settings hiding jobs

### Solution
1. Check the employee's role — Technicians see only their assigned jobs
2. Verify they're in the correct workspace
3. Have them reset their filters
4. Check the job assignment — the employee must be the assignee

## Issue: Employee Can't Update Job Status

### Cause
- Job not assigned to them
- Role doesn't have permission
- App connectivity issue

### Solution
1. Verify the job is assigned to this specific employee
2. Check their role — Technicians can update their own jobs
3. Have them refresh the page or restart the app
4. Check for any error messages in the notification panel

## Issue: Employee Dashboard Shows Wrong Data

### Cause
- Cached data
- Wrong workspace selected
- Timezone difference

### Solution
1. Clear browser cache and refresh
2. Check workspace selection in the top bar
3. Verify timezone settings match their location
4. Log out and log back in

## Issue: Employee Invitation Expired

### Cause
Invitations expire after 7 days.

### Solution
1. Go to the employee record
2. Click **Resend Invitation**
3. A new invitation link will be sent
4. The employee should accept within 7 days

## Role Permissions Reference

| Feature | Technician | Dispatcher | Manager | Admin |
|---------|-----------|-----------|---------|-------|
| View own jobs | ✅ | ✅ | ✅ | ✅ |
| View all jobs | ❌ | ✅ | ✅ | ✅ |
| Create jobs | ❌ | ✅ | ✅ | ✅ |
| Assign jobs | ❌ | ✅ | ✅ | ✅ |
| Manage customers | ❌ | ❌ | ✅ | ✅ |
| Manage invoices | ❌ | ❌ | ✅ | ✅ |
| Manage team | ❌ | ❌ | ❌ | ✅ |
| Manage settings | ❌ | ❌ | ❌ | ✅ |`,
    category: 'troubleshooting',
    tagsJson: '["employees","permissions","roles","access","login"]',
    isPublic: true,
    sortOrder: 23,
  },
  {
    title: 'Notification & Alert Issues',
    content: `# Notification & Alert Issues

Fix problems with notifications not being received or showing incorrectly.

## Issue: Not Receiving WhatsApp Notifications

### Check These First
1. Is WhatsApp connected? Go to Settings → WhatsApp
2. Is your phone number correct?
3. Are notifications enabled for your user account?

### Common Causes & Solutions
- **WhatsApp disconnected** — Reconnect in Settings
- **Phone number missing country code** — Add +1 (or your country code)
- **Notification preferences disabled** — Check your profile settings
- **Rate limiting** — WhatsApp limits bulk messages; wait before retrying
- **Customer opted out** — Customer sent "STOP" to unsubscribe

## Issue: Email Notifications Not Arriving

### Solutions
1. Check your spam/junk folder
2. Verify your email address in Profile Settings
3. Add notifications@serviceos.cc to your contacts
4. Check that email notifications are enabled in Settings → Notifications

## Issue: Too Many Notifications

### Solutions
1. Go to Settings → Notifications
2. Choose which notifications you want:
   - Job assignments
   - Booking confirmations
   - Invoice payments
   - Lead alerts
   - System updates
3. Set quiet hours (no notifications between certain times)
4. Use digest mode (group notifications into a daily summary)

## Issue: Push Notifications Not Working on Mobile

### Solutions
1. Enable push notifications in your phone's settings
2. Allow notifications for ServiceOS in your browser
3. If using the PWA, ensure it's installed properly
4. Try clearing the app cache and reinstalling

## Issue: Notification Shows Wrong Information

### Solutions
1. Refresh the page — notifications may be cached
2. Check if the related record was recently updated
3. Dismiss the notification and check the actual record
4. If persistent, report to support with the notification details`,
    category: 'troubleshooting',
    tagsJson: '["notifications","alerts","whatsapp","email","push"]',
    isPublic: true,
    sortOrder: 24,
  },
  {
    title: 'Common Integration Issues',
    content: `# Common Integration Issues

Troubleshoot problems with third-party integrations in ServiceOS.

## Issue: Google Calendar Sync Not Working

### Solutions
1. Go to Settings → Integrations → Google Calendar
2. Click **Reconnect** to re-authorize
3. Check that you granted calendar permissions
4. Verify the correct Google account is connected
5. Check for any permission popups that were blocked

## Issue: Payment Gateway Not Processing

### Solutions
1. Verify your payment gateway credentials are correct
2. Check that your account is active and not suspended
3. Ensure your plan includes online payment processing
4. Test with a small amount first
5. Check the payment gateway's status page for outages

## Issue: Meta/Facebook Ads Not Capturing Leads

### Solutions
1. Go to Settings → Integrations → Meta Lead Ads
2. Verify the Facebook connection is active
3. Check that lead forms are properly mapped
4. Ensure your ad campaigns are active
5. Check the lead capture webhook URL is correct

## Issue: Email Provider Not Sending

### Solutions
1. Check your email provider credentials (SMTP/API key)
2. Verify the sender email is verified
3. Check daily sending limits
4. Look at the email provider's error logs
5. Try sending a test email from Settings → Email Providers

## Issue: Webhook Not Triggering

### Solutions
1. Verify the webhook URL is accessible
2. Check that the correct events are selected
3. Test the webhook with a manual trigger
4. Check server logs for incoming requests
5. Ensure SSL certificate is valid

## General Integration Troubleshooting

1. **Disconnect and Reconnect** — Fixes most authentication issues
2. **Check API Keys** — Ensure they haven't expired or been regenerated
3. **Review Permissions** — Make sure all required permissions were granted
4. **Check Rate Limits** — Some integrations have daily/hourly limits
5. **Update Credentials** — If you changed your password, update it in ServiceOS too

## Getting Help
If you're still having issues:
1. Check the ServiceOS status page
2. Search the Knowledge Base for your specific integration
3. Submit a support ticket with:
   - Integration name
   - Error message (if any)
   - Steps you've already tried
   - Screenshots`,
    category: 'troubleshooting',
    tagsJson: '["integrations","google","payment","facebook","webhook","email"]',
    isPublic: true,
    sortOrder: 25,
  },

  // ═══════════════════════════════════════════════════════════
  // FAQ (6 articles)
  // ═══════════════════════════════════════════════════════════
  {
    title: 'How Do I Reset My Password?',
    content: `# How Do I Reset My Password

If you've forgotten your password, you can reset it easily.

## Option 1: From the Login Page
1. Go to the ServiceOS login page
2. Click **"Forgot Password?"** below the login form
3. Enter your email address
4. Check your email for a reset link
5. Click the link and set your new password
6. Log in with your new password

## Option 2: Ask Your Admin
If you're an employee and can't access the reset page:
1. Ask your admin/owner to send you a password reset
2. They can do this from Employees → Select you → Reset Password
3. You'll receive an email with a new setup link

## Option 3: Contact Support
If neither option works:
1. Go to the Help Center
2. Submit a support ticket
3. Include your email address
4. Our team will help you regain access

## Password Requirements
- Minimum 8 characters
- Mix of uppercase and lowercase letters recommended
- Include at least one number
- Special characters recommended but not required

## Tips
- Don't reuse passwords from other services
- Use a password manager to generate and store strong passwords
- Enable two-factor authentication (2FA) for extra security
- Change your password if you suspect it's been compromised`,
    category: 'faq',
    tagsJson: '["password","reset","login","account","security"]',
    isPublic: true,
    sortOrder: 30,
  },
  {
    title: 'Can I Customize My Branding?',
    content: `# Can I Customize My Branding?

Yes! ServiceOS supports extensive branding customization, especially on Pro and Enterprise plans.

## What You Can Customize

### Business Profile
- **Logo** — Upload your company logo (appears on invoices, portal, emails)
- **Business Name** — Displayed on all customer-facing pages
- **Colors** — Customize accent colors on the customer portal
- **Phone & Email** — Shown on invoices and communications

### Customer Portal
On Pro and Enterprise plans:
- **Custom Domain** — Use your own URL (e.g., portal.yourbusiness.com)
- **Branded Login Page** — Your logo, colors, and messaging
- **Custom Email Templates** — Your branding on all emails
- **White Label** — Remove ServiceOS branding entirely

### Invoice Branding
- **Logo** — Your company logo on every invoice
- **Business Details** — Name, address, tax ID
- **Custom Footer** — Add payment terms, thank you message, or legal text
- **Color Theme** — Match your brand colors

### WhatsApp Business
- **Business Profile** — Name, description, address
- **Greeting Message** — Custom auto-reply
- **Away Message** — Custom out-of-hours response
- **Quick Replies** — Pre-written responses for common questions

## How to Customize
1. Go to **Settings → Branding** (Pro plan and above)
2. Upload your logo and set your brand colors
3. Configure your customer portal appearance
4. Customize invoice templates
5. Set up your WhatsApp business profile

## Plan Limitations

| Feature | Starter | Growth | Pro | Enterprise |
|---------|---------|--------|-----|------------|
| Logo upload | ✅ | ✅ | ✅ | ✅ |
| Brand colors | ❌ | ✅ | ✅ | ✅ |
| Custom domain | ❌ | ❌ | ✅ | ✅ |
| White label | ❌ | ❌ | ✅ | ✅ |
| Custom email templates | ❌ | ❌ | ❌ | ✅ |`,
    category: 'faq',
    tagsJson: '["branding","customization","white label","logo","portal"]',
    isPublic: true,
    sortOrder: 31,
  },
  {
    title: 'What Are the Plan Limits?',
    content: `# What Are the Plan Limits?

ServiceOS offers four plans designed for businesses of different sizes.

## Plan Comparison

### Starter — Free Trial
- **Users**: 1
- **Jobs**: 100/month
- **Customers**: 500
- **Invoices**: 50/month
- **WhatsApp Messages**: 100/month
- **AI Interactions**: 100/month
- **Workflows**: 5
- **Storage**: 100 MB

### Growth — $25/month
- **Users**: 5
- **Jobs**: 500/month
- **Customers**: 5,000
- **Invoices**: 250/month
- **WhatsApp Messages**: 1,000/month
- **AI Interactions**: 500/month
- **Workflows**: 25
- **Storage**: 1 GB

### Pro — $50/month
- **Users**: 25
- **Jobs**: Unlimited
- **Customers**: Unlimited
- **Invoices**: Unlimited
- **WhatsApp Messages**: 5,000/month
- **AI Interactions**: 2,000/month
- **Workflows**: Unlimited
- **Storage**: 10 GB
- **Custom Domain**
- **White Label**

### Enterprise — Custom
- **Users**: Unlimited
- **Jobs**: Unlimited
- **Customers**: Unlimited
- **Invoices**: Unlimited
- **WhatsApp Messages**: Custom
- **AI Interactions**: Unlimited
- **Workflows**: Unlimited
- **Storage**: Custom
- **Dedicated Support**
- **SLA**
- **Custom Integrations**

## What Happens When You Hit a Limit?
- You'll receive a warning at 80% usage
- At 100%, the feature is paused (not deleted)
- You can upgrade your plan to increase limits
- Data is never deleted due to plan limits

## Checking Your Usage
1. Go to **Settings → Subscription**
2. View your current plan and usage
3. See how close you are to each limit
4. Upgrade if needed

## Can I Change Plans?
- **Upgrade** — Anytime, prorated
- **Downgrade** — At the end of your billing cycle
- **Cancel** — Anytime, access until end of billing period`,
    category: 'faq',
    tagsJson: '["plans","pricing","limits","subscription","billing"]',
    isPublic: true,
    sortOrder: 32,
  },
  {
    title: 'How Does the Free Trial Work?',
    content: `# How Does the Free Trial Work?

ServiceOS offers a 14-day free trial so you can experience everything before committing.

## Trial Features
During your trial, you get full access to the **Pro plan** features:
- Unlimited jobs and customers
- 5,000 WhatsApp messages
- 2,000 AI interactions
- All workflow automations
- Campaign builder
- Dispatch board
- Full invoicing
- Customer portal
- Reports and analytics

## Trial Duration
- **14 days** from account creation
- No credit card required to start
- You'll receive email reminders at day 7, 11, and 13

## What Happens When the Trial Ends?

### If You Subscribe
- All your data is preserved
- Your trial settings and configuration remain
- Simply pick your plan and enter payment
- No migration or setup needed

### If You Don't Subscribe
- Your account is paused (not deleted)
- You can still log in and view your data
- You cannot create new jobs, invoices, or bookings
- Data is retained for 30 days after trial end
- After 30 days, data may be permanently deleted

## During Your Trial

### Best Practices
1. **Complete onboarding** — Set up your profile, team, and services
2. **Create test data** — Add customers, jobs, and invoices
3. **Try all features** — Test campaigns, dispatch, and workflows
4. **Invite your team** — Get their feedback
5. **Use the mobile app** — Test the employee experience

### Getting Help
- Browse the Knowledge Base for guides
- Join our community for tips
- Contact support for any issues
- Schedule a demo for a guided walkthrough

## Converting to a Paid Plan
1. Go to **Settings → Subscription**
2. Choose your plan (Starter, Growth, or Pro)
3. Enter your payment details
4. Your trial data carries over seamlessly
5. Your billing cycle starts from the conversion date`,
    category: 'faq',
    tagsJson: '["trial","free","getting started","onboarding"]',
    isPublic: true,
    sortOrder: 33,
  },
  {
    title: 'How Do I Export My Data?',
    content: `# How Do I Export My Data

You own your data. Here's how to export it from ServiceOS.

## Exporting from the UI

### Customer List
1. Go to **Customers**
2. Click the **Export** button (or ⋮ menu → Export)
3. Choose format: CSV or Excel
4. The file downloads to your computer

### Invoices
1. Go to **Invoices**
2. Apply any filters you need
3. Click **Export**
4. Choose CSV or Excel format

### Jobs
1. Go to **Jobs**
2. Filter by date range, status, or employee
3. Click **Export**
4. Your filtered data downloads as CSV

### Leads
1. Go to **Leads** → **Pipeline**
2. Click **Export**
3. All leads (with your current filters) export to CSV

## Full Data Export

For a complete export of all your data:

1. Go to **Settings → Data Management**
2. Click **Export All Data**
3. ServiceOS prepares a complete archive including:
   - Customers
   - Jobs
   - Invoices and payments
   - Bookings
   - Leads
   - Employees
   - Campaigns
   - Conversations
   - Reviews
4. You'll receive an email when the export is ready (usually within 1 hour)
5. Download the archive (ZIP file with JSON/CSV files)

## Export Formats
- **CSV** — Best for Excel, Google Sheets, importing into other systems
- **Excel (.xlsx)** — Formatted spreadsheet with multiple sheets
- **JSON** — Developer-friendly, preserves all data structures
- **PDF** — Available for individual invoices and reports

## Importing Data
You can also import data into ServiceOS:
- **Customers** — Import from CSV (name, phone, email, address columns)
- **Services** — Import from CSV
- **Invoices** — Import from CSV

## Data Retention
- Active accounts: Data retained indefinitely
- Cancelled accounts: Data retained for 90 days
- After 90 days: Data permanently deleted
- You can request early deletion by contacting support`,
    category: 'faq',
    tagsJson: '["export","data","CSV","backup","import"]',
    isPublic: true,
    sortOrder: 34,
  },
  {
    title: 'Is My Data Secure?',
    content: `# Is My Data Secure?

Yes. ServiceOS takes data security very seriously. Here's how we protect your business data.

## Data Encryption
- **In Transit** — All data is encrypted using TLS 1.3 when transmitted
- **At Rest** — Database is encrypted using AES-256
- **Backups** — Encrypted and stored in geographically separate locations

## Access Control
- **Authentication** — JWT-based authentication with HTTP-only cookies
- **Role-Based Access** — Fine-grained permissions per role
- **Multi-Factor Authentication** — Available for all accounts
- **Session Management** — Auto-logout after inactivity
- **IP Whitelisting** — Available on Enterprise plan

## Infrastructure Security
- **Hosting** — AWS/GCP with SOC 2 Type II certification
- **DDoS Protection** — CloudFlare enterprise-level protection
- **Firewall** — Web Application Firewall (WAF) on all endpoints
- **Uptime** — 99.9% SLA with redundancy across availability zones
- **Monitoring** — 24/7 security monitoring and alerting

## Data Privacy
- **GDPR Compliant** — Full compliance with EU data protection laws
- **CCPA Compliant** — California Consumer Privacy Act compliance
- **Data Isolation** — Multi-tenant architecture with strict data separation
- **Row Level Security** — Database-level tenant isolation in Supabase
- **No Data Sharing** — We never sell or share your data with third parties

## Your Rights
- **Access** — View all data we hold about you
- **Export** — Download your data at any time
- **Delete** — Request permanent deletion
- **Correct** — Update inaccurate information
- **Object** — Opt out of data processing for marketing

## Compliance
- SOC 2 Type II (in progress)
- GDPR Article 28 (Data Processing Agreement available)
- CCPA
- HIPAA-ready configuration available on Enterprise

## Security Best Practices for Your Account
1. Use strong, unique passwords
2. Enable two-factor authentication
3. Regularly review employee access
4. Remove access for former employees immediately
5. Keep your email secure (it's used for password resets)
6. Review the audit log for suspicious activity

## Reporting Security Issues
If you discover a security vulnerability:
- Email: security@serviceos.cc
- We acknowledge reports within 24 hours
- Critical issues are addressed within 48 hours
- We offer bug bounties for confirmed vulnerabilities`,
    category: 'faq',
    tagsJson: '["security","privacy","encryption","GDPR","compliance"]',
    isPublic: true,
    sortOrder: 35,
  },

  // ═══════════════════════════════════════════════════════════
  // POLICIES (3 articles)
  // ═══════════════════════════════════════════════════════════
  {
    title: 'Data Privacy & Security Policy',
    content: `# Data Privacy & Security Policy

Last updated: January 2025

## 1. Overview
ServiceOS ("we", "our", "us") is committed to protecting the privacy and security of your data. This policy describes how we collect, use, store, and protect your information.

## 2. Data We Collect
- **Account Data** — Business name, email, phone, address provided during signup
- **Business Data** — Customers, jobs, invoices, bookings, and other records you create
- **Usage Data** — Feature usage, page views, and interaction patterns
- **Device Data** — Browser type, OS, IP address for security purposes
- **Communication Data** — WhatsApp messages, emails sent through our platform

## 3. How We Use Your Data
- To provide and improve our services
- To process transactions and send invoices
- To send service-related notifications
- To provide customer support
- To detect and prevent fraud
- To comply with legal obligations

## 4. Data Sharing
We do NOT sell your data. We share data only with:
- **Service Providers** — Cloud hosting, payment processing (as needed)
- **Legal Requirements** — When required by law or legal process
- **With Your Consent** — When you explicitly authorize sharing

## 5. Data Retention
- Active accounts: Data retained for the duration of your subscription
- Cancelled accounts: Data retained for 90 days, then permanently deleted
- Backups: Retained for 30 days after account closure
- Legal holds: Data may be retained longer if required by law

## 6. Your Rights (GDPR/CCPA)
- **Right to Access** — Request a copy of your data
- **Right to Rectification** — Correct inaccurate data
- **Right to Erasure** — Request deletion of your data
- **Right to Portability** — Export your data in a standard format
- **Right to Object** — Opt out of certain data processing
- **Right to Restrict** — Limit how we process your data

## 7. Data Security Measures
- AES-256 encryption at rest
- TLS 1.3 encryption in transit
- Row-level security for multi-tenant isolation
- Regular security audits and penetration testing
- 24/7 monitoring and incident response
- Employee access controls and audit logging

## 8. International Data Transfers
Data is processed in the region you select during signup. Cross-region transfers comply with applicable data protection laws.

## 9. Cookies
We use essential cookies for authentication and session management. Analytics cookies are optional and can be disabled.

## 10. Contact
For privacy inquiries: privacy@serviceos.cc
Data Protection Officer: dpo@serviceos.cc

## 11. Changes to This Policy
We may update this policy periodically. Material changes will be notified via email and in-app notification.`,
    category: 'policies',
    tagsJson: '["privacy","security","GDPR","data protection","policy"]',
    isPublic: true,
    sortOrder: 40,
  },
  {
    title: 'Service Level Agreement (SLA)',
    content: `# Service Level Agreement

Last updated: January 2025

## 1. Service Availability
ServiceOS targets **99.9% uptime** measured monthly, excluding:
- Scheduled maintenance windows (announced 72 hours in advance)
- Force majeure events
- Issues caused by third-party services
- Issues caused by customer configuration

## 2. Uptime Calculation
Uptime = (Total Minutes in Month − Downtime Minutes) / Total Minutes in Month × 100

## 3. Maintenance Windows
- **Scheduled Maintenance**: Sundays 02:00–06:00 UTC
- **Emergency Maintenance**: As needed with best-effort notification
- **Target Advance Notice**: 72 hours for scheduled, 1 hour for emergency

## 4. Support Response Times

| Plan | Critical | High | Medium | Low |
|------|----------|------|--------|-----|
| Starter | 24 hours | 48 hours | 72 hours | 1 week |
| Growth | 8 hours | 24 hours | 48 hours | 72 hours |
| Pro | 4 hours | 8 hours | 24 hours | 48 hours |
| Enterprise | 1 hour | 4 hours | 8 hours | 24 hours |

### Priority Definitions
- **Critical** — Service completely unavailable
- **High** — Major feature broken, workaround not available
- **Medium** — Feature partially broken, workaround available
- **Low** — Minor issue, cosmetic, or feature request

## 5. Data Backup
- **Frequency**: Daily automated backups
- **Retention**: 30 days
- **Recovery Point Objective (RPO)**: 24 hours
- **Recovery Time Objective (RTO)**: 4 hours
- **Geographic Redundancy**: Backups stored in separate region

## 6. Service Credits
If uptime falls below 99.9% in a calendar month:
- 99.0%–99.9%: 10% credit
- 95.0%–99.0%: 25% credit
- Below 95.0%: 50% credit

Credits are applied to the next billing cycle upon request.

## 7. Incident Communication
- **Status Page**: Updated in real-time during incidents
- **Email**: Notifications for incidents affecting your account
- **In-App**: Banner notification for ongoing incidents
- **Post-Incident**: RCA (Root Cause Analysis) within 5 business days

## 8. Exclusions
This SLA does not cover:
- Issues caused by customer's internet or infrastructure
- Third-party service outages (WhatsApp, email providers, etc.)
- Problems resulting from unauthorized modifications
- Force majeure events

## 9. Contact
- Support: help@serviceos.cc
- Emergency: +1-800-SERVICEOS
- Status Page: status.serviceos.cc`,
    category: 'policies',
    tagsJson: '["SLA","uptime","support","maintenance","policy"]',
    isPublic: true,
    sortOrder: 41,
  },
  {
    title: 'Acceptable Use Policy',
    content: `# Acceptable Use Policy

Last updated: January 2025

## 1. Purpose
This policy defines acceptable use of the ServiceOS platform to ensure a safe, reliable, and legal experience for all users.

## 2. Acceptable Use
You may use ServiceOS to:
- Manage your service business operations
- Communicate with your customers via approved channels
- Process business transactions (invoices, payments)
- Create and manage marketing campaigns (with proper consent)
- Analyze your business data
- Automate business workflows

## 3. Prohibited Uses
You may NOT use ServiceOS to:
- Send spam or unsolicited messages
- Violate any laws or regulations
- Infringe on intellectual property rights
- Harvest or collect personal data without consent
- Transmit malicious code or malware
- Attempt to gain unauthorized access to other accounts
- Use the platform for illegal or fraudulent activities
- Harass, threaten, or intimidate others
- Impersonate other people or businesses
- Share or sell customer data to third parties without consent
- Use automated tools to scrape or extract data excessively
- Reverse engineer, decompile, or disassemble the platform

## 4. WhatsApp Compliance
When using WhatsApp integration:
- Comply with WhatsApp Business API terms of service
- Obtain consent before sending marketing messages
- Honor opt-out requests immediately
- Don't send messages to numbers on Do Not Call registries
- Respect message template requirements
- Don't spoof sender information

## 5. Data Handling
- You own your business data
- You are responsible for data accuracy and legality
- You must comply with applicable data protection laws (GDPR, CCPA, etc.)
- You must not store sensitive data (SSN, credit card numbers) in text fields
- Use the platform's built-in security features (2FA, access controls)

## 6. Account Security
- Keep your credentials confidential
- Use strong passwords
- Enable two-factor authentication when available
- Report any unauthorized access immediately
- Remove access for departed employees promptly

## 7. Violations
Violations may result in:
- Warning
- Temporary account suspension
- Permanent account termination
- Legal action if warranted

## 8. Reporting Violations
Report suspected violations to: abuse@serviceos.cc

## 9. Changes
We may update this policy. Continued use after changes constitutes acceptance.`,
    category: 'policies',
    tagsJson: '["acceptable use","terms","policy","compliance","legal"]',
    isPublic: true,
    sortOrder: 42,
  },

  // ═══════════════════════════════════════════════════════════
  // GENERAL (2 articles)
  // ═══════════════════════════════════════════════════════════
  {
    title: 'Keyboard Shortcuts & Productivity Tips',
    content: `# Keyboard Shortcuts & Productivity Tips

Work faster in ServiceOS with these shortcuts and tips.

## Global Shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl/Cmd + K | Open search |
| Ctrl/Cmd + N | Create new (job, lead, invoice) |
| Ctrl/Cmd + / | Show keyboard shortcuts |
| Esc | Close dialog/dropdown |

## Navigation
- Use the sidebar to quickly switch between views
- Click the ServiceOS logo to return to the dashboard
- Use **breadcrumb navigation** to go back in context

## Productivity Tips

### Quick Actions
- Use the **Create button** (top of sidebar) to create any record from anywhere
- Dashboard quick actions: Add Lead, Create Job, Dispatch, Send WhatsApp

### Batch Operations
- Select multiple records with checkboxes
- Apply bulk status changes
- Export filtered lists

### Search
- **Global Search** (Ctrl+K): Search across customers, jobs, invoices, leads
- **In-Page Search**: Each list page has its own search bar
- Use quotes for exact match: "kitchen faucet"

### Filters & Views
- Save custom filter combinations
- Use tabs to switch between status views
- Sort by any column header

### Mobile Tips
- Install the PWA for quick access from your home screen
- Swipe on job cards for quick actions
- Use voice-to-text for notes and descriptions
- GPS check-in works automatically in the mobile app

### Dark Mode
- Toggle dark mode with the moon/sun icon in the header
- Easier on the eyes for evening work
- Respects your system preference by default

### Smart Defaults
- New jobs default to the last used service type
- Invoices auto-number sequentially
- Bookings inherit duration from service settings
- Customer info auto-fills from previous records`,
    category: 'general',
    tagsJson: '["shortcuts","productivity","tips","keyboard","search"]',
    isPublic: true,
    sortOrder: 50,
  },
  {
    title: 'Getting Help & Support',
    content: `# Getting Help & Support

We're here to help you succeed with ServiceOS. Here's how to get assistance when you need it.

## Self-Service Resources

### Knowledge Base
You're already here! Browse articles by category:
- **Getting Started** — New user guides and setup tutorials
- **Guides** — Detailed feature documentation
- **Troubleshooting** — Common issues and solutions
- **FAQ** — Quick answers to common questions
- **Policies** — Legal and compliance information

### Search Tips
- Use specific keywords (e.g., "invoice payment" instead of "money")
- Check the troubleshooting section first for errors
- Look at related articles shown at the bottom of each page

## Contact Support

### Submit a Ticket
1. Go to **Help & Support** → **My Tickets**
2. Click **New Ticket**
3. Fill in:
   - **Subject** — Brief summary of your issue
   - **Description** — Detailed explanation of the problem
   - **Category** — Select the most relevant category
   - **Priority** — How urgent is it?
4. Click **Submit**
5. You'll receive updates via email and in-app notifications

### Support Hours
- **Starter Plan**: Business hours (9 AM–6 PM, Mon–Fri)
- **Growth Plan**: Extended hours (8 AM–10 PM, Mon–Sat)
- **Pro Plan**: Priority support (7 AM–12 AM, 7 days)
- **Enterprise**: 24/7 dedicated support

### Response Times
See our SLA for guaranteed response times by plan and priority level.

## Community
- **User Forum** — Share tips and ask questions
- **Webinars** — Weekly feature walkthroughs
- **Blog** — Best practices and feature announcements

## Feature Requests
Have an idea for a new feature?
1. Submit a ticket with type "Feature Request"
2. Describe the problem you're trying to solve
3. We review all requests and prioritize based on demand
4. You'll be notified if your request is implemented

## Emergency Support
For critical issues (service completely down):
- Pro & Enterprise: Call our emergency line
- All plans: Submit a ticket with "Urgent" priority
- We respond to urgent tickets within the SLA timeframe`,
    category: 'general',
    tagsJson: '["support","help","ticket","contact","service"]',
    isPublic: true,
    sortOrder: 51,
  },
];
