<?php
/**
 * Admin Settings & Dashboard management.
 *
 * @package BGOS_AI_Chatbot
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class BGOS_Admin {

    public function __construct() {
        add_action( 'admin_menu', array( $this, 'register_admin_menu' ) );
        add_action( 'admin_init', array( $this, 'register_settings' ) );
        add_action( 'admin_enqueue_scripts', array( $this, 'enqueue_admin_assets' ) );
        add_action( 'wp_ajax_bgos_test_connection', array( $this, 'ajax_test_connection' ) );
    }

    /**
     * Register top-level admin menu.
     */
    public function register_admin_menu() {
        add_menu_page(
            __( 'BGOS AI Chatbot', 'bgos-ai-chatbot' ),
            __( 'BGOS AI Chatbot', 'bgos-ai-chatbot' ),
            'manage_options',
            'bgos-ai-chatbot',
            array( $this, 'render_admin_page' ),
            'dashicons-format-chat',
            66
        );
    }

    /**
     * Enqueue styles and scripts on plugin admin page only.
     *
     * @param string $hook_suffix Current admin page.
     */
    public function enqueue_admin_assets( $hook_suffix ) {
        if ( 'toplevel_page_bgos-ai-chatbot' !== $hook_suffix ) {
            return;
        }

        wp_enqueue_style(
            'bgos-admin-style',
            BGOS_CHATBOT_PLUGIN_URL . 'assets/css/admin.css',
            array(),
            BGOS_CHATBOT_VERSION
        );

        wp_enqueue_script(
            'bgos-admin-script',
            BGOS_CHATBOT_PLUGIN_URL . 'assets/js/admin.js',
            array( 'jquery' ),
            BGOS_CHATBOT_VERSION,
            true
        );

        wp_localize_script(
            'bgos-admin-script',
            'bgosAdmin',
            array(
                'ajaxUrl'   => admin_url( 'admin-ajax.php' ),
                'nonce'     => wp_create_nonce( 'bgos_admin_nonce' ),
                'testing'   => __( 'Testing connection to BGOS Cloud...', 'bgos-ai-chatbot' ),
                'connected' => __( 'Connected successfully to BGOS AI Cloud!', 'bgos-ai-chatbot' ),
                'failed'    => __( 'Connection failed. Please check your Agent ID & Server URL.', 'bgos-ai-chatbot' ),
            )
        );
    }

    /**
     * Register plugin options using WordPress Settings API.
     */
    public function register_settings() {
        register_setting( 'bgos_settings_group', 'bgos_agent_id', array(
            'type'              => 'string',
            'sanitize_callback' => 'sanitize_text_field',
            'default'           => '',
        ) );

        register_setting( 'bgos_settings_group', 'bgos_server_url', array(
            'type'              => 'string',
            'sanitize_callback' => 'esc_url_raw',
            'default'           => 'https://fieseros.com',
        ) );

        register_setting( 'bgos_settings_group', 'bgos_api_key', array(
            'type'              => 'string',
            'sanitize_callback' => 'sanitize_text_field',
            'default'           => '',
        ) );

        register_setting( 'bgos_settings_group', 'bgos_enable_widget', array(
            'type'              => 'string',
            'sanitize_callback' => 'sanitize_text_field',
            'default'           => '1',
        ) );

        register_setting( 'bgos_settings_group', 'bgos_widget_position', array(
            'type'              => 'string',
            'sanitize_callback' => 'sanitize_text_field',
            'default'           => 'bottom-right',
        ) );

        register_setting( 'bgos_settings_group', 'bgos_brand_color', array(
            'type'              => 'string',
            'sanitize_callback' => 'sanitize_hex_color',
            'default'           => '#009F50',
        ) );

        register_setting( 'bgos_settings_group', 'bgos_greeting_message', array(
            'type'              => 'string',
            'sanitize_callback' => 'sanitize_text_field',
            'default'           => '👋 Have questions or want to book an appointment? Chat with us!',
        ) );

        register_setting( 'bgos_settings_group', 'bgos_excluded_pages', array(
            'type'              => 'string',
            'sanitize_callback' => 'sanitize_textarea_field',
            'default'           => '',
        ) );

        register_setting( 'bgos_settings_group', 'bgos_hide_for_admins', array(
            'type'              => 'string',
            'sanitize_callback' => 'sanitize_text_field',
            'default'           => '0',
        ) );
    }

    /**
     * AJAX handler to test connection with BGOS server.
     */
    public function ajax_test_connection() {
        check_ajax_referer( 'bgos_admin_nonce', 'nonce' );

        if ( ! current_user_can( 'manage_options' ) ) {
            wp_send_json_error( array( 'message' => __( 'Permission denied.', 'bgos-ai-chatbot' ) ) );
        }

        $server_url = isset( $_POST['server_url'] ) ? esc_url_raw( wp_unslash( $_POST['server_url'] ) ) : 'https://fieseros.com';
        $agent_id   = isset( $_POST['agent_id'] ) ? sanitize_text_field( wp_unslash( $_POST['agent_id'] ) ) : '';

        if ( empty( $agent_id ) ) {
            wp_send_json_error( array( 'message' => __( 'Please enter an Agent ID or Slug.', 'bgos-ai-chatbot' ) ) );
        }

        $embed_endpoint = rtrim( $server_url, '/' ) . '/api/public/agents/' . rawurlencode( $agent_id ) . '/embed.js';
        $response       = wp_remote_get( $embed_endpoint, array( 'timeout' => 10 ) );

        if ( is_wp_error( $response ) ) {
            wp_send_json_error( array( 'message' => $response->get_error_message() ) );
        }

        $status_code = wp_remote_retrieve_response_code( $response );
        if ( 200 === $status_code ) {
            wp_send_json_success( array(
                'message' => __( 'Connection verified! Your AI Agent is active and ready to assist visitors.', 'bgos-ai-chatbot' ),
                'status'  => $status_code,
            ) );
        } else {
            wp_send_json_error( array(
                'message' => sprintf(
                    /* translators: %d: HTTP status code */
                    __( 'Could not reach agent (HTTP %d). Please confirm your Agent ID in the BGOS Dashboard.', 'bgos-ai-chatbot' ),
                    $status_code
                ),
            ) );
        }
    }

    /**
     * Render the admin settings page.
     */
    public function render_admin_page() {
        if ( ! current_user_can( 'manage_options' ) ) {
            wp_die( esc_html__( 'You do not have permission to access this page.', 'bgos-ai-chatbot' ) );
        }

        $agent_id         = get_option( 'bgos_agent_id', '' );
        $server_url       = get_option( 'bgos_server_url', 'https://fieseros.com' );
        $api_key          = get_option( 'bgos_api_key', '' );
        $enable_widget    = get_option( 'bgos_enable_widget', '1' );
        $widget_position  = get_option( 'bgos_widget_position', 'bottom-right' );
        $brand_color      = get_option( 'bgos_brand_color', '#009F50' );
        $greeting_message = get_option( 'bgos_greeting_message', '👋 Have questions or want to book an appointment? Chat with us!' );
        $excluded_pages   = get_option( 'bgos_excluded_pages', '' );
        $hide_for_admins  = get_option( 'bgos_hide_for_admins', '0' );

        $is_configured    = ! empty( $agent_id );
        ?>
        <div class="wrap bgos-admin-wrap">
            <div class="bgos-header">
                <div class="bgos-header-left">
                    <div class="bgos-logo-badge">BGOS</div>
                    <div>
                        <h1><?php esc_html_e( 'BGOS AI Chatbot & Booking Assistant', 'bgos-ai-chatbot' ); ?></h1>
                        <p class="bgos-subtitle"><?php esc_html_e( '24/7 autonomous customer service, smart lead generation & appointment scheduling.', 'bgos-ai-chatbot' ); ?></p>
                    </div>
                </div>
                <div class="bgos-header-right">
                    <span class="bgos-status-pill <?php echo $is_configured ? 'bgos-status-connected' : 'bgos-status-disconnected'; ?>">
                        <span class="bgos-status-dot"></span>
                        <?php echo $is_configured ? esc_html__( 'Agent Configured', 'bgos-ai-chatbot' ) : esc_html__( 'Setup Required', 'bgos-ai-chatbot' ); ?>
                    </span>
                    <a href="https://fieseros.com" target="_blank" rel="noopener noreferrer" class="button button-secondary">
                        <?php esc_html_e( 'Open BGOS Dashboard ↗', 'bgos-ai-chatbot' ); ?>
                    </a>
                </div>
            </div>

            <!-- Tab Navigation -->
            <div class="nav-tab-wrapper bgos-nav-tabs">
                <a href="#tab-connection" class="nav-tab nav-tab-active" data-tab="tab-connection"><?php esc_html_e( '🔌 Connection', 'bgos-ai-chatbot' ); ?></a>
                <a href="#tab-widget" class="nav-tab" data-tab="tab-widget"><?php esc_html_e( '💬 Floating Chatbot', 'bgos-ai-chatbot' ); ?></a>
                <a href="#tab-sync" class="nav-tab" data-tab="tab-sync"><?php esc_html_e( '🧠 Knowledge Base Sync', 'bgos-ai-chatbot' ); ?></a>
                <a href="#tab-shortcode" class="nav-tab" data-tab="tab-shortcode"><?php esc_html_e( '📝 Shortcode & Builders', 'bgos-ai-chatbot' ); ?></a>
            </div>

            <form method="post" action="options.php" class="bgos-settings-form">
                <?php settings_fields( 'bgos_settings_group' ); ?>

                <!-- TAB 1: CONNECTION -->
                <div id="tab-connection" class="bgos-tab-content bgos-tab-active">
                    <div class="bgos-card">
                        <h2><?php esc_html_e( 'Cloud Agent Connection', 'bgos-ai-chatbot' ); ?></h2>
                        <p class="bgos-card-desc"><?php esc_html_e( 'Connect this WordPress website to your autonomous AI Agent running on BGOS Cloud.', 'bgos-ai-chatbot' ); ?></p>

                        <table class="form-table">
                            <tr>
                                <th scope="row"><label for="bgos_agent_id"><?php esc_html_e( 'Agent ID or Slug', 'bgos-ai-chatbot' ); ?> <span class="bgos-required">*</span></label></th>
                                <td>
                                    <input type="text" id="bgos_agent_id" name="bgos_agent_id" value="<?php echo esc_attr( $agent_id ); ?>" class="regular-text" placeholder="e.g. agt_98240 or my-business-bot" />
                                    <p class="description"><?php esc_html_e( 'Found in your BGOS Dashboard under AI Agents > Embed & Channels.', 'bgos-ai-chatbot' ); ?></p>
                                </td>
                            </tr>
                            <tr>
                                <th scope="row"><label for="bgos_server_url"><?php esc_html_e( 'BGOS Server URL', 'bgos-ai-chatbot' ); ?></label></th>
                                <td>
                                    <input type="url" id="bgos_server_url" name="bgos_server_url" value="<?php echo esc_attr( $server_url ); ?>" class="regular-text" />
                                    <p class="description"><?php esc_html_e( 'Default is https://fieseros.com. Change only if using a custom white-label domain or self-hosted instance.', 'bgos-ai-chatbot' ); ?></p>
                                </td>
                            </tr>
                            <tr>
                                <th scope="row"><label for="bgos_api_key"><?php esc_html_e( 'BGOS API Key (Optional)', 'bgos-ai-chatbot' ); ?></label></th>
                                <td>
                                    <input type="password" id="bgos_api_key" name="bgos_api_key" value="<?php echo esc_attr( $api_key ); ?>" class="regular-text" placeholder="bgos_live_..." />
                                    <p class="description"><?php esc_html_e( 'Optional authentication token for advanced rate-limits. Knowledge sync works out-of-the-box with your Agent ID.', 'bgos-ai-chatbot' ); ?></p>
                                </td>
                            </tr>
                        </table>

                        <div class="bgos-action-row">
                            <button type="button" id="bgos_btn_test_connection" class="button button-secondary">
                                <?php esc_html_e( '⚡ Test Connection', 'bgos-ai-chatbot' ); ?>
                            </button>
                            <span id="bgos_connection_result" class="bgos-result-msg"></span>
                        </div>
                    </div>
                </div>

                <!-- TAB 2: FLOATING CHATBOT -->
                <div id="tab-widget" class="bgos-tab-content">
                    <div class="bgos-card">
                        <h2><?php esc_html_e( 'Floating Widget Appearance & Display Rules', 'bgos-ai-chatbot' ); ?></h2>
                        <p class="bgos-card-desc"><?php esc_html_e( 'Customize how the floating chat bubble looks and behaves across your site.', 'bgos-ai-chatbot' ); ?></p>

                        <table class="form-table">
                            <tr>
                                <th scope="row"><?php esc_html_e( 'Enable Floating Widget', 'bgos-ai-chatbot' ); ?></th>
                                <td>
                                    <label>
                                        <input type="checkbox" name="bgos_enable_widget" value="1" <?php checked( '1', $enable_widget ); ?> />
                                        <?php esc_html_e( 'Display floating AI chat bubble on website pages', 'bgos-ai-chatbot' ); ?>
                                    </label>
                                </td>
                            </tr>
                            <tr>
                                <th scope="row"><label for="bgos_widget_position"><?php esc_html_e( 'Widget Position', 'bgos-ai-chatbot' ); ?></label></th>
                                <td>
                                    <select id="bgos_widget_position" name="bgos_widget_position">
                                        <option value="bottom-right" <?php selected( 'bottom-right', $widget_position ); ?>><?php esc_html_e( 'Bottom Right (Standard)', 'bgos-ai-chatbot' ); ?></option>
                                        <option value="bottom-left" <?php selected( 'bottom-left', $widget_position ); ?>><?php esc_html_e( 'Bottom Left', 'bgos-ai-chatbot' ); ?></option>
                                    </select>
                                </td>
                            </tr>
                            <tr>
                                <th scope="row"><label for="bgos_brand_color"><?php esc_html_e( 'Primary Brand Color', 'bgos-ai-chatbot' ); ?></label></th>
                                <td>
                                    <input type="color" id="bgos_brand_color" name="bgos_brand_color" value="<?php echo esc_attr( $brand_color ); ?>" style="vertical-align: middle; width: 44px; height: 36px; padding: 0; cursor: pointer;" />
                                    <span style="margin-left: 8px; font-family: monospace;"><?php echo esc_html( $brand_color ); ?></span>
                                    <p class="description"><?php esc_html_e( 'Used for the floating chat button and primary interactive accents.', 'bgos-ai-chatbot' ); ?></p>
                                </td>
                            </tr>
                            <tr>
                                <th scope="row"><label for="bgos_greeting_message"><?php esc_html_e( 'Greeting Bubble Text', 'bgos-ai-chatbot' ); ?></label></th>
                                <td>
                                    <input type="text" id="bgos_greeting_message" name="bgos_greeting_message" value="<?php echo esc_attr( $greeting_message ); ?>" class="large-text" />
                                    <p class="description"><?php esc_html_e( 'Proactive tooltip displayed next to the chat button to encourage visitors to chat.', 'bgos-ai-chatbot' ); ?></p>
                                </td>
                            </tr>
                            <tr>
                                <th scope="row"><label for="bgos_excluded_pages"><?php esc_html_e( 'Exclude on Specific Pages', 'bgos-ai-chatbot' ); ?></label></th>
                                <td>
                                    <textarea id="bgos_excluded_pages" name="bgos_excluded_pages" rows="3" class="large-text" placeholder="/cart, /checkout, 42"><?php echo esc_textarea( $excluded_pages ); ?></textarea>
                                    <p class="description"><?php esc_html_e( 'Comma-separated list of page URLs or Post IDs where the chat bubble should NOT appear (e.g. /cart, /checkout, 105).', 'bgos-ai-chatbot' ); ?></p>
                                </td>
                            </tr>
                            <tr>
                                <th scope="row"><?php esc_html_e( 'Hide for Administrators', 'bgos-ai-chatbot' ); ?></th>
                                <td>
                                    <label>
                                        <input type="checkbox" name="bgos_hide_for_admins" value="1" <?php checked( '1', $hide_for_admins ); ?> />
                                        <?php esc_html_e( 'Hide chat bubble when logged in as a site administrator', 'bgos-ai-chatbot' ); ?>
                                    </label>
                                    <p class="description"><?php esc_html_e( 'Prevents the chat widget from overlapping admin bars or page builders while editing.', 'bgos-ai-chatbot' ); ?></p>
                                </td>
                            </tr>
                        </table>
                    </div>
                </div>

                <!-- TAB 3: KNOWLEDGE BASE SYNC -->
                <div id="tab-sync" class="bgos-tab-content">
                    <div class="bgos-card">
                        <h2><?php esc_html_e( 'Train AI on Your Website Content', 'bgos-ai-chatbot' ); ?></h2>
                        <p class="bgos-card-desc"><?php esc_html_e( 'Automatically crawl your published WordPress pages, blog posts, and WooCommerce products to build your AI agent’s custom knowledge base.', 'bgos-ai-chatbot' ); ?></p>

                        <div class="bgos-sync-stats">
                            <?php
                            $published_pages    = wp_count_posts( 'page' )->publish ?? 0;
                            $published_posts    = wp_count_posts( 'post' )->publish ?? 0;
                            $published_products = post_type_exists( 'product' ) ? ( wp_count_posts( 'product' )->publish ?? 0 ) : 0;
                            $last_sync_time     = get_option( 'bgos_last_sync_timestamp', 0 );
                            $last_sync_count    = get_option( 'bgos_last_sync_count', 0 );
                            ?>
                            <div class="bgos-stat-chip">
                                <span class="bgos-stat-number"><?php echo esc_html( $published_pages ); ?></span>
                                <span class="bgos-stat-label"><?php esc_html_e( 'Published Pages', 'bgos-ai-chatbot' ); ?></span>
                            </div>
                            <div class="bgos-stat-chip">
                                <span class="bgos-stat-number"><?php echo esc_html( $published_posts ); ?></span>
                                <span class="bgos-stat-label"><?php esc_html_e( 'Blog Posts', 'bgos-ai-chatbot' ); ?></span>
                            </div>
                            <?php if ( post_type_exists( 'product' ) ) : ?>
                            <div class="bgos-stat-chip">
                                <span class="bgos-stat-number"><?php echo esc_html( $published_products ); ?></span>
                                <span class="bgos-stat-label"><?php esc_html_e( 'WooCommerce Products', 'bgos-ai-chatbot' ); ?></span>
                            </div>
                            <?php endif; ?>
                        </div>

                        <div class="bgos-sync-info-box">
                            <p>
                                <?php if ( $last_sync_time > 0 ) : ?>
                                    <strong><?php esc_html_e( 'Last Sync:', 'bgos-ai-chatbot' ); ?></strong>
                                    <?php echo esc_html( human_time_diff( $last_sync_time, current_time( 'timestamp' ) ) . ' ago' ); ?>
                                    (<?php echo esc_html( $last_sync_count ); ?> <?php esc_html_e( 'documents indexed', 'bgos-ai-chatbot' ); ?>)
                                <?php else : ?>
                                    <strong><?php esc_html_e( 'Status:', 'bgos-ai-chatbot' ); ?></strong>
                                    <?php esc_html_e( 'No content synced yet. Click the button below to train your bot.', 'bgos-ai-chatbot' ); ?>
                                <?php endif; ?>
                            </p>
                        </div>

                        <div class="bgos-action-row">
                            <button type="button" id="bgos_btn_sync_kb" class="button button-primary">
                                <?php esc_html_e( '🚀 Sync WordPress Content to BGOS AI', 'bgos-ai-chatbot' ); ?>
                            </button>
                            <span id="bgos_sync_result" class="bgos-result-msg"></span>
                        </div>
                    </div>
                </div>

                <!-- TAB 4: SHORTCODE & BUILDERS -->
                <div id="tab-shortcode" class="bgos-tab-content">
                    <div class="bgos-card">
                        <h2><?php esc_html_e( 'Embed Chatbot Anywhere with Shortcodes', 'bgos-ai-chatbot' ); ?></h2>
                        <p class="bgos-card-desc"><?php esc_html_e( 'Embed the chatbot or appointment booking assistant directly into your landing pages, contact pages, or blog posts.', 'bgos-ai-chatbot' ); ?></p>

                        <h3><?php esc_html_e( 'Standard Inline Embed', 'bgos-ai-chatbot' ); ?></h3>
                        <p><?php esc_html_e( 'Paste this shortcode into any WordPress post, page, or page builder widget (Elementor, Divi, Gutenberg, Beaver Builder):', 'bgos-ai-chatbot' ); ?></p>
                        <code class="bgos-code-block">[bgos_chat]</code>

                        <h3 style="margin-top: 24px;"><?php esc_html_e( 'Custom Height & Specific Agent Embed', 'bgos-ai-chatbot' ); ?></h3>
                        <p><?php esc_html_e( 'You can also specify custom container height and embed a specific agent:', 'bgos-ai-chatbot' ); ?></p>
                        <code class="bgos-code-block">[bgos_chat height="650px" agent="<?php echo esc_attr( $agent_id ?: 'your_agent_id' ); ?>"]</code>

                        <h3 style="margin-top: 24px;"><?php esc_html_e( 'Elementor & Page Builder Tips', 'bgos-ai-chatbot' ); ?></h3>
                        <p><?php esc_html_e( 'In Elementor, simply drag a Shortcode widget or HTML widget into your layout and paste [bgos_chat]. The widget is 100% responsive and scales gracefully on mobile phones and tablets.', 'bgos-ai-chatbot' ); ?></p>
                    </div>
                </div>

                <div class="bgos-submit-bar">
                    <?php submit_button( __( 'Save All Changes', 'bgos-ai-chatbot' ), 'primary', 'submit', false ); ?>
                </div>
            </form>
        </div>
        <?php
    }
}
