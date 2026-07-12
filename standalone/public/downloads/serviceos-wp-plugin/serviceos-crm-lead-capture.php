<?php
/**
 * Plugin Name: ServiceOS CRM - Lead Capture
 * Plugin URI: https://serviceos.com
 * Description: Captures Contact Form 7 submissions and sends them to your ServiceOS CRM as leads. Auto-maps CF7 fields to CRM lead fields.
 * Version: 1.0.0
 * Author: ServiceOS
 * Author URI: https://serviceos.com
 * License: GPL v2 or later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: serviceos-crm-lead-capture
 * Domain Path: /languages
 * Requires at least: 5.0
 * Requires PHP: 7.4
 */

// Exit if accessed directly
if (!defined('ABSPATH')) {
    exit;
}

// ─── Constants ────────────────────────────────────────────────────────────────

define('SERVICEOS_VERSION', '1.0.0');
define('SERVICEOS_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('SERVICEOS_PLUGIN_URL', plugin_dir_url(__FILE__));
define('SERVICEOS_OPTION_KEY', 'serviceos_crm_settings');
define('SERVICEOS_LOG_OPTION', 'serviceos_crm_logs');

// ─── Activation / Deactivation ────────────────────────────────────────────────

register_activation_hook(__FILE__, 'serviceos_activate');
register_deactivation_hook(__FILE__, 'serviceos_deactivate');

function serviceos_activate() {
    $defaults = array(
        'api_url'      => '',
        'api_key'      => '',
        'tenant_id'    => '',
        'enabled'      => true,
        'debug_mode'   => false,
        'cf7_enabled'  => true,
        'wpforms_enabled' => false,
        'gravity_enabled' => false,
    );
    if (false === get_option(SERVICEOS_OPTION_KEY)) {
        add_option(SERVICEOS_OPTION_KEY, $defaults);
    }
    // Initialize log storage
    if (false === get_option(SERVICEOS_LOG_OPTION)) {
        add_option(SERVICEOS_LOG_OPTION, array());
    }
}

function serviceos_deactivate() {
    // Clean up transients but preserve settings
    delete_transient('serviceos_connection_test');
}

// ─── Settings Page ────────────────────────────────────────────────────────────

add_action('admin_menu', 'serviceos_add_admin_menu');

function serviceos_add_admin_menu() {
    add_options_page(
        'ServiceOS CRM Settings',
        'ServiceOS CRM',
        'manage_options',
        'serviceos-crm',
        'serviceos_settings_page'
    );
}

add_action('admin_init', 'serviceos_settings_init');

function serviceos_settings_init() {
    register_setting('serviceos_crm', SERVICEOS_OPTION_KEY, 'serviceos_sanitize_settings');

    // ─── Connection Section ───────────────────────────────────────────────
    add_settings_section(
        'serviceos_connection_section',
        'API Connection',
        'serviceos_connection_section_callback',
        'serviceos_crm'
    );

    add_settings_field(
        'api_url',
        'API URL',
        'serviceos_api_url_render',
        'serviceos_crm',
        'serviceos_connection_section'
    );

    add_settings_field(
        'api_key',
        'API Key',
        'serviceos_api_key_render',
        'serviceos_crm',
        'serviceos_connection_section'
    );

    add_settings_field(
        'tenant_id',
        'Tenant ID',
        'serviceos_tenant_id_render',
        'serviceos_crm',
        'serviceos_connection_section'
    );

    // ─── Features Section ─────────────────────────────────────────────────
    add_settings_section(
        'serviceos_features_section',
        'Integration Features',
        'serviceos_features_section_callback',
        'serviceos_crm'
    );

    add_settings_field(
        'enabled',
        'Enable Integration',
        'serviceos_enabled_render',
        'serviceos_crm',
        'serviceos_features_section'
    );

    add_settings_field(
        'cf7_enabled',
        'Contact Form 7',
        'serviceos_cf7_enabled_render',
        'serviceos_crm',
        'serviceos_features_section'
    );

    add_settings_field(
        'wpforms_enabled',
        'WPForms',
        'serviceos_wpforms_enabled_render',
        'serviceos_crm',
        'serviceos_features_section'
    );

    add_settings_field(
        'gravity_enabled',
        'Gravity Forms',
        'serviceos_gravity_enabled_render',
        'serviceos_crm',
        'serviceos_features_section'
    );

    add_settings_field(
        'debug_mode',
        'Debug Mode',
        'serviceos_debug_mode_render',
        'serviceos_crm',
        'serviceos_features_section'
    );
}

// ─── Settings Field Renderers ─────────────────────────────────────────────────

function serviceos_get_settings() {
    return get_option(SERVICEOS_OPTION_KEY, array());
}

function serviceos_api_url_render() {
    $settings = serviceos_get_settings();
    $value = isset($settings['api_url']) ? esc_attr($settings['api_url']) : '';
    echo '<input type="url" name="' . SERVICEOS_OPTION_KEY . '[api_url]" value="' . $value . '" 
          class="regular-text" placeholder="https://app.yourcrm.com/api" 
          style="min-width:400px;" />';
    echo '<p class="description">Your ServiceOS API base URL (e.g., https://app.yourcrm.com/api)</p>';
}

function serviceos_api_key_render() {
    $settings = serviceos_get_settings();
    $value = isset($settings['api_key']) ? esc_attr($settings['api_key']) : '';
    echo '<input type="password" name="' . SERVICEOS_OPTION_KEY . '[api_key]" value="' . $value . '" 
          class="regular-text" placeholder="ff_prod_xxxxxxxxxxxx" 
          style="min-width:400px;" />';
    echo '<p class="description">API key from Settings → API Keys in your ServiceOS dashboard</p>';
}

function serviceos_tenant_id_render() {
    $settings = serviceos_get_settings();
    $value = isset($settings['tenant_id']) ? esc_attr($settings['tenant_id']) : '';
    echo '<input type="text" name="' . SERVICEOS_OPTION_KEY . '[tenant_id]" value="' . $value . '" 
          class="regular-text" placeholder="cltxxxxxxxxxx" />';
    echo '<p class="description">Your Tenant ID (found in Settings → General). Optional if API key is tenant-scoped.</p>';
}

function serviceos_enabled_render() {
    $settings = serviceos_get_settings();
    $checked = !empty($settings['enabled']) ? 'checked' : '';
    echo '<label><input type="checkbox" name="' . SERVICEOS_OPTION_KEY . '[enabled]" value="1" ' . $checked . ' /> Enable lead capture and sync to ServiceOS</label>';
}

function serviceos_cf7_enabled_render() {
    $settings = serviceos_get_settings();
    $checked = !empty($settings['cf7_enabled']) ? 'checked' : '';
    echo '<label><input type="checkbox" name="' . SERVICEOS_OPTION_KEY . '[cf7_enabled]" value="1" ' . $checked . ' /> Capture Contact Form 7 submissions</label>';
    echo '<p class="description" style="color:' . (class_exists('WPCF7_ContactForm') ? '#22c55e' : '#ef4444') . ';">' 
         . (class_exists('WPCF7_ContactForm') ? '✓ Contact Form 7 is active' : '✗ Contact Form 7 is not installed/active') 
         . '</p>';
}

function serviceos_wpforms_enabled_render() {
    $settings = serviceos_get_settings();
    $checked = !empty($settings['wpforms_enabled']) ? 'checked' : '';
    echo '<label><input type="checkbox" name="' . SERVICEOS_OPTION_KEY . '[wpforms_enabled]" value="1" ' . $checked . ' /> Capture WPForms submissions</label>';
    echo '<p class="description" style="color:' . (function_exists('wpforms') ? '#22c55e' : '#ef4444') . ';">' 
         . (function_exists('wpforms') ? '✓ WPForms is active' : '✗ WPForms is not installed/active') 
         . '</p>';
}

function serviceos_gravity_enabled_render() {
    $settings = serviceos_get_settings();
    $checked = !empty($settings['gravity_enabled']) ? 'checked' : '';
    echo '<label><input type="checkbox" name="' . SERVICEOS_OPTION_KEY . '[gravity_enabled]" value="1" ' . $checked . ' /> Capture Gravity Forms submissions</label>';
    echo '<p class="description" style="color:' . (class_exists('GFForms') ? '#22c55e' : '#ef4444') . ';">' 
         . (class_exists('GFForms') ? '✓ Gravity Forms is active' : '✗ Gravity Forms is not installed/active') 
         . '</p>';
}

function serviceos_debug_mode_render() {
    $settings = serviceos_get_settings();
    $checked = !empty($settings['debug_mode']) ? 'checked' : '';
    echo '<label><input type="checkbox" name="' . SERVICEOS_OPTION_KEY . '[debug_mode]" value="1" ' . $checked . ' /> Log all API requests and responses</label>';
    echo '<p class="description">Check the ServiceOS Logs tab below to see debug output.</p>';
}

function serviceos_connection_section_callback() {
    echo '<p>Configure the connection to your ServiceOS CRM instance. Get these values from your ServiceOS dashboard under Settings → API Keys.</p>';
}

function serviceos_features_section_callback() {
    echo '<p>Choose which form plugins to integrate with. Only active form plugins will be available.</p>';
}

function serviceos_sanitize_settings($input) {
    $sanitized = array();

    $sanitized['api_url'] = esc_url_raw(trim($input['api_url']));
    $sanitized['api_key'] = sanitize_text_field(trim($input['api_key']));
    $sanitized['tenant_id'] = sanitize_text_field(trim($input['tenant_id']));
    $sanitized['enabled'] = !empty($input['enabled']) ? true : false;
    $sanitized['cf7_enabled'] = !empty($input['cf7_enabled']) ? true : false;
    $sanitized['wpforms_enabled'] = !empty($input['wpforms_enabled']) ? true : false;
    $sanitized['gravity_enabled'] = !empty($input['gravity_enabled']) ? true : false;
    $sanitized['debug_mode'] = !empty($input['debug_mode']) ? true : false;

    return $sanitized;
}

// ─── Settings Page HTML ───────────────────────────────────────────────────────

function serviceos_settings_page() {
    $settings = serviceos_get_settings();
    $active_tab = isset($_GET['tab']) ? sanitize_text_field($_GET['tab']) : 'settings';
    ?>
    <div class="wrap">
        <h1 style="display:flex;align-items:center;gap:12px;">
            <span style="display:inline-flex;align-items:center;justify-content:center;width:36px;height:36px;background:#10b981;border-radius:8px;">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            </span>
            ServiceOS CRM — Lead Capture
        </h1>

        <nav class="nav-tab-wrapper" style="margin-top:16px;">
            <a href="?page=serviceos-crm&tab=settings" class="nav-tab <?php echo $active_tab === 'settings' ? 'nav-tab-active' : ''; ?>">Settings</a>
            <a href="?page=serviceos-crm&tab=field-mapping" class="nav-tab <?php echo $active_tab === 'field-mapping' ? 'nav-tab-active' : ''; ?>">Field Mapping</a>
            <a href="?page=serviceos-crm&tab=logs" class="nav-tab <?php echo $active_tab === 'logs' ? 'nav-tab-active' : ''; ?>">Logs</a>
            <a href="?page=serviceos-crm&tab=help" class="nav-tab <?php echo $active_tab === 'help' ? 'nav-tab-active' : ''; ?>">Help</a>
        </nav>

        <?php if ($active_tab === 'settings'): ?>
            <!-- ─── Connection Test ─────────────────────────────────────── -->
            <div style="margin-top:20px;margin-bottom:20px;">
                <?php
                $is_configured = !empty($settings['api_url']) && !empty($settings['api_key']);
                if ($is_configured):
                    $test_result = get_transient('serviceos_connection_test');
                    if ($test_result === 'ok'):
                ?>
                    <div class="notice notice-success inline" style="padding:12px 16px;display:flex;align-items:center;gap:8px;">
                        <span style="color:#22c55e;font-size:18px;">✓</span>
                        <span><strong>Connected!</strong> API connection verified successfully.</span>
                    </div>
                <?php elseif ($test_result === 'fail'): ?>
                    <div class="notice notice-error inline" style="padding:12px 16px;display:flex;align-items:center;gap:8px;">
                        <span style="color:#ef4444;font-size:18px;">✗</span>
                        <span><strong>Connection Failed.</strong> Check your API URL and API Key.</span>
                    </div>
                <?php endif; ?>
                <?php else: ?>
                    <div class="notice notice-warning inline" style="padding:12px 16px;">
                        <span>⚠ Configure your API URL and API Key to start capturing leads.</span>
                    </div>
                <?php endif; ?>
            </div>

            <form action="options.php" method="post">
                <?php
                settings_fields('serviceos_crm');
                do_settings_sections('serviceos_crm');
                ?>
                <p class="submit" style="display:flex;gap:12px;align-items:center;">
                    <?php submit_button('Save Settings', 'primary', 'submit', false); ?>
                    <?php if ($is_configured): ?>
                        <button type="button" id="serviceos-test-btn" class="button button-secondary">Test Connection</button>
                    <?php endif; ?>
                </p>
            </form>

            <?php if ($is_configured): ?>
            <script>
            jQuery(document).ready(function($) {
                $('#serviceos-test-btn').on('click', function() {
                    var btn = $(this);
                    btn.prop('disabled', true).text('Testing...');
                    $.ajax({
                        url: ajaxurl,
                        method: 'POST',
                        data: {
                            action: 'serviceos_test_connection',
                            nonce: '<?php echo wp_create_nonce("serviceos_test"); ?>'
                        },
                        success: function(response) {
                            if (response.success) {
                                btn.after('<span style="color:#22c55e;margin-left:12px;">✓ Connected!</span>');
                            } else {
                                btn.after('<span style="color:#ef4444;margin-left:12px;">✗ Failed: ' + response.data + '</span>');
                            }
                        },
                        complete: function() {
                            btn.prop('disabled', false).text('Test Connection');
                            setTimeout(function() { location.reload(); }, 2000);
                        }
                    });
                });
            });
            </script>
            <?php endif; ?>

        <?php elseif ($active_tab === 'field-mapping'): ?>
            <!-- ─── Field Mapping Guide ─────────────────────────────────── -->
            <div style="margin-top:20px;">
                <h2>Automatic Field Mapping</h2>
                <p>ServiceOS automatically maps your form fields to CRM lead fields. Use these field names in your forms for best results:</p>

                <table class="widefat striped" style="max-width:700px;">
                    <thead>
                        <tr>
                            <th>CRM Field</th>
                            <th>Accepted Form Field Names</th>
                            <th>Required</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td><strong>Name</strong></td>
                            <td><code>name</code>, <code>your-name</code>, <code>full_name</code>, <code>fullname</code>, <code>customer_name</code>, <code>contact_name</code></td>
                            <td>Yes*</td>
                        </tr>
                        <tr>
                            <td><strong>Phone</strong></td>
                            <td><code>phone</code>, <code>your-phone</code>, <code>phone_number</code>, <code>mobile</code>, <code>tel</code>, <code>telephone</code></td>
                            <td>Yes*</td>
                        </tr>
                        <tr>
                            <td><strong>Email</strong></td>
                            <td><code>email</code>, <code>your-email</code>, <code>email_address</code></td>
                            <td>No</td>
                        </tr>
                        <tr>
                            <td><strong>Company</strong></td>
                            <td><code>company</code>, <code>your-company</code>, <code>company_name</code>, <code>organization</code></td>
                            <td>No</td>
                        </tr>
                        <tr>
                            <td><strong>Service</strong></td>
                            <td><code>service</code>, <code>your-service</code>, <code>service_type</code>, <code>subject</code></td>
                            <td>No</td>
                        </tr>
                        <tr>
                            <td><strong>Message</strong></td>
                            <td><code>message</code>, <code>your-message</code>, <code>notes</code>, <code>comments</code></td>
                            <td>No</td>
                        </tr>
                        <tr>
                            <td><strong>Address</strong></td>
                            <td><code>address</code>, <code>your-address</code>, <code>location</code>, <code>city</code></td>
                            <td>No</td>
                        </tr>
                    </tbody>
                </table>
                <p style="margin-top:12px;"><em>* At least Name or Phone is required. Unmapped fields are captured as additional notes.</em></p>

                <h3 style="margin-top:24px;">Contact Form 7 Example</h3>
                <div style="background:#1e293b;color:#e2e8f0;padding:20px;border-radius:8px;font-family:monospace;font-size:13px;overflow-x:auto;max-width:700px;">
                    <pre>&lt;label&gt; Your Name (required)
    [text* your-name] &lt;/label&gt;

&lt;label&gt; Your Email (required)
    [email* your-email] &lt;/label&gt;

&lt;label&gt; Phone Number (required)
    [tel* your-phone] &lt;/label&gt;

&lt;label&gt; Company
    [text your-company] &lt;/label&gt;

&lt;label&gt; Service Needed
    [select your-service "Plumbing" "Electrical" "Cleaning" "Other"] &lt;/label&gt;

&lt;label&gt; Your Message
    [textarea your-message] &lt;/label&gt;

[submit "Send"]</pre>
                </div>
            </div>

        <?php elseif ($active_tab === 'logs'): ?>
            <!-- ─── Logs ─────────────────────────────────────────────────── -->
            <div style="margin-top:20px;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
                    <h2>Integration Logs</h2>
                    <button type="button" class="button button-secondary" onclick="if(confirm('Clear all logs?')){jQuery.post(ajaxurl,{action:'serviceos_clear_logs',nonce:'<?php echo wp_create_nonce("serviceos_clear"); ?>'},function(){location.reload();})}">Clear Logs</button>
                </div>
                <?php
                $logs = get_option(SERVICEOS_LOG_OPTION, array());
                if (empty($logs)):
                ?>
                    <p style="color:#94a3b8;">No logs yet. Submit a form to see activity here.</p>
                <?php else: ?>
                    <table class="widefat striped">
                        <thead>
                            <tr>
                                <th style="width:150px;">Time</th>
                                <th style="width:80px;">Status</th>
                                <th>Details</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach (array_reverse(array_slice($logs, -50)) as $log): ?>
                            <tr>
                                <td style="font-size:12px;"><?php echo esc_html($log['time']); ?></td>
                                <td>
                                    <span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;
                                        <?php echo $log['status'] === 'success' ? 'background:#dcfce7;color:#166534;' : 'background:#fee2e2;color:#991b1b;'; ?>">
                                        <?php echo esc_html(strtoupper($log['status'])); ?>
                                    </span>
                                </td>
                                <td style="font-size:13px;"><?php echo esc_html($log['message']); ?></td>
                            </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                <?php endif; ?>
            </div>

        <?php elseif ($active_tab === 'help'): ?>
            <!-- ─── Help ─────────────────────────────────────────────────── -->
            <div style="margin-top:20px;max-width:700px;">
                <h2>Setup Guide</h2>

                <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:20px;margin-bottom:20px;">
                    <h3 style="margin-top:0;color:#166534;">Quick Setup (5 minutes)</h3>
                    <ol>
                        <li><strong>Get your API credentials</strong> — In ServiceOS, go to Settings → API Keys and generate a new key</li>
                        <li><strong>Enter the credentials</strong> — On the Settings tab above, enter your API URL and API Key</li>
                        <li><strong>Set your Tenant ID</strong> — Found in ServiceOS Settings → General</li>
                        <li><strong>Enable Contact Form 7</strong> — Make sure the CF7 checkbox is checked</li>
                        <li><strong>Test the connection</strong> — Click "Test Connection" to verify</li>
                        <li><strong>Submit a test form</strong> — Fill out a CF7 form and check the Logs tab</li>
                    </ol>
                </div>

                <h3>Data Flow</h3>
                <div style="background:#1e293b;color:#e2e8f0;padding:20px;border-radius:8px;font-family:monospace;font-size:13px;">
Contact Form 7 Submission
        ↓
Plugin intercepts (wpcf7_mail_sent hook)
        ↓
Maps CF7 fields → CRM lead fields
        ↓
Sends to: YOUR_API_URL/wordpress/leads
        ↓
ServiceOS creates Lead + Activity Log
        ↓
Lead appears in CRM dashboard
                </div>

                <h3 style="margin-top:24px;">API Endpoint</h3>
                <p>Your WordPress site sends data to:</p>
                <div style="background:#f1f5f9;border:1px solid #e2e8f0;border-radius:8px;padding:16px;font-family:monospace;font-size:13px;">
                    <strong>POST</strong> {API_URL}/wordpress/leads<br>
                    <strong>Header:</strong> Authorization: Bearer {API_KEY}<br>
                    <strong>Body:</strong> JSON form data<br>
                    <strong>Response:</strong> { success: true, lead: { id, name, ... } }
                </div>

                <h3 style="margin-top:24px;">Troubleshooting</h3>
                <ul>
                    <li><strong>No leads appearing?</strong> — Check the Logs tab and enable Debug Mode</li>
                    <li><strong>401 Unauthorized?</strong> — Verify your API Key is correct</li>
                    <li><strong>400 Validation error?</strong> — Ensure your form has at least a name or phone field</li>
                    <li><strong>500 Server error?</strong> — Check your API URL is correct and reachable</li>
                </ul>

                <h3 style="margin-top:24px;">Requirements</h3>
                <ul>
                    <li>WordPress 5.0 or higher</li>
                    <li>PHP 7.4 or higher</li>
                    <li>Contact Form 7, WPForms, or Gravity Forms (at least one)</li>
                    <li>ServiceOS account with API access</li>
                </ul>
            </div>
        <?php endif; ?>
    </div>
    <?php
}

// ─── AJAX: Test Connection ────────────────────────────────────────────────────

add_action('wp_ajax_serviceos_test_connection', 'serviceos_ajax_test_connection');

function serviceos_ajax_test_connection() {
    check_ajax_referer('serviceos_test', 'nonce');

    $settings = serviceos_get_settings();
    $api_url = trailingslashit($settings['api_url']) . 'wordpress/leads';
    $api_key = $settings['api_key'];

    $response = wp_remote_get($api_url, array(
        'headers' => array(
            'Authorization' => 'Bearer ' . $api_key,
            'Content-Type'  => 'application/json',
        ),
        'timeout' => 15,
    ));

    if (is_wp_error($response)) {
        set_transient('serviceos_connection_test', 'fail', HOUR_IN_SECONDS);
        wp_send_json_error($response->get_error_message());
    }

    $code = wp_remote_retrieve_response_code($response);
    if ($code === 200) {
        set_transient('serviceos_connection_test', 'ok', HOUR_IN_SECONDS);
        wp_send_json_success('Connection verified!');
    } else {
        set_transient('serviceos_connection_test', 'fail', HOUR_IN_SECONDS);
        $body = json_decode(wp_remote_retrieve_body($response), true);
        wp_send_json_error(isset($body['message']) ? $body['message'] : "HTTP $code");
    }
}

// ─── AJAX: Clear Logs ─────────────────────────────────────────────────────────

add_action('wp_ajax_serviceos_clear_logs', 'serviceos_ajax_clear_logs');

function serviceos_ajax_clear_logs() {
    check_ajax_referer('serviceos_clear', 'nonce');
    update_option(SERVICEOS_LOG_OPTION, array());
    wp_send_json_success();
}

// ─── Logging ──────────────────────────────────────────────────────────────────

function serviceos_log($status, $message) {
    $settings = serviceos_get_settings();
    if (empty($settings['debug_mode']) && $status === 'debug') return;

    $logs = get_option(SERVICEOS_LOG_OPTION, array());
    $logs[] = array(
        'time'    => current_time('mysql'),
        'status'  => $status,
        'message' => $message,
    );

    // Keep only last 200 entries
    if (count($logs) > 200) {
        $logs = array_slice($logs, -200);
    }

    update_option(SERVICEOS_LOG_OPTION, $logs);
}

// ─── Core: Send Lead to ServiceOS ─────────────────────────────────────────────

function serviceos_send_lead($data) {
    $settings = serviceos_get_settings();

    // Check if integration is enabled
    if (empty($settings['enabled'])) {
        serviceos_log('debug', 'Integration is disabled. Skipping.');
        return false;
    }

    if (empty($settings['api_url']) || empty($settings['api_key'])) {
        serviceos_log('error', 'API URL or API Key is not configured.');
        return false;
    }

    // Add tenant_id if configured
    if (!empty($settings['tenant_id'])) {
        $data['tenantId'] = $settings['tenant_id'];
    }

    $api_url = trailingslashit($settings['api_url']) . 'wordpress/leads';

    serviceos_log('debug', 'Sending to: ' . $api_url);
    serviceos_log('debug', 'Data: ' . wp_json_encode($data));

    $response = wp_remote_post($api_url, array(
        'headers' => array(
            'Authorization' => 'Bearer ' . $settings['api_key'],
            'Content-Type'  => 'application/json',
        ),
        'body'    => wp_json_encode($data),
        'timeout' => 30,
    ));

    if (is_wp_error($response)) {
        $error_msg = $response->get_error_message();
        serviceos_log('error', 'Request failed: ' . $error_msg);
        return false;
    }

    $code = wp_remote_retrieve_response_code($response);
    $body = wp_remote_retrieve_body($response);
    $result = json_decode($body, true);

    if ($code === 201 && !empty($result['success'])) {
        $lead_name = isset($result['lead']['name']) ? $result['lead']['name'] : 'Unknown';
        $lead_id = isset($result['lead']['id']) ? $result['lead']['id'] : 'N/A';
        serviceos_log('success', "Lead created: {$lead_name} (ID: {$lead_id})");
        return $result;
    } else {
        $error = isset($result['message']) ? $result['message'] : (isset($result['error']) ? $result['error'] : "HTTP $code");
        serviceos_log('error', "Failed (HTTP $code): {$error}");
        return false;
    }
}

// ─── Hook: Contact Form 7 ─────────────────────────────────────────────────────

add_action('wpcf7_mail_sent', 'serviceos_cf7_handler');

function serviceos_cf7_handler($contact_form) {
    $settings = serviceos_get_settings();

    if (empty($settings['cf7_enabled'])) {
        return;
    }

    $submission = WPCF7_Submission::get_instance();

    if (!$submission) {
        serviceos_log('error', 'CF7: No submission instance found.');
        return;
    }

    $data = $submission->get_posted_data();
    $form_id = $contact_form->id();
    $form_title = $contact_form->title();

    serviceos_log('debug', "CF7 submission received: Form #{$form_id} - {$form_title}");

    // Remove internal CF7 fields
    unset($data['_wpcf7']);
    unset($data['_wpcf7_version']);
    unset($data['_wpcf7_locale']);
    unset($data['_wpcf7_unit_tag']);
    unset($data['_wpcf7_container_post']);
    unset($data['_wpcf7_posted_data_hash']);
    unset($data['_wpcf7_recaptcha_response']);

    // Add form metadata
    $data['_form_source'] = 'contact-form-7';
    $data['_form_id'] = $form_id;
    $data['_form_title'] = $form_title;
    $data['_source_url'] = $submission->get_meta('url');
    $data['_ip_address'] = $submission->get_meta('remote_ip');
    $data['_user_agent'] = $submission->get_meta('user_agent');

    serviceos_send_lead($data);
}

// ─── Hook: WPForms ────────────────────────────────────────────────────────────

add_action('wpforms_process_complete', 'serviceos_wpforms_handler', 10, 4);

function serviceos_wpforms_handler($fields, $entry, $form_data, $entry_id) {
    $settings = serviceos_get_settings();

    if (empty($settings['wpforms_enabled'])) {
        return;
    }

    serviceos_log('debug', "WPForms submission received: Form #{$form_data['id']} - {$form_data['settings']['form_title']}");

    $data = array();

    // Map WPForms fields
    foreach ($fields as $field) {
        $key = sanitize_key($field['name']);
        if (empty($key)) {
            $key = 'field_' . $field['id'];
        }
        $data[$key] = $field['value'];
    }

    // Add form metadata
    $data['_form_source'] = 'wpforms';
    $data['_form_id'] = $form_data['id'];
    $data['_form_title'] = $form_data['settings']['form_title'];

    serviceos_send_lead($data);
}

// ─── Hook: Gravity Forms ──────────────────────────────────────────────────────

add_action('gform_after_submission', 'serviceos_gravity_handler', 10, 2);

function serviceos_gravity_handler($entry, $form) {
    $settings = serviceos_get_settings();

    if (empty($settings['gravity_enabled'])) {
        return;
    }

    serviceos_log('debug', "Gravity Forms submission received: Form #{$form['id']} - {$form['title']}");

    $data = array();

    // Map Gravity Forms fields
    foreach ($form['fields'] as $field) {
        $value = rgars($entry, $field->id);
        if (!empty($value)) {
            $key = sanitize_key($field->label);
            if (empty($key)) {
                $key = 'field_' . $field->id;
            }
            $data[$key] = $value;
        }
    }

    // Add form metadata
    $data['_form_source'] = 'gravity-forms';
    $data['_form_id'] = $form['id'];
    $data['_form_title'] = $form['title'];
    $data['_source_url'] = rgars($entry, 'source_url');
    $data['_ip_address'] = rgars($entry, 'ip');

    serviceos_send_lead($data);
}

// ─── Admin Bar Indicator ──────────────────────────────────────────────────────

add_action('admin_bar_menu', 'serviceos_admin_bar', 100);

function serviceos_admin_bar($wp_admin_bar) {
    $settings = serviceos_get_settings();
    if (empty($settings['enabled'])) return;

    $is_connected = get_transient('serviceos_connection_test') === 'ok';

    $wp_admin_bar->add_node(array(
        'id'     => 'serviceos-status',
        'title'  => $is_connected 
            ? '<span style="color:#22c55e;">●</span> ServiceOS Connected' 
            : '<span style="color:#ef4444;">●</span> ServiceOS Disconnected',
        'href'   => admin_url('options-general.php?page=serviceos-crm'),
        'parent' => 'top-secondary',
    ));
}

// ─── Plugin Row Meta ──────────────────────────────────────────────────────────

add_filter('plugin_row_meta', 'serviceos_plugin_row_meta', 10, 2);

function serviceos_plugin_row_meta($links, $file) {
    if (plugin_basename(__FILE__) === $file) {
        $links[] = '<a href="https://serviceos.com/docs/wordpress" target="_blank">Documentation</a>';
        $links[] = '<a href="https://serviceos.com/support" target="_blank">Support</a>';
    }
    return $links;
}
