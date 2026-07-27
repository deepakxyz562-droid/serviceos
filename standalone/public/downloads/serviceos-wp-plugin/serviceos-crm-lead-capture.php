<?php
/**
 * Plugin Name: ServiceOS CRM - Lead Capture
 * Plugin URI: https://serviceos.com
 * Description: Injects a universal JavaScript form capture script on every page. Works with Contact Form 7, WPForms, Gravity Forms, Ninja Forms, Fluent Forms, Elementor Forms, Formidable, MetForm, Everest Forms, HTML forms, and custom forms — automatically.
 * Version: 2.0.0
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

define('SERVICEOS_VERSION', '2.0.0');
define('SERVICEOS_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('SERVICEOS_PLUGIN_URL', plugin_dir_url(__FILE__));
define('SERVICEOS_OPTION_KEY', 'serviceos_crm_settings');
define('SERVICEOS_LOG_OPTION', 'serviceos_crm_logs');

// ─── Activation / Deactivation ────────────────────────────────────────────────

register_activation_hook(__FILE__, 'serviceos_activate');
register_deactivation_hook(__FILE__, 'serviceos_deactivate');

function serviceos_activate() {
    $defaults = array(
        'api_url'         => '',
        'api_key'         => '',
        'tenant_id'       => '',
        'enabled'         => true,
        'debug_mode'      => false,
        'intercept_ajax'  => false,
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
        'ServiceOS URL',
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
        'Capture Options',
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
        'intercept_ajax',
        'AJAX Interception',
        'serviceos_intercept_ajax_render',
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
    $defaults = array(
        'api_url'         => '',
        'api_key'         => '',
        'tenant_id'       => '',
        'enabled'         => true,
        'debug_mode'      => false,
        'intercept_ajax'  => false,
    );
    $stored = get_option(SERVICEOS_OPTION_KEY, array());
    if (!is_array($stored)) $stored = array();
    return array_merge($defaults, $stored);
}

function serviceos_api_url_render() {
    $settings = serviceos_get_settings();
    $value = isset($settings['api_url']) ? esc_attr($settings['api_url']) : '';
    echo '<input type="url" name="' . SERVICEOS_OPTION_KEY . '[api_url]" value="' . $value . '" '
        . 'class="regular-text" placeholder="https://app.yourcrm.com" '
        . 'style="min-width:400px;" />';
    echo '<p class="description">Your ServiceOS base URL (e.g., https://app.yourcrm.com). The plugin loads /embed.js from this domain.</p>';
}

function serviceos_api_key_render() {
    $settings = serviceos_get_settings();
    $value = isset($settings['api_key']) ? esc_attr($settings['api_key']) : '';
    echo '<input type="password" name="' . SERVICEOS_OPTION_KEY . '[api_key]" value="' . $value . '" '
        . 'class="regular-text" placeholder="ff_prod_xxxxxxxxxxxx" '
        . 'style="min-width:400px;" />';
    echo '<p class="description">Publishable API key from Settings → Integrations → Website Form Integration in your ServiceOS dashboard.</p>';
}

function serviceos_tenant_id_render() {
    $settings = serviceos_get_settings();
    $value = isset($settings['tenant_id']) ? esc_attr($settings['tenant_id']) : '';
    echo '<input type="text" name="' . SERVICEOS_OPTION_KEY . '[tenant_id]" value="' . $value . '" '
        . 'class="regular-text" placeholder="cltxxxxxxxxxx" />';
    echo '<p class="description">Your Tenant ID (found in Settings → General). Optional if API key is tenant-scoped.</p>';
}

function serviceos_enabled_render() {
    $settings = serviceos_get_settings();
    $checked = !empty($settings['enabled']) ? 'checked' : '';
    echo '<label><input type="checkbox" name="' . SERVICEOS_OPTION_KEY . '[enabled]" value="1" ' . $checked . ' /> Inject the universal capture script on every frontend page</label>';
}

function serviceos_intercept_ajax_render() {
    $settings = serviceos_get_settings();
    $checked = !empty($settings['intercept_ajax']) ? 'checked' : '';
    echo '<label><input type="checkbox" name="' . SERVICEOS_OPTION_KEY . '[intercept_ajax]" value="1" ' . $checked . ' /> Also intercept AJAX form POSTs (fetch + XHR)</label>';
    echo '<p class="description">Optional. Enable for forms that submit via AJAX without a page reload (Contact Form 7 REST mode, Elementor, custom React forms). Disabled by default.</p>';
}

function serviceos_debug_mode_render() {
    $settings = serviceos_get_settings();
    $checked = !empty($settings['debug_mode']) ? 'checked' : '';
    echo '<label><input type="checkbox" name="' . SERVICEOS_OPTION_KEY . '[debug_mode]" value="1" ' . $checked . ' /> Log embed script load events</label>';
    echo '<p class="description">Check the ServiceOS Logs tab below to see debug output.</p>';
}

function serviceos_connection_section_callback() {
    echo '<p>Configure the connection to your ServiceOS CRM instance. Get these values from your ServiceOS dashboard under Settings → Integrations → Website Form Integration.</p>';
}

function serviceos_features_section_callback() {
    echo '<p>This plugin injects a single &lt;script&gt; tag into every frontend page. The script auto-detects all form submissions — no per-plugin configuration needed.</p>';
}

function serviceos_sanitize_settings($input) {
    $sanitized = array();

    $sanitized['api_url'] = esc_url_raw(trim(isset($input['api_url']) ? $input['api_url'] : ''));
    $sanitized['api_key'] = sanitize_text_field(trim(isset($input['api_key']) ? $input['api_key'] : ''));
    $sanitized['tenant_id'] = sanitize_text_field(trim(isset($input['tenant_id']) ? $input['tenant_id'] : ''));
    $sanitized['enabled'] = !empty($input['enabled']) ? true : false;
    $sanitized['intercept_ajax'] = !empty($input['intercept_ajax']) ? true : false;
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
            ServiceOS CRM — Universal Lead Capture
        </h1>

        <nav class="nav-tab-wrapper" style="margin-top:16px;">
            <a href="?page=serviceos-crm&tab=settings" class="nav-tab <?php echo $active_tab === 'settings' ? 'nav-tab-active' : ''; ?>">Settings</a>
            <a href="?page=serviceos-crm&tab=supported-forms" class="nav-tab <?php echo $active_tab === 'supported-forms' ? 'nav-tab-active' : ''; ?>">Supported Forms</a>
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
                        <span><strong>Connection Failed.</strong> Check your ServiceOS URL and API Key.</span>
                    </div>
                <?php endif; ?>
                <?php else: ?>
                    <div class="notice notice-warning inline" style="padding:12px 16px;">
                        <span>⚠ Configure your ServiceOS URL and API Key to start capturing leads.</span>
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

        <?php elseif ($active_tab === 'supported-forms'): ?>
            <!-- ─── Supported Forms ──────────────────────────────────────── -->
            <div style="margin-top:20px;">
                <h2>Supported Form Plugins</h2>
                <p>The universal capture script works with <strong>every</strong> form plugin listed below. No per-plugin configuration is required — the script listens to all <code>&lt;form&gt;</code> submit events on every page.</p>

                <table class="widefat striped" style="max-width:700px;">
                    <thead>
                        <tr>
                            <th>Form Plugin</th>
                            <th>Supported</th>
                            <th>Notes</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php
                        $supported = array(
                            array('Contact Form 7', 'Listens for native submit; enable AJAX interception if CF7 is in REST/AJAX mode.'),
                            array('WPForms', 'Native submit captured automatically. AJAX mode supported.'),
                            array('Gravity Forms', 'Native submit captured automatically. AJAX mode supported.'),
                            array('Ninja Forms', 'Native submit captured automatically. AJAX mode supported.'),
                            array('Fluent Forms', 'Native submit captured automatically. AJAX mode supported.'),
                            array('Elementor Forms', 'Enable AJAX interception — Elementor submits via fetch/XHR.'),
                            array('Formidable Forms', 'Native submit captured automatically.'),
                            array('MetForm', 'Enable AJAX interception — MetForm submits via XHR.'),
                            array('Everest Forms', 'Native submit captured automatically.'),
                            array('HTML Forms', 'Captured automatically — plain <form> elements.'),
                            array('Custom React / Vue / PHP Forms', 'Captured automatically. Use AJAX interception for SPA-style form POSTs.'),
                            array('JotForm (iframe)', 'Use ServiceOS Webhook integration in JotForm settings — iframe forms cannot be captured via JS due to cross-origin restrictions.'),
                        );
                        foreach ($supported as $row):
                        ?>
                        <tr>
                            <td><strong><?php echo esc_html($row[0]); ?></strong></td>
                            <td><span style="color:#22c55e;font-weight:600;">✓ Yes</span></td>
                            <td style="color:#64748b;font-size:12px;"><?php echo esc_html($row[1]); ?></td>
                        </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>

                <h3 style="margin-top:24px;">How it works</h3>
                <div style="background:#1e293b;color:#e2e8f0;padding:20px;border-radius:8px;font-family:monospace;font-size:13px;max-width:700px;">
WordPress page loads
        ↓
Plugin enqueues /embed.js (via wp_enqueue_script)
        ↓
window.SERVICEOS_CONFIG = { apiKey, apiUrl, interceptAjax }
        ↓
embed.js auto-detects ALL &lt;form&gt; submit events
        ↓
Fields mapped → POST /api/forms/leads (with X-API-Key header)
        ↓
Lead appears in ServiceOS CRM dashboard
                </div>

                <h3 style="margin-top:24px;">Field Mapping Reference</h3>
                <p>ServiceOS auto-maps these common form fields:</p>
                <table class="widefat striped" style="max-width:700px;">
                    <thead>
                        <tr>
                            <th>Lead Field</th>
                            <th>Recognized Form Field Names</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr><td><strong>Name</strong></td><td><code>name</code>, <code>your-name</code>, <code>full_name</code>, <code>contact_name</code></td></tr>
                        <tr><td><strong>Phone</strong></td><td><code>phone</code>, <code>your-phone</code>, <code>mobile</code>, <code>tel</code>, <code>whatsapp</code></td></tr>
                        <tr><td><strong>Email</strong></td><td><code>email</code>, <code>your-email</code>, <code>email_address</code></td></tr>
                        <tr><td><strong>Service</strong></td><td><code>service</code>, <code>subject</code>, <code>inquiry_type</code></td></tr>
                        <tr><td><strong>Message</strong></td><td><code>message</code>, <code>your-message</code>, <code>notes</code>, <code>comments</code></td></tr>
                        <tr><td><strong>Address</strong></td><td><code>address</code>, <code>your-address</code>, <code>location</code>, <code>city</code></td></tr>
                    </tbody>
                </table>
                <p style="margin-top:12px;"><em>At least Name or Phone is required. Unmapped fields are captured as additional notes.</em></p>
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
                    <p style="color:#94a3b8;">No logs yet. Submit a form to see activity here. (Lead delivery is handled by the embed script client-side; this log only tracks plugin-side events like script injection and connection tests.)</p>
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
                    <h3 style="margin-top:0;color:#166534;">Quick Setup (2 minutes)</h3>
                    <ol>
                        <li><strong>Get your API credentials</strong> — In ServiceOS, go to Settings → Integrations → Website Form Integration → Generate.</li>
                        <li><strong>Enter the credentials</strong> — On the Settings tab above, paste your ServiceOS URL (e.g. <code>https://app.yourcrm.com</code>) and API Key.</li>
                        <li><strong>Save Settings</strong> — The plugin will start loading <code>/embed.js</code> on every frontend page automatically.</li>
                        <li><strong>Test the connection</strong> — Click "Test Connection" to verify the API key.</li>
                        <li><strong>Submit a test form</strong> — Fill out any form on your site and verify the lead appears in ServiceOS.</li>
                    </ol>
                </div>

                <h3>Data Flow</h3>
                <div style="background:#1e293b;color:#e2e8f0;padding:20px;border-radius:8px;font-family:monospace;font-size:13px;">
WordPress page loads (frontend)
        ↓
Plugin enqueues /embed.js via wp_enqueue_script
        ↓
window.SERVICEOS_CONFIG = { apiKey: '...', apiUrl: '...' }
        ↓
embed.js attaches submit listeners to ALL &lt;form&gt; elements
        ↓
User submits any form → fields auto-mapped
        ↓
POST {apiUrl}/api/forms/leads  (header: X-API-Key)
        ↓
ServiceOS creates Lead + sends WhatsApp (if configured)
        ↓
Lead appears in CRM dashboard
                </div>

                <h3 style="margin-top:24px;">API Endpoint</h3>
                <p>The embed script POSTs to:</p>
                <div style="background:#f1f5f9;border:1px solid #e2e8f0;border-radius:8px;padding:16px;font-family:monospace;font-size:13px;">
                    <strong>POST</strong> {API_URL}/api/forms/leads<br>
                    <strong>Header:</strong> X-API-Key: {API_KEY}<br>
                    <strong>Body:</strong> JSON form data (auto-mapped)<br>
                    <strong>Response:</strong> { success: true, leadId: '...', leadName: '...' }
                </div>

                <h3 style="margin-top:24px;">JotForm Users</h3>
                <p>JotForm embeds forms in a cross-origin iframe, so the universal JS cannot capture submissions automatically. Instead:</p>
                <ol>
                    <li>In JotForm Form Builder → Settings → Integrations → Webhook → Add.</li>
                    <li>Use this webhook URL: <code><?php echo esc_html(trailingslashit($settings['api_url']) . 'api/forms/leads?key=' . $settings['api_key']); ?></code></li>
                    <li>Submit a test form — JotForm will POST the submission to ServiceOS directly.</li>
                </ol>

                <h3 style="margin-top:24px;">Troubleshooting</h3>
                <ul>
                    <li><strong>No leads appearing?</strong> — Open browser DevTools → Network tab. Look for a POST request to <code>/api/forms/leads</code> when you submit a form. Check the response.</li>
                    <li><strong>401 Unauthorized?</strong> — Verify your API Key is correct (copy it again from ServiceOS → Integrations → Website Form Integration).</li>
                    <li><strong>400 Validation error?</strong> — Ensure your form has at least a <code>name</code> or <code>phone</code> field. See the Field Mapping Reference on the Supported Forms tab.</li>
                    <li><strong>AJAX forms not captured?</strong> — Enable "AJAX Interception" on the Settings tab.</li>
                    <li><strong>JotForm submissions not arriving?</strong> — Use the webhook URL above (JotForm iframe forms cannot be captured via JS).</li>
                </ul>

                <h3 style="margin-top:24px;">Requirements</h3>
                <ul>
                    <li>WordPress 5.0 or higher</li>
                    <li>PHP 7.4 or higher</li>
                    <li>Any form plugin (or plain HTML forms) — the universal script works with all of them</li>
                    <li>ServiceOS account with Website Form Integration enabled</li>
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
    // Test the universal /api/forms/leads endpoint with ?key= query param.
    $api_url = trailingslashit($settings['api_url']) . 'api/forms/leads?key=' . rawurlencode($settings['api_key']);

    $response = wp_remote_get($api_url, array(
        'headers' => array(
            'Content-Type' => 'application/json',
        ),
        'timeout' => 15,
    ));

    if (is_wp_error($response)) {
        set_transient('serviceos_connection_test', 'fail', HOUR_IN_SECONDS);
        wp_send_json_error($response->get_error_message());
    }

    $code = wp_remote_retrieve_response_code($response);
    $body = json_decode(wp_remote_retrieve_body($response), true);

    if ($code === 200 && isset($body['status']) && $body['status'] === 'connected') {
        set_transient('serviceos_connection_test', 'ok', HOUR_IN_SECONDS);
        wp_send_json_success('Connection verified!');
    } else {
        set_transient('serviceos_connection_test', 'fail', HOUR_IN_SECONDS);
        $msg = isset($body['error']) ? $body['error'] : (isset($body['message']) ? $body['message'] : "HTTP $code");
        wp_send_json_error($msg);
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

// ════════════════════════════════════════════════════════════════════════════
// UNIVERSAL EMBED SCRIPT LOADER
// ════════════════════════════════════════════════════════════════════════════
//
// This plugin no longer hooks into individual form plugins (wpcf7_mail_sent,
// wpforms_process_complete, gform_after_submission, etc.). Instead, it injects
// a single universal JavaScript file (embed.js) on every frontend page. That
// script listens to ALL <form> submit events, maps fields, and POSTs to
// /api/forms/leads. This works with every form plugin automatically.
//
// JotForm is a special case — it embeds forms in a cross-origin iframe, so the
// JS cannot capture those submissions. JotForm users should use ServiceOS's
// webhook URL (?key= query param auth) directly in JotForm's webhook settings.

add_action('wp_enqueue_scripts', 'serviceos_enqueue_embed_script');

function serviceos_enqueue_embed_script() {
    $settings = serviceos_get_settings();

    // Skip in wp-admin and on AJAX endpoints
    if (is_admin() || wp_doing_ajax()) return;

    // Skip if disabled
    if (empty($settings['enabled'])) return;

    // Skip if not configured
    if (empty($settings['api_url']) || empty($settings['api_key'])) return;

    // Normalize the API URL: strip any trailing /api/forms/leads so we can
    // use it as a base for /embed.js. The embed.js will append the path itself.
    $api_base = rtrim($settings['api_url'], '/');
    // If user pasted the full endpoint URL, strip the /api/forms/leads suffix.
    if (substr($api_base, -16) === '/api/forms/leads') {
        $api_base = substr($api_base, 0, -16);
    }

    $embed_url = $api_base . '/embed.js';

    // Register + enqueue the script
    wp_register_script('serviceos-embed', $embed_url, array(), SERVICEOS_VERSION, true);
    wp_enqueue_script('serviceos-embed');

    // Pass config to the script via wp_localize_script. embed.js reads
    // window.SERVICEOS_CONFIG before init.
    $config = array(
        'apiKey'        => $settings['api_key'],
        'apiUrl'        => $api_base,
        'interceptAjax' => !empty($settings['intercept_ajax']),
        'showToast'     => false,
    );
    wp_localize_script('serviceos-embed', 'SERVICEOS_CONFIG', $config);

    if (!empty($settings['debug_mode'])) {
        serviceos_log('debug', 'Enqueued serviceos-embed script from: ' . $embed_url);
    }
}

// ─── Admin Bar Indicator ──────────────────────────────────────────────────────

add_action('admin_bar_menu', 'serviceos_admin_bar', 100);

function serviceos_admin_bar($wp_admin_bar) {
    if (is_admin()) return;
    $settings = serviceos_get_settings();
    if (empty($settings['enabled'])) return;

    $is_connected = get_transient('serviceos_connection_test') === 'ok';

    $wp_admin_bar->add_node(array(
        'id'     => 'serviceos-status',
        'title'  => $is_connected
            ? '<span style="color:#22c55e;">●</span> ServiceOS Capturing'
            : '<span style="color:#ef4444;">●</span> ServiceOS Not Connected',
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
